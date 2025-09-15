// src/pages/member/DashboardMember.jsx
import React, { useEffect, useState } from 'react';
import { db } from '../../Firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { FaCalendarAlt, FaUserCircle, FaClock, FaStar, FaHistory, FaRegClock, FaSignOutAlt, FaChevronRight } from 'react-icons/fa';
import { MdSpa, MdPerson } from 'react-icons/md';
import '../../../src/styles/SharedStyles.css';
import '../../../src/styles/DashboardStyles.css';
import { useNavigate } from 'react-router-dom';

function DashboardMember() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState(0);
  const [pointHistory, setPointHistory] = useState([]);
  const [userName, setUserName] = useState("");
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookingFilter, setBookingFilter] = useState('ongoing'); // ongoing, completed
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    if (!window.confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) return;
    try {
      const success = await logout();
      if (success) {
        navigate('/login');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // ฟังก์ชันดึงวันที่จองจาก booking (รองรับทุกรูปแบบการจัดเก็บวันที่)
  function getBookingDate(booking) {
    // ตรวจสอบจากทุกฟิลด์ที่อาจเก็บข้อมูลวันที่
    const possibleDateFields = ['bookingDate', 'date', 'serviceDate', 'appointmentDate'];
    
    for (const field of possibleDateFields) {
      if (booking[field]) {
        return booking[field];
      }
    }
    
    // หากไม่พบข้อมูลวันที่ในฟิลด์หลัก ให้ลองค้นหาฟิลด์ที่มีคำว่า date หรือ day
    for (const key in booking) {
      if (key.toLowerCase().includes('date') || key.toLowerCase().includes('day')) {
        if (booking[key]) {
          return booking[key];
        }
      }
    }
    
    return null;
  }
  
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // ดึงข้อมูล Services ทั้งหมด
        const servicesSnap = await getDocs(collection(db, 'Services'));
        const servicesData = servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setServices(servicesData);

        // ดึงข้อมูลการจอง
        const q = query(
          collection(db, 'Bookings'),
          where('userId', '==', user.uid)
        );
        const snap = await getDocs(q);

        // แปลงข้อมูลการจอง
        let bookingsData = snap.docs.map(doc => {
          const data = doc.data();
          const docId = doc.id;
          let createdAtDate = new Date();
          let bookingDate = null;
          try {
            if (data.createdAt && typeof data.createdAt.toDate === 'function') {
              createdAtDate = data.createdAt.toDate();
            } else if (data.createdAt instanceof Date) {
              createdAtDate = data.createdAt;
            } else if (data.createdAt) {
              createdAtDate = new Date(data.createdAt);
            }
          } catch (e) {}
          const dateField = getBookingDate(data);
          try {
            if (dateField && typeof dateField.toDate === 'function') {
              bookingDate = dateField.toDate();
            } else if (dateField instanceof Date) {
              bookingDate = dateField;
            } else if (dateField) {
              bookingDate = new Date(dateField);
            }
          } catch (e) {}
          return {
            id: docId,
            ...data,
            createdAt: createdAtDate,
            normalizedDate: bookingDate
          };
        });

        // ดึงข้อมูลรีวิวทั้งหมดของผู้ใช้
        const reviewsQuery = query(
          collection(db, 'Reviews'),
          where('userId', '==', user.uid)
        );
        const reviewsSnap = await getDocs(reviewsQuery);
        const reviewsData = reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Map ข้อมูลรีวิวเป็น flags เท่านั้น (เก็บรายละเอียดใน Reviews และดึงเมื่อต้องการ)
        bookingsData = bookingsData.map(booking => {
          const matchingReview = reviewsData.find(review => review.bookingId === booking.id);
          return {
            ...booking,
            // เก็บเฉพาะ flags ที่ต้องการแสดงในตาราง
            reviewed: !!matchingReview,
            canReview: !matchingReview && booking.status === 'เสร็จสิ้น',
            reviewId: matchingReview?.id || null
          };
        });

        setBookings(bookingsData);

        // ดึงข้อมูลผู้ใช้
        const userDoc = await getDocs(
          query(collection(db, 'Users'), where('__name__', '==', user.uid))
        );
        const userData = userDoc.docs[0]?.data();
        setUserName(userData?.displayName || userData?.fullName || user.email.split('@')[0]);

        // ดึง pointHistory ของผู้ใช้
        const phQuery = query(collection(db, 'PointHistory'), where('userId', '==', user.uid));
        const phSnap = await getDocs(phQuery);
        const phList = phSnap.docs.map(doc => doc.data());
        setPointHistory(phList);
        // รวมแต้มสะสมจริงจาก pointHistory (แต้มที่ได้รับ - แต้มที่ใช้)
        const totalPoints = phList.reduce((sum, h) => {
          if ((h.status === 'ACTIVE' || h.status === undefined) && (h.type === 'EARN' || h.type === 'add' || h.type === 'ADD')) {
            return sum + (Number(h.points || h.amount) || 0);
          }
          if ((h.status === 'USED' || h.status === 'INACTIVE') || (h.type === 'USE' || h.type === 'subtract' || h.type === 'SUBTRACT')) {
            return sum - (Number(h.points || h.amount) || 0);
          }
          return sum;
        }, 0);
        setPoints(totalPoints);

        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleCompleteBooking = async (bookingId) => {
    try {
      await updateDoc(doc(db, 'Bookings', bookingId), { status: 'เสร็จสิ้น' });
      setBookings(bookings =>
        bookings.map(b =>
          b.id === bookingId ? { ...b, status: 'เสร็จสิ้น' } : b
        )
      );
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ');
    }
  };

  return (
    <div className="d-flex vh-100 bg-light">
      {/* Add FontAwesome CDN */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" 
        integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" 
        crossOrigin="anonymous" referrerPolicy="no-referrer" />
      
      <style>
        {`
          .sidebar {
            width: ${sidebarCollapsed ? '80px' : '280px'};
            transition: width 0.3s ease;
            background: linear-gradient(135deg, #583015ff 0%, #331906ff 100%);
            border-right: 2px solid #FFBF78;
          }
          .sidebar-header {
            padding: 1.5rem;
            border-bottom: 1px solid rgba(255, 119, 48, 0.3);
            position: relative;
          }
          .sidebar-toggle-fab {
            position: fixed;
            left: 16px;
            bottom: 24px;
            z-index: 3000;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: #fff;
            color: #ff7730;
            border: 2px solid #ff7730;
            box-shadow: 0 2px 8px rgba(255,119,48,0.10);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.3rem;
            transition: background 0.2s, color 0.2s;
            outline: none;
            cursor: pointer;
          }
          .sidebar-toggle-fab:hover {
            background: #ff7730;
            color: #fff;
          }
          .sidebar-nav {
            padding: 1rem 0;
          }
          .sidebar-nav-item {
            display: flex;
            align-items: center;
            padding: 0.75rem 1.5rem;
            color: rgba(255,255,255,0.8);
            text-decoration: none;
            transition: all 0.3s ease;
            border: none;
            background: none;
            width: 100%;
            text-align: left;
            cursor: pointer;
          }
          .sidebar-nav-item:hover {
            background: linear-gradient(135deg, #ff7730 0%, #ff9900 100%);
            color: white;
            transform: translateX(5px);
          }
          .sidebar-nav-item.active {
            background: linear-gradient(135deg, #ff9900 0%, #ff7730 100%);
            color: white;
            border-left: 4px solid #ff7730;
            box-shadow: 0 2px 8px rgba(255, 119, 48, 0.3);
          }
          .sidebar-nav-item i {
            width: 20px;
            margin-right: 12px;
            font-size: 1.1rem;
          }
          .main-content {
            flex: 1;
            overflow-y: auto;
            padding: 1rem;
            background: linear-gradient(135deg, #f8f8f8 0%, #e8e8e8 100%);
          }
          .member-profile-header {
            margin-bottom: 2rem;
          }
          .profile-card {
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(44, 44, 44, 0.15);
            border: 2px solid #2c2c2c;
          }
          .profile-background {
            background: linear-gradient(135deg, #2c2c2c 0%, #653312ff 100%);
            padding: 2rem;
            position: relative;
          }
          .profile-background::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 100" fill="rgba(255,119,48,0.1)"><polygon points="1000,100 1000,0 0,100"/></svg>');
            background-size: cover;
          }
          .profile-content {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            gap: 2rem;
          }
          .profile-image-container {
            position: relative;
            flex-shrink: 0;
          }
          .profile-image {
            width: 100px;
            height: 100px;
            background: linear-gradient(135deg, #ff9900 0%, #ff7730 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5rem;
            color: white;
            border: 4px solid #ff7730;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 15px rgba(255, 119, 48, 0.3);
          }
          .profile-info {
            flex: 1;
            color: white;
          }
          .profile-name {
            font-size: 2rem;
            font-weight: 700;
            margin: 0 0 0.5rem 0;
            color: white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          }
          .profile-email {
            font-size: 1rem;
            margin: 0;
            color: rgba(255, 119, 48, 0.9);
            font-weight: 400;
          }
          .profile-stats {
            display: flex;
            gap: 2rem;
            margin-left: auto;
            flex-shrink: 0;
          }
          .stat-item {
            text-align: center;
            color: white;
          }
          .stat-number {
            font-size: 1.8rem;
            font-weight: 700;
            line-height: 1;
            margin-bottom: 0.25rem;
            color: #FFBF78;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
          }
          .stat-label {
            font-size: 0.85rem;
            color: rgba(255,255,255,0.9);
            font-weight: 500;
          }
          .content-card {
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 5px 25px rgba(44, 44, 44, 0.1);
            border: 1px solid #2c2c2c;
          }
          .booking-card {
            background: white;
            border-radius: 15px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            box-shadow: 0 3px 15px rgba(44,44,44,0.1);
            border: 2px solid #f0f0f0;
            transition: all 0.3s ease;
          }
          .booking-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(44,44,44,0.15);
            border-color: #ff7730;
          }
          .booking-header {
            display: flex;
            justify-content: between;
            align-items: center;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid #f0f0f0;
          }
          .status-booked { background: linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%); color: #ff7730; border: 2px solid #ff7730; }
          .status-completed { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; }
          .status-cancelled { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; }
          .status-default { background: linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%); color: white; }
          .booking-status {
            padding: 0.5rem 1rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
            margin-left: auto;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          @media (max-width: 768px) {
            .profile-content {
              flex-direction: column;
              text-align: center;
              gap: 1.5rem;
            }
            .profile-stats {
              margin-left: 0;
              justify-content: center;
            }
            .sidebar-toggle-fab {
              left: 8px;
              bottom: 8px;
              width: 38px;
              height: 38px;
              font-size: 1.1rem;
            }
          }
        `}
      </style>

      {/* Sidebar */}
      <div className="sidebar d-flex flex-column">
        <div className="sidebar-header">
          {!sidebarCollapsed && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 8 }}>
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ff9900 0%, #ff7730 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8,
                  boxShadow: '0 2px 8px rgba(255,119,48,0.10)'
                }}>
                  <i className="fas fa-user" style={{ fontSize: '2rem', color: '#fff' }}></i>
                </div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', marginBottom: 2 }}>{userName || 'สมาชิก'}</div>
                <div style={{ color: '#b7b7b7', fontSize: '0.95rem', marginBottom: 8 }}>ออนไลน์</div>
                <button
                  className="btn"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    color: '#fff',
                    border: '1.5px solid #fff',
                    borderRadius: 12,
                    fontWeight: 600,
                    fontSize: '1rem',
                    padding: '0.5rem 1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 2,
                    boxShadow: '0 2px 8px rgba(44,44,44,0.10)'
                  }}
                  onClick={() => navigate('/member/profile')}
                >
                  <i className="fas fa-user-cog me-2"></i>
                  ตั้งค่าโปรไฟล์
                </button>
              </div>
            </>
          )}
        </div>
        <nav className="sidebar-nav flex-grow-1">
          <button 
            className={`sidebar-nav-item ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
            title="การจองของฉัน"
          >
            <i className="fas fa-calendar-check"></i>
            {!sidebarCollapsed && <span>การจองของฉัน</span>}
          </button>
          <button 
            className={`sidebar-nav-item ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => setActiveTab('services')}
            title="จองบริการ"
          >
            <i className="fas fa-spa"></i>
            {!sidebarCollapsed && <span>จองบริการ</span>}
          </button>
          {/* ลบแท็บโปรไฟล์ออก */}
          <button 
            className={`sidebar-nav-item ${activeTab === 'rewards' ? 'active' : ''}`}
            onClick={() => setActiveTab('rewards')}
            title="แลกรางวัล"
          >
            <i className="fas fa-gift"></i>
            {!sidebarCollapsed && <span>แลกรางวัล</span>}
          </button>
          {/* เพิ่ม tab ประวัติแต้ม/รายการ */}
          <button 
            className={`sidebar-nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
            title="ประวัติแต้ม/รายการ"
          >
            <i className="fas fa-history"></i>
            {!sidebarCollapsed && <span>ประวัติแต้ม/รายการ</span>}
          </button>
          {/* ...existing nav items... */}
          <button 
            className="sidebar-nav-item mt-auto"
            onClick={handleLogout}
            title="ออกจากระบบ"
            style={{
              marginTop: 'auto',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: '1rem'
            }}
          >
            <i className="fas fa-sign-out-alt"></i>
            {!sidebarCollapsed && <span>ออกจากระบบ</span>}
          </button>
        </nav>
      </div>

      {/* Sidebar Collapse/Expand Floating Button (bottom left, outside sidebar) */}
      <button
        className="sidebar-toggle-fab"
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        title={sidebarCollapsed ? 'ขยายเมนู' : 'ยุบเมนู'}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <i className={`fas fa-${sidebarCollapsed ? 'chevron-right' : 'chevron-left'}`}></i>
      </button>

      {/* Main Content */}
      <div className="main-content" style={{ background: '#faf8f0ff' }}>
        {/* Member Profile Header */}
        <div className="member-profile-header">
          <div className="profile-card">
            <div className="profile-background">
              <div className="profile-content">
                <div className="profile-image-container">
                  <div className="profile-image">
                    {userName ? userName.charAt(0).toUpperCase() : <i className="fas fa-user"></i>}
                  </div>
                </div>
                
                <div className="profile-info">
                  <h2 className="profile-name">ยินดีต้อนรับ, {userName}</h2>
                  <p className="profile-email">สมาชิก ID: {user?.uid.substring(0, 8)}...</p>
                </div>
                
                <div className="profile-stats">
                  <div className="stat-item">
                    <div className="stat-number">{bookings.length}</div>
                    <div className="stat-label">การจองทั้งหมด</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number">{points}</div>
                    <div className="stat-label">แต้มสะสม</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'bookings' && (
          <div className="content-card">
            <div className="card-header bg-gradient text-white p-4" style={{ background: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)', borderBottom: '3px solid #ff7730' }}>
              <h4 className="mb-0" style={{ color: '#ff7730' }}>
                <i className="fas fa-calendar-check me-2"></i>
                การจองของฉัน
              </h4>
            </div>
            <div className="card-body p-4">
              {/* ปุ่มตัวกรอง */}
              <div className="d-flex justify-content-center mb-4">
                <div className="btn-group" role="group" style={{ boxShadow: '0 3px 10px rgba(0,0,0,0.1)' }}>
                  <button 
                    type="button" 
                    onClick={() => setBookingFilter('ongoing')} 
                    className={`btn ${bookingFilter === 'ongoing' ? 'btn-warning' : 'btn-outline-warning'}`}
                    style={{ 
                      backgroundColor: bookingFilter === 'ongoing' ? '#ff7730' : 'white',
                      color: bookingFilter === 'ongoing' ? 'white' : '#ff7730',
                      borderColor: '#ff7730',
                      fontWeight: '600',
                      minWidth: '160px'
                    }}
                  >
                    <i className="fas fa-clock me-2"></i>
                    กำลังดำเนินการ
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setBookingFilter('completed')} 
                    className={`btn ${bookingFilter === 'completed' ? 'btn-warning' : 'btn-outline-warning'}`}
                    style={{ 
                      backgroundColor: bookingFilter === 'completed' ? '#ff7730' : 'white',
                      color: bookingFilter === 'completed' ? 'white' : '#ff7730',
                      borderColor: '#ff7730',
                      fontWeight: '600',
                      minWidth: '160px'
                    }}
                  >
                    <i className="fas fa-check-circle me-2"></i>
                    เสร็จสิ้น
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-warning mb-3" role="status">
                    <span className="visually-hidden">กำลังโหลด...</span>
                  </div>
                  <p className="text-muted mb-0">กำลังโหลดข้อมูล...</p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-calendar-times mb-3" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
                  <h5>ยังไม่มีการจอง</h5>
                  <p className="text-muted">เมื่อคุณจองบริการ จะแสดงที่นี่</p>
                  <button 
                    className="btn"
                    style={{ 
                      background: 'linear-gradient(135deg, #ff9900 0%, #ff7730 100%)', 
                      color: 'white',
                      border: '2px solid #2c2c2c',
                      fontWeight: '600'
                    }}
                    onClick={() => setActiveTab('services')}
                  >
                    จองบริการเลย
                  </button>
                </div>
              ) : (
                <div>
                  {bookings
                    .filter(b => {
                      if (bookingFilter === 'ongoing') {
                        return b.status === 'จองแล้ว' || b.status === 'รอยืนยัน' || b.status === 'ยืนยันแล้ว' || b.status === 'กำลังให้บริการ';
                      } else if (bookingFilter === 'completed') {
                        return b.status === 'เสร็จสิ้น' || b.status === 'ยกเลิก';
                      }
                      return true;
                    })
                    .map(b => {
                      const statusClass = 
                        b.status === 'จองแล้ว' ? 'status-booked' :
                        b.status === 'เสร็จสิ้น' ? 'status-completed' :
                        b.status === 'ยกเลิก' ? 'status-cancelled' : 'status-default';
                      
                      return (
                        <div key={b.id} className="booking-card">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div>
                              <h6 className="mb-0">{
                                (() => {
                                  // ถ้ามี serviceId ให้ดึงชื่อจาก services
                                  if (b.serviceId && services.length > 0) {
                                    const foundService = services.find(s => s.id === b.serviceId);
                                    return foundService?.name || foundService?.serviceName || 'บริการ (รอดึงข้อมูล)';
                                  }
                                  // fallback เดิม
                                  return b.service || b.serviceName || (b.serviceId ? 'บริการ (รอดึงข้อมูล)' : 'ไม่ระบุ');
                                })()
                              }</h6>
                              <small className="text-muted">วันที่: {(() => {
                                try {
                                  const dateField = getBookingDate(b);
                                  if (dateField && typeof dateField.toDate === 'function') return new Date(dateField.toDate()).toLocaleDateString('th-TH');
                                  if (dateField instanceof Date) return dateField.toLocaleDateString('th-TH');
                                  if (dateField && typeof dateField === 'string') return new Date(dateField).toLocaleDateString('th-TH');
                                  return b.date || '-';
                                } catch { return b.date || '-'; }
                              })()}</small>
                            </div>

                            <div className="text-end">
                              <div>
                                <small className="me-3">ReviewId: <strong>{b.reviewId ? b.reviewId : '-'}</strong></small>
                                <small>CanReview: <strong>{b.canReview ? 'ใช่' : 'ไม่'}</strong></small>
                              </div>
                              <div className="mt-2">
                                {b.canReview && (
                                  <button className="btn btn-sm btn-warning me-2" onClick={() => navigate(`/member/review/${b.id}`)}>
                                    <i className="fas fa-star me-1"></i> ให้คะแนน
                                  </button>
                                )}
                                {b.reviewId && (
                                  <button className="btn btn-sm btn-outline-secondary" onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const { doc, getDoc } = await import('firebase/firestore');
                                      // ดึงข้อมูลรีวิวจาก Reviews ด้วย reviewsId
                                      const reviewRef = doc(db, 'Reviews', b.reviewId);
                                      const reviewDoc = await getDoc(reviewRef);
                                      if (reviewDoc.exists()) {
                                        const r = reviewDoc.data();
                                        // ดึงข้อมูลลูกค้าจาก users ด้วย userId
                                        let customerName = '-';
                                        let customerEmail = '-';
                                        try {
                                          const userRef = doc(db, 'artifacts/login-spa-7921d/users', r.userId);
                                          const userDoc = await getDoc(userRef);
                                          if (userDoc.exists()) {
                                            const userData = userDoc.data();
                                            customerName = userData.fullName || userData.displayName || userData.name || '-';
                                            customerEmail = userData.email || '-';
                                          }
                                        } catch {}
                                        alert(`รีวิว:\n\nคะแนน: ${r.rating || ''} ดาว\nความคิดเห็น: ${r.comment || '(ไม่มี)'}\nโดย: ${customerName}\nอีเมล: ${customerEmail}\nวันที่: ${r.createdAt ? (r.createdAt.seconds ? new Date(r.createdAt.seconds*1000).toLocaleString('th-TH') : new Date(r.createdAt).toLocaleString('th-TH')) : '-'}`);
                                      } else {
                                        alert('ไม่พบบันทึกรีวิวสำหรับการจองนี้');
                                      }
                                    } catch (err) {
                                      console.error('Error fetching review on demand:', err);
                                      alert('เกิดข้อผิดพลาดในการดึงข้อมูลรีวิว');
                                    }
                                  }}>
                                    ดูรีวิว
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                  })}
                  
                  {/* แสดงข้อความเมื่อไม่มีการจองตามหมวดที่เลือก */}
                  {bookings.length > 0 && bookings.filter(b => {
                    if (bookingFilter === 'ongoing') {
                      return b.status === 'จองแล้ว' || b.status === 'รอยืนยัน' || b.status === 'ยืนยันแล้ว' || b.status === 'กำลังให้บริการ';
                    } else if (bookingFilter === 'completed') {
                      return b.status === 'เสร็จสิ้น' || b.status === 'ยกเลิก';
                    }
                    return true;
                  }).length === 0 && (
                    <div className="text-center py-4">
                      <i className="fas fa-calendar-times mb-3" style={{ fontSize: '2.5rem', color: '#6c757d' }}></i>
                      <h5>ไม่มีการจอง{bookingFilter === 'ongoing' ? 'ที่กำลังดำเนินการ' : 'ที่เสร็จสิ้นแล้ว'}</h5>
                      <p className="text-muted">คุณยังไม่มีการจองในหมวดนี้</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="content-card">
            <div className="card-header bg-gradient text-white p-4" style={{ background: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)', borderBottom: '3px solid #ff7730' }}>
              <h4 className="mb-0" style={{ color: '#ff7730' }}>
                <i className="fas fa-spa me-2"></i>
                จองบริการ
              </h4>
            </div>
            <div className="card-body p-4">
              <div className="text-center py-5">
                <i className="fas fa-spa mb-3" style={{ fontSize: '3rem', color: '#ff9900' }}></i>
                <h5 style={{ color: '#2c2c2c' }}>บริการสปาของเรา</h5>
                <p className="text-muted mb-4">เลือกบริการที่คุณต้องการและจองเวลาที่สะดวก</p>
                <button 
                  className="btn"
                  style={{ 
                    background: 'linear-gradient(135deg, #ff9900 0%, #ff7730 100%)', 
                    color: 'white',
                    border: '2px solid #2c2c2c',
                    fontWeight: '600'
                  }}
                  onClick={() => navigate('/member/customer-services')}
                >
                  ดูบริการทั้งหมด
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ลบ content โปรไฟล์ออก */}

        {activeTab === 'rewards' && (
          <div className="content-card">
            <div className="card-header bg-gradient text-white p-4" style={{ background: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)', borderBottom: '3px solid #ff7730' }}>
              <h4 className="mb-0" style={{ color: '#ff7730' }}>
                <i className="fas fa-gift me-2"></i>
                แลกรางวัล
              </h4>
            </div>
            <div className="card-body p-4">
              <div className="text-center py-5">
                <i className="fas fa-gift mb-3" style={{ fontSize: '3rem', color: '#ff9900' }}></i>
                <h5 style={{ color: '#2c2c2c' }}>แลกรางวัลด้วยแต้มสะสม</h5>
                <p className="text-muted mb-4">คุณมีแต้มสะสม <span style={{ color: '#ff7730', fontWeight: '700' }}>{points}</span> คะแนน</p>
                <button 
                  className="btn"
                  style={{ 
                    background: 'linear-gradient(135deg, #ff9900 0%, #ff7730 100%)', 
                    color: 'white',
                    border: '2px solid #2c2c2c',
                    fontWeight: '600'
                  }}
                  onClick={() => navigate('/member/rewards')}
                >
                  ดูรางวัลทั้งหมด
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ส่วนแสดงประวัติแต้ม/รายการ */}
        {activeTab === 'history' && (
          <div className="content-card">
            <div className="card-header bg-gradient text-white p-4" style={{ background: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)', borderBottom: '3px solid #ff7730' }}>
              <h4 className="mb-0" style={{ color: '#ff7730' }}>
                <i className="fas fa-history me-2"></i>
                ประวัติแต้ม/รายการ
              </h4>
            </div>
            <div className="card-body p-4">
              {pointHistory.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="fas fa-history mb-3" style={{ fontSize: '2rem' }}></i>
                  <div>ยังไม่มีประวัติแต้ม</div>
                </div>
              ) : (
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>วันที่</th>
                      <th>รายการ</th>
                      <th>จำนวนแต้ม</th>
                      <th>เหตุผล</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pointHistory
                      .sort((a, b) => {
                        // ใช้ createdAt, timestamp, date ในการ sort
                        const getDate = (obj) => {
                          if (obj.createdAt && obj.createdAt.seconds) return new Date(obj.createdAt.seconds * 1000);
                          if (obj.timestamp && obj.timestamp.seconds) return new Date(obj.timestamp.seconds * 1000);
                          if (obj.date) return new Date(obj.date);
                          return new Date();
                        };
                        return getDate(b) - getDate(a);
                      })
                      .map((h, idx) => {
                        // ดึงวันที่
                        let dateObj = null;
                        if (h.createdAt && h.createdAt.seconds) dateObj = new Date(h.createdAt.seconds * 1000);
                        else if (h.timestamp && h.timestamp.seconds) dateObj = new Date(h.timestamp.seconds * 1000);
                        else if (h.date) dateObj = new Date(h.date);
                        else dateObj = null;

                        // ดึงจำนวนแต้ม
                        const points = h.points !== undefined ? h.points : h.amount !== undefined ? h.amount : 0;
                        // แสดง + หรือ -
                        const isEarn = h.type === 'EARN' || h.type === 'add' || h.type === 'ADD';
                        const isUse = h.type === 'USE' || h.type === 'subtract' || h.type === 'SUBTRACT';
                        const displayPoints = isEarn ? `+${points}` : isUse ? `-${points}` : points;
                        // สี
                        const color = isEarn ? '#28a745' : isUse ? '#dc3545' : '#333';

                        return (
                          <tr key={idx}>
                            <td>{dateObj ? dateObj.toLocaleString('th-TH') : '-'}</td>
                            <td>{isEarn ? 'เพิ่มแต้ม' : isUse ? 'ใช้แต้ม' : h.type}</td>
                            <td style={{ color, fontWeight: 600 }}>{displayPoints}</td>
                            <td>{h.reason || '-'}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardMember;