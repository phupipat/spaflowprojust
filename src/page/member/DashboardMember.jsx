// src/pages/member/DashboardMember.jsx
import React, { useEffect, useState } from 'react';
import { db } from '../../Firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
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
  const [reviews, setReviews] = useState({}); // เก็บข้อมูลรีวิวโดยใช้ bookingId เป็น key
  const [notification, setNotification] = useState({ show: false, title: '', message: '', type: 'info' });
  // สำหรับเก็บ bookings ก่อนหน้าเพื่อเปรียบเทียบการเปลี่ยนแปลงสถานะ
  const [prevBookings, setPrevBookings] = useState([]);
  // สถานะกำลังรีเฟรชข้อมูล
  const [refreshing, setRefreshing] = useState(false);

  // ฟังก์ชันสำหรับแสดงการแจ้งเตือนแบบ popup
  const showNotification = (title, message, type = 'info') => {
    setNotification({ show: true, title, message, type });
    // ซ่อนอัตโนมัติหลัง 10 วินาที
    setTimeout(() => {
      setNotification({ show: false, title: '', message: '', type: 'info' });
    }, 20000);
  };

  // ฟังก์ชันสำหรับซ่อน popup
  const hideNotification = () => {
    setNotification({ show: false, title: '', message: '', type: 'info' });
  };

  // ตัวช่วย: แปลงสถานะดิบเป็นสถานะที่ใช้แสดงผล
  const getDisplayStatus = (status) => {
    if (!status) return 'ไม่ระบุ';
    if (status === 'จองแล้ว' || status === 'รอยืนยัน' || status === 'รอชำระเงิน') return 'กำลังดำเนินการ';
    return status;
  };

  // ตัวช่วย: เลือกคลาสของ badge ตามสถานะดิบ
  const getStatusClass = (status) => {
    if (!status) return 'status-default';
    if (status === 'เสร็จสิ้น') return 'status-completed';
    if (status === 'ยกเลิก') return 'status-cancelled';
    if (status === 'ยืนยันแล้ว') return 'status-confirmed';
    if (status === 'กำลังให้บริการ' || status === 'จองแล้ว' || status === 'รอยืนยัน' || status === 'รอชำระเงิน') return 'status-inprogress';
    return 'status-default';
  };

  // ตัวช่วย: ตรวจสอบว่าเป็น ongoing (รวมกรณีที่ต้องแสดง 'กำลังดำเนินการ')
  const isOngoing = (status) => {
    if (!status) return false;
    return ['จองแล้ว', 'รอยืนยัน', 'รอชำระเงิน', 'ยืนยันแล้ว', 'กำลังให้บริการ'].includes(status);
  };

  // ฟังก์ชันสำหรับแสดงดาวจากคะแนน
  const renderStars = (rating) => {
    if (!rating) return null;
    
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    // ดาวเต็ม
    for (let i = 0; i < fullStars; i++) {
      stars.push(<i key={`full-${i}`} className="fas fa-star" style={{ color: '#ff7730' }}></i>);
    }
    
    // ดาวครึ่ง
    if (hasHalfStar) {
      stars.push(<i key="half" className="fas fa-star-half-alt" style={{ color: '#ff7730' }}></i>);
    }
    
    // ดาวว่าง
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<i key={`empty-${i}`} className="far fa-star" style={{ color: '#ff9900' }}></i>);
    }
    
    return <div className="stars-container">{stars}</div>;
  };

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
  

  // --- ดึงข้อมูลการจองและข้อมูลอื่น ๆ ---
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

      // เตรียม bookingsRaw
      const bookingDocs = snap.docs;
      let bookingsRaw = bookingDocs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 1. รวม id พนักงานที่เกี่ยวข้องทั้งหมด
      const empIdFields = ['employeeId', 'empolyeeId', 'therapistId', 'therapist'];
      const employeeIds = Array.from(new Set(
        bookingsRaw.map(b => {
          for (let f of empIdFields) {
            if (b[f]) return b[f];
          }
          return null;
        }).filter(Boolean)
      ));

      // 2. ดึงข้อมูล user เฉพาะที่ id ตรงกับ employeeIds
      let employeesMap = {};
      if (employeeIds.length > 0) {
        const usersCol = collection(db, '/artifacts/login-spa-7921d/users');
        const batchSize = 10;
        for (let i = 0; i < employeeIds.length; i += batchSize) {
          const batchIds = employeeIds.slice(i, i + batchSize);
          const qEmp = query(usersCol, where('__name__', 'in', batchIds));
          const empSnap = await getDocs(qEmp);
          empSnap.docs.forEach(doc => {
            const data = doc.data();
            if ((data.role && (data.role === 'employee' || data.role === 'staff')) || data.staff) {
              employeesMap[doc.id] = data;
            }
          });
        }
      }

      // 3. map bookingsData พร้อม employeeName
      let bookingsData = bookingDocs.map(doc => {
        const data = doc.data();
        const docId = doc.id;
        let createdAtDate = new Date();
        let bookingDate = null;
        let bookingDateIsDateOnly = false;
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
          } else if (dateField && typeof dateField === 'string') {
            const s = dateField.trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
              bookingDateIsDateOnly = true;
              bookingDate = new Date(s);
            } else {
              bookingDate = new Date(s);
            }
          }
        } catch (e) {}

        let displayTime = null;
        try {
          if (data.bookingTime && typeof data.bookingTime.toDate === 'function') {
            const dt = new Date(data.bookingTime.toDate());
            displayTime = dt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
          } else if (data.bookingTime instanceof Date) {
            displayTime = data.bookingTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
          } else if (data.appointmentTime) {
            displayTime = String(data.appointmentTime);
          } else if (data.time) {
            displayTime = String(data.time);
          } else if (data.timeSlot) {
            displayTime = String(data.timeSlot);
          } else if (bookingDate instanceof Date && !bookingDateIsDateOnly && !isNaN(bookingDate.getTime())) {
            if (!(bookingDate.getHours() === 0 && bookingDate.getMinutes() === 0 && bookingDate.getSeconds() === 0)) {
              displayTime = bookingDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            }
          }
        } catch (e) {
          displayTime = null;
        }

        // หา employeeName
        let empId = null;
        for (let f of empIdFields) {
          if (data[f]) { empId = data[f]; break; }
        }
        let employeeName = '';
        if (empId && employeesMap[empId]) {
          const emp = employeesMap[empId];
          employeeName = emp.name || emp.fullName || emp.fullname || emp.displayName || '-';
        } else {
          employeeName = data.employeeName || data.employeeFullName || data.employee || data.therapistName || data.therapist || 'ไม่ระบุ';
        }

        return {
          id: docId,
          ...data,
          createdAt: createdAtDate,
          normalizedDate: bookingDate,
          bookingDateIsDateOnly: bookingDateIsDateOnly,
          displayTime: displayTime,
          employeeName: employeeName
        };
      });

      // ดึงข้อมูลรีวิวทั้งหมดของผู้ใช้
      const reviewsQuery = query(
        collection(db, 'Reviews'),
        where('userId', '==', user.uid)
      );
      const reviewsSnap = await getDocs(reviewsQuery);
      const reviewsData = reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // เก็บข้อมูลรีวิวในรูปแบบที่เข้าถึงง่าย โดยใช้ bookingId เป็น key
      const reviewsById = {};
      reviewsData.forEach(review => {
        if (review.bookingId) {
          reviewsById[review.bookingId] = review;
        }
      });
      setReviews(reviewsById);

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

      // Debug: log a small sample to verify bookingTime -> displayTime mapping
      try {
        console.debug('Bookings displayTime check:', bookingsData.map(b => ({ id: b.id, bookingTime: b.bookingTime, displayTime: b.displayTime, normalizedDate: b.normalizedDate, appointmentTime: b.appointmentTime, time: b.time, timeSlot: b.timeSlot })));
      } catch (e) {
        // ignore
      }
      setBookings(bookingsData);

      // ดึงข้อมูลผู้ใช้
      const userDoc = await getDocs(
        query(collection(db, 'Users'), where('__name__', '==', user.uid))
      );
      const userData = userDoc.docs[0]?.data();
      setUserName(userData?.displayName || userData?.fullName || user.email.split('@')[0]);

      // ดึง PointHistory ของผู้ใช้
      const phQuery = query(collection(db, 'PointHistory'), where('userId', '==', user.uid));
      const phSnap = await getDocs(phQuery);
      const phList = phSnap.docs.map(doc => doc.data());
      setPointHistory(phList);
      // รวมแต้มสะสมจริงจาก PointHistory (แต้มที่ได้รับ - แต้มที่ใช้)
      const totalPoints = phList.reduce((sum, h) => {
        // ประเภท transaction ที่เป็นการเพิ่มแต้ม
        const isEarn = h.type === 'EARN' || h.type === 'earned' || h.type === 'add' || h.type === 'ADD' || h.type === 'REVIEW' || h.type === 'เพิ่มแต้ม';
        // ประเภท transaction ที่เป็นการใช้/แลกแต้ม
        const isUse = h.type === 'USE' || h.type === 'subtract' || h.type === 'SUBTRACT' || h.type === 'redeem' || h.type === 'แลกแต้ม';
        // ใช้ฟิลด์ `points` เท่านั้น สำหรับการคำนวณแต้มสะสม
        // หากไม่มี `points` ให้ถือว่าเป็น 0 (ไม่ควร fallback ไปใช้ `amount` ที่เป็นราคาทางการเงิน)
        const value = Number(h.points) || 0;
        if (isEarn) return sum + value;
        if (isUse) return sum - value;
        return sum;
      }, 0);
      setPoints(totalPoints);

      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchData();
  }, [user, fetchData]);

  // แจ้งเตือนเมื่อสถานะการจองเปลี่ยนเป็น "ยืนยันแล้ว" (อนุมัติ) หรือสามารถรีวิวได้ทันที
  useEffect(() => {
    if (!bookings || bookings.length === 0 || !prevBookings.length) return;
    // ตรวจสอบการเปลี่ยนแปลงสถานะการจอง (อนุมัติ)
    prevBookings.forEach(prev => {
      const curr = bookings.find(b => b.id === prev.id);
      if (curr && prev.status !== curr.status) {
        // กรณีเปลี่ยนเป็น "ยืนยันแล้ว"
        if (curr.status === 'ยืนยันแล้ว') {
          showNotification('จองสำเร็จ!', 'เจ้าของร้านได้อนุมัติการจองของคุณแล้ว กรุณาชำระเงินหรือเตรียมตัวเข้ารับบริการ', 'success');
        }
      }
    });
    // ตรวจสอบการเปลี่ยนแปลงสิทธิ์รีวิว (จาก canReview: false -> true)
    prevBookings.forEach(prev => {
      const curr = bookings.find(b => b.id === prev.id);
      if (curr && !prev.canReview && curr.canReview) {
        showNotification('รีวิวบริการ', 'คุณสามารถรีวิวบริการที่ได้รับแล้ว คลิกที่ปุ่ม "รีวิว" ในการ์ดการจอง', 'info');
      }
    });
    // อัปเดต prevBookings ทุกครั้งที่ bookings เปลี่ยน
    setPrevBookings(bookings.map(b => ({ id: b.id, status: b.status, canReview: b.canReview })));
  }, [bookings]);

  // ฟังก์ชันสำหรับรีเฟรชข้อมูลด้วยตัวเอง
  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData();
      showNotification('รีเฟรชข้อมูลสำเร็จ', 'ข้อมูลถูกอัปเดตเป็นเวอร์ชันล่าสุดแล้ว', 'success');
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการรีเฟรชข้อมูล:', error);
      showNotification('เกิดข้อผิดพลาด', 'ไม่สามารถรีเฟรชข้อมูลได้ กรุณาลองใหม่ภายหลัง', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  // --- รีเฟรชข้อมูลอัตโนมัติ ---
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchData();
  }, 15000); // 15 วินาที
    return () => clearInterval(interval);
  }, [user, fetchData]);

  // หมายเหตุ: ฟังก์ชันนี้ยังไม่ได้ใช้งาน แต่เก็บไว้เผื่อจะนำไปใช้ในอนาคต
  // พิจารณาลบออกหากไม่จำเป็น หรือปรับใช้ให้เหมาะสม
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
      
      {/* Sidebar Overlay for Mobile */}
      <div 
        className="sidebar-overlay" 
        onClick={() => setSidebarCollapsed(true)}
      ></div>
      
      <style>
        {`
          .custom-btn-primary {
            background: linear-gradient(135deg, #ff7730, #ff9900);
            border: 2px solid #2c2c2c;
            color: white;
            font-weight: 600;
            border-radius: 12px;
            padding: 0.5rem 1.2rem;
            transition: all 0.3s ease;
          }
          .custom-btn-primary:hover {
            background: linear-gradient(135deg, #2c2c2c, #ff7730);
            color: #ff7730;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(44, 44, 44, 0.3);
          }
          .custom-btn-outline {
            background: transparent;
            border: 2px solid #ff7730;
            color: #ff7730;
            font-weight: 600;
            border-radius: 12px;
            padding: 0.5rem 1.2rem;
            transition: all 0.3s ease;
          }
          .custom-btn-outline:hover {
            background: #ff7730;
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(255, 119, 48, 0.3);
          }
          .sidebar {
            width: ${sidebarCollapsed ? '80px' : '280px'};
            transition: width 0.3s ease, transform 0.3s ease;
            background: linear-gradient(135deg, #583015ff 0%, #331906ff 100%);
            border-right: 2px solid #ff7730;
            height: 100vh;
            position: sticky;
            top: 0;
            z-index: 1030;
          }

          @media (max-width: 768px) {
            .sidebar {
              position: fixed;
              top: 0;
              left: 0;
              height: 100%;
              transform: ${sidebarCollapsed ? 'translateX(-100%)' : 'translateX(0)'};
              box-shadow: ${sidebarCollapsed ? 'none' : '0 0 15px rgba(0,0,0,0.2)'};
              overflow-y: auto;
            }
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
            transition: margin-left 0.3s ease;
          }

          @media (max-width: 768px) {
            .main-content {
              margin-left: 0;
              width: 100%;
            }
          }

          .sidebar-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0,0,0,0.5);
            z-index: 1029;
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          @media (max-width: 768px) {
            .sidebar-overlay {
              display: ${sidebarCollapsed ? 'none' : 'block'};
              opacity: ${sidebarCollapsed ? 0 : 1};
            }
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
            border-radius: 12px;
            padding: 0;
            margin-bottom: 1rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            border: 1px solid #e8e8e8;
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
          }
          .booking-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          }
          .booking-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 1.25rem 0.75rem 1.25rem;
            margin-bottom: 0;
          }
          .avatar-circle {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #ff7730, #ff9900);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: 0.95rem;
            flex-shrink: 0;
          }
          .status-badge {
            padding: 4px 8px;
            border-radius: 16px;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .status-pending {
            background-color: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
          }
          .status-confirmed {
          background-color: #fff3cd;
          color: #7B4019;
          border: 2px solid #7B4019;
          font-weight: bold;
          }
          .status-inprogress {
            background-color: #cfe2ff;
            color: #084298;
            border: 1px solid #9ec5fe;
          }
          .status-completed {
            background-color: #d1e7dd;
            color: #0f5132;
            border: 1px solid #a3cfbb;
          }
          .service-name-container {
            padding: 0 1.25rem 0.5rem 1.25rem;
          }
          .service-icon {
            width: 24px;
            height: 24px;
            background: linear-gradient(135deg, #4ade80, #22c55e);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.75rem;
            margin-right: 8px;
            flex-shrink: 0;
          }
          .service-name {
            font-weight: 600;
            color: #1f2937;
            font-size: 0.9rem;
            line-height: 1.3;
          }
          .details-grid {
            padding: 0 1.25rem;
            display: grid;
            gap: 6px;
          }
          .detail-item {
            display: flex;
            align-items: center;
            padding: 6px 0;
            border-bottom: 1px solid #f8fafc;
          }
          .detail-item:last-child {
            border-bottom: none;
          }
          .detail-icon {
            width: 16px;
            height: 16px;
            margin-right: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .detail-icon i {
            font-size: 0.75rem;
            color: #6b7280;
          }
          .detail-item span {
            font-size: 0.8rem;
            color: #374151;
            font-weight: 500;
          }
          .card-actions {
            padding: 0.75rem 1.25rem 1rem 1.25rem;
            border-top: 1px solid #f1f5f9;
            display: flex;
            gap: 8px;
            margin-top: 0.5rem;
          }
          .action-btn {
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            text-decoration: none;
            color: inherit;
          }
          .primary-btn {
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            color: white;
            flex: 1;
          }
          .primary-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
            color: white;
          }
          .secondary-btn {
            background: #f8fafc;
            color: #64748b;
            border: 1px solid #e2e8f0;
            min-width: 80px;
          }
          .secondary-btn:hover {
            background: #f1f5f9;
            color: #475569;
          }
          .review-section {
            padding: 0 1.25rem 0.75rem 1.25rem;
          }
          .review-text {
            font-size: 0.75rem;
            color: #6b7280;
            line-height: 1.3;
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
          .stars-container {
            display: flex;
            gap: 2px;
            align-items: center;
          }
          .review-inline-container {
            background: linear-gradient(135deg, #fff8e1 0%, rgba(255, 248, 225, 0.5) 100%);
            border-radius: 8px;
            padding: 8px 12px;
            border-left: 3px solid #ff7730;
            box-shadow: 0 2px 6px rgba(255, 119, 48, 0.15);
          }
          .review-rating {
            color: #2c2c2c;
            font-weight: 600;
            font-size: 0.85rem;
          }
          .review-comment {
            color: #2c2c2c;
            font-size: 0.85rem;
            max-width: 350px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          @media (min-width: 768px) {
            .review-comment {
              max-width: 500px;
            }
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
          
          /* สไตล์สำหรับการแจ้งเตือน */
          .notification-popup {
            position: fixed;
            top: 30px;
            right: 30px;
            max-width: 350px;
            width: 100%;
            background: white;
            border-radius: 12px;
            box-shadow: 0 5px 25px rgba(0, 0, 0, 0.15);
            z-index: 9999;
            overflow: hidden;
            transform: translateX(150%);
            transition: transform 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55);
            border: 2px solid #2c2c2c;
          }
          .notification-popup.show {
            transform: translateX(0);
          }
          .notification-header {
            padding: 12px 15px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          }
          .notification-title {
            font-weight: 600;
            font-size: 1rem;
            color: #2c2c2c;
            margin: 0;
            display: flex;
            align-items: center;
          }
          .notification-title i {
            margin-right: 8px;
          }
          .notification-close {
            background: none;
            border: none;
            font-size: 1.1rem;
            cursor: pointer;
            color: #6c757d;
          }
          .notification-body {
            padding: 15px;
          }
          .notification-message {
            margin: 0;
            color: #495057;
            font-size: 0.9rem;
            line-height: 1.5;
          }
          .notification-info { border-left: 5px solid #17a2b8; }
          .notification-info .notification-title i { color: #17a2b8; }
          .notification-success { border-left: 5px solid #28a745; }
          .notification-success .notification-title i { color: #28a745; }
          .notification-warning { border-left: 5px solid #ffc107; }
          .notification-warning .notification-title i { color: #ffc107; }
          .notification-danger { border-left: 5px solid #dc3545; }
          .notification-danger .notification-title i { color: #dc3545; }
          .notification-spa { border-left: 5px solid #ff7730; }
          .notification-spa .notification-title i { color: #ff7730; }
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
                  <div className="stat-item">
                    <button 
                      className="btn btn-sm"
                      style={{ 
                        background: 'linear-gradient(135deg, #ff9900 0%, #ff7730 100%)', 
                        color: 'white',
                        border: '1px solid #2c2c2c',
                        fontWeight: '600',
                        borderRadius: '12px',
                        padding: '0.35rem 0.75rem'
                      }}
                      onClick={() => showNotification('การแจ้งเตือนใหม่', 'ยินดีต้อนรับกลับมา! วันนี้มีโปรโมชั่นพิเศษรอคุณอยู่', 'success')}
                    >
                      <i className="fas fa-bell me-1"></i> แจ้งเตือน
                    </button>
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
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0" style={{ color: '#ff7730' }}>
                  <i className="fas fa-calendar-check me-2"></i>
                  การจองของฉัน
                </h4>
                <button 
                  className="btn btn-sm" 
                  onClick={handleManualRefresh} 
                  disabled={refreshing}
                  style={{
                    backgroundColor: 'rgba(255, 119, 48, 0.1)',
                    color: '#ff7730',
                    border: '1px solid #ff7730',
                    borderRadius: '20px',
                    padding: '5px 15px',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="รีเฟรชข้อมูล"
                >
                  {refreshing ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span className="ms-1">กำลังรีเฟรช...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sync-alt"></i>
                      <span className="ms-1">รีเฟรชข้อมูล</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="card-body p-4">
              {/* ปุ่มตัวกรอง */}
              <div className="d-flex justify-content-center mb-4">
                <div className="btn-group" role="group" style={{ boxShadow: '0 3px 10px rgba(0,0,0,0.1)' }}>
                  <button 
                    type="button" 
                    onClick={() => setBookingFilter('ongoing')} 
                    className={`btn ${bookingFilter === 'ongoing' ? 'custom-btn-primary' : 'custom-btn-outline'}`}
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
                    className={`btn ${bookingFilter === 'completed' ? 'custom-btn-primary' : 'custom-btn-outline'}`}
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
                <div className="row">
                  {bookings
                    .filter(b => {
                      if (bookingFilter === 'ongoing') {
                        return isOngoing(b.status);
                      } else if (bookingFilter === 'completed') {
                        return b.status === 'เสร็จสิ้น' || b.status === 'ยกเลิก';
                      }
                      return true;
                    })
                    .map(b => {
                      // ใช้ helper สำหรับแปลงสถานะให้สอดคล้องกัน (รวม 'รอชำระเงิน' เป็น ongoing)
                      const originalStatus = b.status || '';
                      const displayStatus = getDisplayStatus(originalStatus);
                      const statusClass = getStatusClass(originalStatus);

                      // ใช้ฟิลด์ชื่อเต็ม `fullname` จาก booking เป็นลำดับแรก (ถ้ามี)
                      // หากไม่มี ให้ fallback ไปยัง `fullName` / `displayName` / `userName` / ชื่อที่ดึงจากผู้ใช้งานที่ล็อกอิน
                      const rawCustomerId = b.userId ?? b.customerId ?? b.customer ?? user?.uid ?? '';
                      const customerId = typeof rawCustomerId === 'string' ? rawCustomerId : (rawCustomerId && rawCustomerId.id) ? String(rawCustomerId.id) : '';

                      const customerName = b.fullname || b.fullName || b.displayName || b.userName || b.customerName || b.name || userName || (user && user.displayName) || (user && user.email ? user.email.split('@')[0] : 'สมาชิก');

                      // ดึงตัวอักษรตัวแรกจากชื่อเพื่อแสดงใน avatar อย่างปลอดภัย
                      const avatarInitial = (typeof customerName === 'string' && customerName.trim().length > 0) ? customerName.trim().charAt(0).toUpperCase() : 'ภ';

                      return (
                        <div key={b.id} className="col-lg-4 col-md-6 col-12 mb-3">
                          <div className="booking-card h-100">
                            {/* Header พร้อมสถานะ */}
                            <div className="booking-header">
                              <div className="d-flex align-items-center">
                                <div className="avatar-circle me-2">
                                  {avatarInitial}
                                </div>
                                <div>
                                  <h6 className="mb-0 text-dark fw-bold" style={{ fontSize: '0.85rem' }}>{customerName}</h6>
                                  <small className="text-muted" style={{ fontSize: '0.7rem' }}>ID: {customerId ? `${customerId.substring(0, 8)}...` : (user?.uid ? `${user.uid.substring(0,8)}...` : '-')}</small>
                                </div>
                              </div>
                              <div className="text-end">
                                <span className={`status-badge ${statusClass}`}>
                                  {displayStatus || 'ไม่ระบุ'}
                                </span>
                              </div>
                            </div>

                            {/* Service Name */}
                            <div className="service-name-container">
                              <div className="d-flex align-items-center mb-2">
                                <div className="service-icon">
                                  <i className="fas fa-spa"></i>
                                </div>
                                <span className="service-name">
                                  {(() => {
                                    if (b.serviceId && services.length > 0) {
                                      const foundService = services.find(s => s.id === b.serviceId);
                                      return foundService?.name || foundService?.serviceName || 'บริการ (รอดึงข้อมูล)';
                                    }
                                    return b.service || b.serviceName || (b.serviceId ? 'บริการ (รอดึงข้อมูล)' : 'ไม่ระบุ');
                                  })()}
                                </span>
                              </div>
                            </div>

                            {/* Details Grid - แสดงเฉพาะข้อมูลสำคัญ */}
                            <div className="details-grid">
                              {/* พนักงาน */}
                              <div className="detail-item">
                                <div className="detail-icon">
                                  <i className="fas fa-user-tie"></i>
                                </div>
                                <span>{b.employeeName || b.employeeFullName || b.employee || b.therapistName || b.therapist || 'ไม่ระบุ'}</span>
                              </div>

                              {/* วันที่ */}
                              <div className="detail-item">
                                <div className="detail-icon">
                                  <i className="fas fa-calendar-alt"></i>
                                </div>
                                <span>{(() => {
                                  try {
                                    const dateField = getBookingDate(b);
                                    if (dateField && typeof dateField.toDate === 'function') return new Date(dateField.toDate()).toLocaleDateString('th-TH');
                                    if (dateField instanceof Date) return dateField.toLocaleDateString('th-TH');
                                    if (dateField && typeof dateField === 'string') return new Date(dateField).toLocaleDateString('th-TH');
                                    return b.date || '-';
                                  } catch { return b.date || '-'; }
                                })()}</span>
                              </div>

                              {/* เวลา */}
                              <div className="detail-item">
                                <div className="detail-icon">
                                  <i className="fas fa-clock"></i>
                                </div>
                                <span>{
                                  (b.bookingTime && typeof b.bookingTime.toDate === 'function')
                                    ? new Date(b.bookingTime.toDate()).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                                    : (b.bookingTime instanceof Date
                                        ? b.bookingTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                                        : (typeof b.bookingTime === 'string' && b.bookingTime.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(b.bookingTime.trim())
                                            ? b.bookingTime.trim()
                                            : (b.displayTime || b.appointmentTime || b.time || b.timeSlot || '—')
                                          )
                                      )
                                }</span>
                              </div>

                              {/* ราคา */}
                              <div className="detail-item">
                                <div className="detail-icon">
                                  <i className="fas fa-money-bill-wave"></i>
                                </div>
                                <span>{Number(b.price || b.cost || b.amount || 1690).toLocaleString()} บาท</span>
                              </div>
                            </div>

                            {/* Actions */}
                            {b.canReview && (
                              <div className="card-actions">
                                <button 
                                  className="action-btn primary-btn" 
                                  onClick={() => navigate(`/member/review/${b.id}`)}
                                >
                                  <i className="fas fa-star me-1"></i>
                                  รีวิว
                                </button>
                              </div>
                            )}

                            {/* แสดงรีวิวถ้ามี */}
                            {b.reviewId && reviews[b.id] && (
                              <div className="review-section border-top">
                                <div className="d-flex align-items-center mb-1">
                                  <i className="fas fa-star me-1 text-warning" style={{ fontSize: '0.7rem' }}></i>
                                  <div className="d-flex align-items-center">
                                    {renderStars(reviews[b.id].rating)}
                                    <span className="ms-1 fw-medium" style={{ fontSize: '0.75rem' }}>{reviews[b.id].rating || 0} คะแนน</span>
                                  </div>
                                </div>
                                {reviews[b.id].comment && (
                                  <p className="review-text mb-0">
                                    <small className="text-muted fst-italic">
                                      "{reviews[b.id].comment.length > 60 ? reviews[b.id].comment.substring(0, 60) + '...' : reviews[b.id].comment}"
                                    </small>
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                      </div>
                      );
                  })}
                  
                  {/* แสดงข้อความเมื่อไม่มีการจองตามหมวดที่เลือก */}
                  {bookings.length > 0 && bookings.filter(b => {
                    if (bookingFilter === 'ongoing') {
                      return isOngoing(b.status);
                    } else if (bookingFilter === 'completed') {
                      return b.status === 'เสร็จสิ้น' || b.status === 'ยกเลิก';
                    }
                    return true;
                  }).length === 0 && (
                    <div className="col-12">
                      <div className="text-center py-4">
                        <i className="fas fa-calendar-times mb-3" style={{ fontSize: '2.5rem', color: '#6c757d' }}></i>
                        <h5>ไม่มีการจอง{bookingFilter === 'ongoing' ? 'ที่กำลังดำเนินการ' : 'ที่เสร็จสิ้นแล้ว'}</h5>
                        <p className="text-muted">คุณยังไม่มีการจองในหมวดนี้</p>
                      </div>
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
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0" style={{ color: '#ff7730' }}>
                  <i className="fas fa-spa me-2"></i>
                  จองบริการ
                </h4>
                <button 
                  className="btn btn-sm" 
                  onClick={handleManualRefresh} 
                  disabled={refreshing}
                  style={{
                    backgroundColor: 'rgba(255, 119, 48, 0.1)',
                    color: '#ff7730',
                    border: '1px solid #ff7730',
                    borderRadius: '20px',
                    padding: '5px 15px',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="รีเฟรชข้อมูล"
                >
                  {refreshing ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span className="ms-1">กำลังรีเฟรช...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sync-alt"></i>
                      <span className="ms-1">รีเฟรชข้อมูล</span>
                    </>
                  )}
                </button>
              </div>
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
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0" style={{ color: '#ff7730' }}>
                  <i className="fas fa-gift me-2"></i>
                  แลกรางวัล
                </h4>
                <button 
                  className="btn btn-sm" 
                  onClick={handleManualRefresh} 
                  disabled={refreshing}
                  style={{
                    backgroundColor: 'rgba(255, 119, 48, 0.1)',
                    color: '#ff7730',
                    border: '1px solid #ff7730',
                    borderRadius: '20px',
                    padding: '5px 15px',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="รีเฟรชข้อมูล"
                >
                  {refreshing ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span className="ms-1">กำลังรีเฟรช...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sync-alt"></i>
                      <span className="ms-1">รีเฟรชข้อมูล</span>
                    </>
                  )}
                </button>
              </div>
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
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0" style={{ color: '#ff7730' }}>
                  <i className="fas fa-history me-2"></i>
                  ประวัติแต้ม/รายการ
                </h4>
                <button 
                  className="btn btn-sm" 
                  onClick={handleManualRefresh} 
                  disabled={refreshing}
                  style={{
                    backgroundColor: 'rgba(255, 119, 48, 0.1)',
                    color: '#ff7730',
                    border: '1px solid #ff7730',
                    borderRadius: '20px',
                    padding: '5px 15px',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="รีเฟรชข้อมูล"
                >
                  {refreshing ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span className="ms-1">กำลังรีเฟรช...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sync-alt"></i>
                      <span className="ms-1">รีเฟรชข้อมูล</span>
                    </>
                  )}
                </button>
              </div>
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

                        // ดึงจำนวนแต้ม: ใช้ฟิลด์ `points` เท่านั้น (ไม่ fallback ไปใช้ `amount` ซึ่งเป็นมูลค่าทางการเงิน)
                        const points = Number(h.points) || 0;
                        // แสดง + หรือ -
                        const isEarn = h.type === 'EARN' || h.type === 'earned' || h.type === 'add' || h.type === 'ADD' || h.type === 'REVIEW';
                        const isUse = h.type === 'USE' || h.type === 'subtract' || h.type === 'SUBTRACT' || h.type === 'redeem';
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
        
        {/* ระบบการแจ้งเตือนแบบ Popup */}
        <div className={`notification-popup ${notification.show ? 'show' : ''} notification-${notification.type}`}>
          <div className="notification-header">
            <h6 className="notification-title">
              <i className={`fas ${notification.type === 'info' ? 'fa-info-circle' : notification.type === 'success' ? 'fa-check-circle' : notification.type === 'warning' ? 'fa-exclamation-triangle' : notification.type === 'danger' ? 'fa-exclamation-circle' : 'fa-bell'}`}></i>
              {notification.title}
            </h6>
            <button className="notification-close" onClick={hideNotification}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="notification-body">
            <p className="notification-message">{notification.message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardMember;