import React, { useState, useEffect } from 'react';
import { db } from '../../Firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../styles/SharedStyles.css';

function CustomerAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // สถานะการจอง
  const statusOptions = [
    { value: 'pending', label: 'รอยืนยัน', color: 'warning' },
    { value: 'confirmed', label: 'ยืนยันแล้ว', color: 'success' },
    { value: 'in_progress', label: 'กำลังให้บริการ', color: 'primary' },
    { value: 'completed', label: 'เสร็จสิ้น', color: 'info' },
    { value: 'cancelled', label: 'ยกเลิก', color: 'danger' },
  ];

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user) return;

      try {
        // Get employee details
        const userQuery = query(
          collection(db, 'artifacts/login-spa-7921d/users'),
          where('__name__', '==', user.uid)
        );
        const userSnapshot = await getDocs(userQuery);
        const userData = userSnapshot.docs[0]?.data();
        setUserName(userData?.fullname || userData?.name || 'พนักงาน');

        // Get appointments
        const q = query(
          collection(db, 'Bookings'),
          where('employeeId', '==', user.uid)
        );

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // ในกรณีที่ไม่มีข้อมูล ให้ใช้ข้อมูลจำลอง
        if (data.length === 0) {
          const dummyData = generateDummyAppointments();
          setAppointments(dummyData);
        } else {
          setAppointments(data);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching appointments:", error);
        // ใช้ข้อมูลจำลองในกรณีที่มีข้อผิดพลาด
        const dummyData = generateDummyAppointments();
        setAppointments(dummyData);
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [user]);

  // ฟังก์ชันสร้างข้อมูลจำลองสำหรับการจอง
  const generateDummyAppointments = () => {
    const today = new Date();
    const appointments = [];
    const services = [
      'นวดแผนไทย',
      'นวดน้ำมันอโรมา',
      'สปาเท้า',
      'นวดแผนไทยประคบสมุนไพร',
      'นวดหินร้อน',
      'ทรีทเมนท์ผิวหน้า',
      'ทรีทเมนท์ผิวกาย',
    ];
    
    const customerNames = [
      'คุณสมศรี มีสุข',
      'คุณสมชาย ใจดี',
      'คุณวิภา สดใส',
      'คุณมานะ ทองดี',
      'คุณสุดา รักดี',
      'คุณพิชัย ใจเย็น',
      'คุณเอมอร สุขศรี',
      'คุณธนา นาคำ',
    ];
    
    const notes = [
      'แพ้น้ำมันหอมระเหยบางชนิด',
      'ต้องการความกดนวดแบบเบา',
      'มีอาการปวดหลังบริเวณเอว',
      'มีอาการเมื่อยล้าบริเวณบ่าและไหล่',
      'แพ้น้ำหอม',
      'ต้องการความเป็นส่วนตัวสูง',
      'มีโรคประจำตัวเกี่ยวกับหัวใจ',
      'มาใช้บริการครั้งแรก',
    ];
    
    // สร้างข้อมูลการจองย้อนหลัง 7 วัน และล่วงหน้า 14 วัน
    for (let i = -7; i <= 14; i++) {
      const appointmentDate = new Date(today);
      appointmentDate.setDate(today.getDate() + i);
      
      // สุ่มจำนวนการจองต่อวัน (0-3 รายการ)
      const numAppointments = Math.floor(Math.random() * 4);
      
      for (let j = 0; j < numAppointments; j++) {
        const hour = Math.floor(Math.random() * 8) + 10; // 10:00 - 18:00
        const minute = Math.random() < 0.5 ? '00' : '30';
        const time = `${hour}:${minute}`;
        
        // สุ่มสถานะตามช่วงเวลา
        let status;
        if (i < 0) {
          // การจองในอดีตจะเป็น 'completed' หรือ 'cancelled'
          status = Math.random() < 0.9 ? 'completed' : 'cancelled';
        } else if (i === 0) {
          // การจองวันนี้จะเป็น 'confirmed', 'in_progress' หรือ 'completed'
          const random = Math.random();
          if (random < 0.3) status = 'confirmed';
          else if (random < 0.7) status = 'in_progress';
          else status = 'completed';
        } else {
          // การจองในอนาคตจะเป็น 'pending' หรือ 'confirmed'
          status = Math.random() < 0.3 ? 'pending' : 'confirmed';
        }
        
        const serviceIndex = Math.floor(Math.random() * services.length);
        const customerIndex = Math.floor(Math.random() * customerNames.length);
        const noteIndex = Math.floor(Math.random() * notes.length);
        
        appointments.push({
          id: `dummy-${appointmentDate.getTime()}-${j}`,
          date: appointmentDate.toISOString().split('T')[0],
          time: time,
          service: services[serviceIndex],
          customerName: customerNames[customerIndex],
          status: status,
          notes: Math.random() < 0.7 ? notes[noteIndex] : '',
          phone: `08${Math.floor(Math.random() * 10000000) + 10000000}`,
          duration: (serviceIndex % 3 + 1) * 30, // 30, 60, 90 นาที
          price: (serviceIndex + 1) * 300, // 300 - 2100 บาท
          paymentStatus: status === 'completed' ? 'paid' : 'pending',
          customerHistory: Math.random() < 0.5 ? 'ลูกค้าเก่า' : 'ลูกค้าใหม่',
        });
      }
    }
    
    // เรียงลำดับตามวันที่และเวลา
    return appointments.sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time}`);
      const dateB = new Date(`${b.date} ${b.time}`);
      return dateA - dateB;
    });
  };
  
  // ฟังก์ชันกรองข้อมูลการจอง
  const getFilteredAppointments = () => {
    return appointments.filter(appt => {
      // กรองตามสถานะ
      if (filterStatus !== 'all' && appt.status !== filterStatus) {
        return false;
      }
      
      // กรองตามวันที่
      if (filterDate && appt.date !== filterDate) {
        return false;
      }
      
      // ค้นหาตามข้อความ
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          appt.customerName?.toLowerCase().includes(query) ||
          appt.service?.toLowerCase().includes(query) ||
          appt.notes?.toLowerCase().includes(query) ||
          appt.phone?.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  };

  // แสดงการ์ดรายละเอียดการจอง
  const viewAppointmentDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };
  
  // อัปเดตสถานะการจอง
  const updateAppointmentStatus = async (id, newStatus) => {
    try {
      // ในกรณีที่เป็นข้อมูลจริงจาก Firebase
      if (!id.startsWith('dummy-')) {
        await updateDoc(doc(db, 'Bookings', id), {
          status: newStatus
        });
      }
      
      // อัปเดตสถานะในข้อมูลท้องถิ่น
      setAppointments(prevAppointments => 
        prevAppointments.map(appt => 
          appt.id === id ? { ...appt, status: newStatus } : appt
        )
      );
      
      // อัปเดตการ์ดที่เลือกหากมีการเปิดอยู่
      if (selectedAppointment && selectedAppointment.id === id) {
        setSelectedAppointment({ ...selectedAppointment, status: newStatus });
      }
      
      alert('อัปเดตสถานะเรียบร้อย');
    } catch (error) {
      console.error("Error updating appointment status:", error);
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    }
  };
  
  // รับสี Badge ตามสถานะ
  const getStatusBadge = (status) => {
    const statusObj = statusOptions.find(option => option.value === status);
    if (!statusObj) return <span className="badge bg-secondary">ไม่ระบุ</span>;
    return <span className={`badge bg-${statusObj.color}`}>{statusObj.label}</span>;
  };

  // รับรูปแบบของการ์ดตามสถานะ
  const getAppointmentCardClass = (status) => {
    switch(status) {
      case 'pending': return 'border-warning';
      case 'confirmed': return 'border-success';
      case 'in_progress': return 'border-primary';
      case 'completed': return 'border-info';
      case 'cancelled': return 'border-danger';
      default: return '';
    }
  };

  return (
    <div className="container-fluid animate-fade-in py-4">
      {/* Add FontAwesome CDN */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" 
        integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" 
        crossOrigin="anonymous" referrerPolicy="no-referrer" />
      
      <style>
        {`
          .appointment-card {
            border-left-width: 5px !important;
          }
          
          .filter-badge {
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          .filter-badge:hover {
            opacity: 0.8;
          }
          
          .modal-content {
            border: none;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          }
          
          .modal-header {
            border-bottom: 1px solid #f0f0f0;
            background: linear-gradient(to right, #ff9900, #ff7730);
            color: white;
            border-radius: 12px 12px 0 0;
          }
          
          .modal-footer {
            border-top: 1px solid #f0f0f0;
          }
          
          .status-history-item {
            padding: 10px 15px;
            border-left: 3px solid #ff9900;
            background: #f9f9f9;
            margin-bottom: 10px;
            border-radius: 0 5px 5px 0;
          }
          
          .status-btn {
            transition: all 0.2s ease;
          }
          
          .status-btn:hover {
            transform: translateY(-2px);
          }
          
          .customer-info-section {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 20px;
          }
          
          .service-info-section {
            background: #fff;
            border: 1px solid #eee;
            border-radius: 10px;
            padding: 15px;
          }
          
          .appointment-date {
            color: #ff9900;
            font-weight: bold;
          }
          
          .appointment-time {
            background: #f0f0f0;
            padding: 3px 8px;
            border-radius: 20px;
            font-size: 0.8rem;
          }
          
          .customer-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #ff9900;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
          }
          
          .appointment-notes {
            background: #fffbf0;
            border-left: 3px solid #ffc107;
            padding: 10px;
            font-style: italic;
            color: #6c757d;
          }
        `}
      </style>
      
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="mb-1">
                    <i className="fas fa-calendar-check me-2" style={{ color: '#ff9900' }}></i>
                    การจองของลูกค้า
                  </h2>
                  <p className="text-muted mb-0">
                    <i className="fas fa-user me-1"></i>
                    {userName} - จัดการข้อมูลการจองและลูกค้า
                  </p>
                </div>
                <div className="d-flex align-items-center">
                  <div className="me-3">
                    <div className="fs-5 fw-bold">{appointments.length}</div>
                    <div className="small text-muted">การจองทั้งหมด</div>
                  </div>
                  <button className="btn btn-primary">
                    <i className="fas fa-plus me-1"></i> เพิ่มการจองใหม่
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* ตัวกรองและค้นหา */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-5">
                  <div className="input-group">
                    <span className="input-group-text bg-white">
                      <i className="fas fa-search text-muted"></i>
                    </span>
                    <input 
                      type="text" 
                      className="form-control border-start-0" 
                      placeholder="ค้นหาชื่อลูกค้า บริการ หรือหมายเหตุ..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="col-md-3">
                  <div className="input-group">
                    <span className="input-group-text bg-white">
                      <i className="fas fa-calendar-day text-muted"></i>
                    </span>
                    <input 
                      type="date" 
                      className="form-control border-start-0" 
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="col-md-4">
                  <div className="d-flex flex-wrap gap-2">
                    <span 
                      className={`badge rounded-pill filter-badge ${filterStatus === 'all' ? 'bg-dark' : 'bg-secondary'}`}
                      onClick={() => setFilterStatus('all')}
                    >
                      ทั้งหมด
                    </span>
                    
                    {statusOptions.map(option => (
                      <span 
                        key={option.value}
                        className={`badge rounded-pill filter-badge ${filterStatus === option.value ? 'bg-' + option.color : 'bg-secondary bg-opacity-50'}`}
                        onClick={() => setFilterStatus(option.value)}
                      >
                        {option.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* รายการการจอง */}
      <div className="row">
        <div className="col-12">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-3" role="status">
                <span className="visually-hidden">กำลังโหลด...</span>
              </div>
              <p className="text-muted">กำลังโหลดข้อมูลการจอง...</p>
            </div>
          ) : getFilteredAppointments().length === 0 ? (
            <div className="text-center py-5 bg-light rounded">
              <i className="fas fa-calendar-times mb-3" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
              <h5>ไม่พบข้อมูลการจองตามเงื่อนไขที่กำหนด</h5>
              <p className="text-muted">ลองเปลี่ยนตัวกรองหรือคำค้นหาของคุณ</p>
              <button className="btn btn-outline-primary" onClick={() => {
                setFilterStatus('all');
                setFilterDate('');
                setSearchQuery('');
              }}>
                <i className="fas fa-sync-alt me-1"></i> ล้างตัวกรอง
              </button>
            </div>
          ) : (
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
              {getFilteredAppointments().map(appointment => (
                <div className="col" key={appointment.id}>
                  <div className={`card h-100 border-0 shadow-sm appointment-card border-start ${getAppointmentCardClass(appointment.status)}`}>
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <span className="appointment-date">
                            <i className="fas fa-calendar-day me-1"></i> 
                            {new Date(appointment.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                          </span>
                          <span className="ms-2 appointment-time">
                            <i className="fas fa-clock me-1"></i> {appointment.time}
                          </span>
                        </div>
                        {getStatusBadge(appointment.status)}
                      </div>
                      
                      <div className="d-flex align-items-center mb-3">
                        <div className="customer-avatar me-3">
                          {appointment.customerName?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <h6 className="mb-0 fw-bold">{appointment.customerName}</h6>
                          <small className="text-muted">
                            <i className="fas fa-phone-alt me-1"></i> {appointment.phone}
                          </small>
                        </div>
                      </div>
                      
                      <div className="mb-3 pb-3 border-bottom">
                        <div className="d-flex align-items-center">
                          <i className="fas fa-spa me-2 text-success"></i>
                          <div>
                            <div className="fw-bold">บริการ</div>
                            <div>{appointment.service}</div>
                          </div>
                        </div>
                      </div>
                      
                      {appointment.notes && (
                        <div className="mb-3 appointment-notes">
                          <small>{appointment.notes}</small>
                        </div>
                      )}
                    </div>
                    <div className="card-footer bg-transparent border-0 pt-0">
                      <div className="d-flex justify-content-between">
                        <button 
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => viewAppointmentDetails(appointment)}
                        >
                          <i className="fas fa-info-circle me-1"></i> รายละเอียด
                        </button>
                        
                        <div>
                          {appointment.status === 'pending' && (
                            <button 
                              className="btn btn-sm btn-success me-1"
                              onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                            >
                              <i className="fas fa-check me-1"></i> ยืนยัน
                            </button>
                          )}
                          
                          {appointment.status === 'confirmed' && (
                            <button 
                              className="btn btn-sm btn-primary"
                              onClick={() => updateAppointmentStatus(appointment.id, 'in_progress')}
                            >
                              <i className="fas fa-hourglass-start me-1"></i> เริ่มบริการ
                            </button>
                          )}
                          
                          {appointment.status === 'in_progress' && (
                            <button 
                              className="btn btn-sm btn-info text-white"
                              onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                            >
                              <i className="fas fa-check-circle me-1"></i> เสร็จสิ้น
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Modal รายละเอียดการจอง */}
      {isModalOpen && selectedAppointment && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0, 0, 0, 0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-calendar-check me-2"></i>
                  รายละเอียดการจอง
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setIsModalOpen(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6 mb-4 mb-md-0">
                    <h6 className="mb-3 border-bottom pb-2">
                      <i className="fas fa-user-circle me-2" style={{ color: '#ff9900' }}></i>
                      ข้อมูลลูกค้า
                    </h6>
                    
                    <div className="customer-info-section">
                      <div className="d-flex align-items-center mb-3">
                        <div className="customer-avatar me-3" style={{ width: '50px', height: '50px', fontSize: '1.2rem' }}>
                          {selectedAppointment.customerName?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <h5 className="mb-1">{selectedAppointment.customerName}</h5>
                          <p className="mb-0 text-muted small">
                            <i className="fas fa-user-clock me-1"></i> 
                            {selectedAppointment.customerHistory}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <div className="d-flex align-items-center mb-2">
                          <div className="text-muted" style={{ width: '100px' }}>เบอร์โทรศัพท์:</div>
                          <div>{selectedAppointment.phone}</div>
                        </div>
                        <div className="d-flex align-items-center">
                          <div className="text-muted" style={{ width: '100px' }}>การชำระเงิน:</div>
                          <div>
                            {selectedAppointment.paymentStatus === 'paid' 
                              ? <span className="badge bg-success">ชำระแล้ว</span>
                              : <span className="badge bg-warning text-dark">รอชำระ</span>
                            }
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <h6 className="mb-2">หมายเหตุ:</h6>
                        <p className="appointment-notes mb-0">
                          {selectedAppointment.notes || 'ไม่มีหมายเหตุ'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-md-6">
                    <h6 className="mb-3 border-bottom pb-2">
                      <i className="fas fa-spa me-2" style={{ color: '#ff9900' }}></i>
                      ข้อมูลการจอง
                    </h6>
                    
                    <div className="service-info-section">
                      <div className="mb-3 pb-2 border-bottom">
                        <div className="d-flex align-items-center mb-2">
                          <div className="text-muted" style={{ width: '100px' }}>บริการ:</div>
                          <div className="fw-bold">{selectedAppointment.service}</div>
                        </div>
                        <div className="d-flex align-items-center mb-2">
                          <div className="text-muted" style={{ width: '100px' }}>วันที่:</div>
                          <div>{new Date(selectedAppointment.date).toLocaleDateString('th-TH', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}</div>
                        </div>
                        <div className="d-flex align-items-center mb-2">
                          <div className="text-muted" style={{ width: '100px' }}>เวลา:</div>
                          <div>{selectedAppointment.time} น. ({selectedAppointment.duration} นาที)</div>
                        </div>
                        <div className="d-flex align-items-center">
                          <div className="text-muted" style={{ width: '100px' }}>ราคา:</div>
                          <div className="fw-bold">{selectedAppointment.price} บาท</div>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <h6 className="mb-2">สถานะปัจจุบัน:</h6>
                        <div className="mb-3">
                          {getStatusBadge(selectedAppointment.status)}
                        </div>
                        
                        <h6 className="mb-2">เปลี่ยนสถานะ:</h6>
                        <div className="d-flex flex-wrap gap-2">
                          {statusOptions.map(option => (
                            selectedAppointment.status !== option.value && (
                              <button 
                                key={option.value}
                                className={`btn btn-sm btn-${option.color} status-btn`}
                                onClick={() => {
                                  updateAppointmentStatus(selectedAppointment.id, option.value);
                                }}
                              >
                                <i className="fas fa-arrow-right me-1"></i>
                                {option.label}
                              </button>
                            )
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="row mt-4">
                  <div className="col-12">
                    <h6 className="mb-3 border-bottom pb-2">
                      <i className="fas fa-history me-2" style={{ color: '#ff9900' }}></i>
                      ประวัติการใช้บริการ
                    </h6>
                    
                    {/* ตัวอย่างประวัติการใช้บริการ */}
                    {selectedAppointment.customerHistory === 'ลูกค้าเก่า' ? (
                      <div>
                        <div className="status-history-item">
                          <div className="d-flex justify-content-between">
                            <div>
                              <p className="mb-1 fw-bold">นวดแผนไทย</p>
                              <p className="mb-0 small text-muted">ระยะเวลา: 60 นาที | พนักงาน: คุณสมหญิง</p>
                            </div>
                            <div>
                              <span className="badge bg-info">12 มิ.ย. 2023</span>
                            </div>
                          </div>
                        </div>
                        <div className="status-history-item">
                          <div className="d-flex justify-content-between">
                            <div>
                              <p className="mb-1 fw-bold">สปาเท้า</p>
                              <p className="mb-0 small text-muted">ระยะเวลา: 30 นาที | พนักงาน: คุณสมชาย</p>
                            </div>
                            <div>
                              <span className="badge bg-info">5 พ.ค. 2023</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted">ไม่มีประวัติการใช้บริการก่อนหน้านี้ (ลูกค้าใหม่)</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>ปิด</button>
                <button type="button" className="btn btn-primary">
                  <i className="fas fa-save me-1"></i> บันทึกข้อมูล
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerAppointments;
