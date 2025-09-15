// src/pages/employee/DashboardEmployee.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { db } from '../../Firebase'; 
import { collection, query, where, getDocs, doc, updateDoc, getDoc, orderBy, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../styles/SharedStyles.css';

function DashboardEmployee() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [activeTab, setActiveTab] = useState('appointments');
  const [scheduleView, setScheduleView] = useState('week'); // 'week' หรือ 'month'
  const [monthlySchedules, setMonthlySchedules] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [employeeData, setEmployeeData] = useState(null);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [appointmentFilter, setAppointmentFilter] = useState('all'); // 'all', 'ongoing', 'completed'
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => {
    // Update current time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

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
        console.log('=== FETCHING EMPLOYEE DATA ===');
        console.log('Current employee ID:', user.uid);
        
        // Get employee details
        const userQuery = query(
          collection(db, 'artifacts/login-spa-7921d/users'),
          where('__name__', '==', user.uid)
        );
        const userSnapshot = await getDocs(userQuery);
        const userData = userSnapshot.docs[0]?.data();
        setUserName(userData?.fullname || userData?.name || 'พนักงาน');
        console.log('Employee name:', userData?.fullname || userData?.name || 'พนักงาน');

        // Get staff details from Staffs collection
        const staffQuery = query(
          collection(db, 'Staffs'),
          where('userId', '==', user.uid)
        );
        const staffSnapshot = await getDocs(staffQuery);
        
        let staffData = null;
        if (!staffSnapshot.empty) {
          staffData = staffSnapshot.docs[0].data();
          setEmployeeData(staffData);
          console.log('Found staff data:', staffData);
          
          // Generate weekly and monthly schedules
          const staffSchedules = staffData.schedules || [];
          const weeklyData = generateWeeklySchedule(staffSchedules);
          setWeeklySchedule(weeklyData);
          
          const monthlyData = generateMonthlySchedule(staffSchedules);
          setMonthlySchedules(monthlyData);
        } else {
          console.log('No staff data found');
        }

        // Get appointments - ดึงการจองทั้งหมดที่เกี่ยวข้องกับพนักงานคนนี้ โดยไม่สนใจสถานะ
        console.log('Fetching bookings for employee:', user.uid);
        let bookingsQuery = query(
          collection(db, 'Bookings'),
          where('employeeId', '==', user.uid)
        );

        let approvedBookingsQuery = query(
          collection(db, 'Bookings'),
          where('status', '==', 'ยืนยันแล้ว')
        );
        
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const approvedBookingsSnapshot = await getDocs(approvedBookingsQuery);
        console.log(`Found ${bookingsSnapshot.size} direct bookings for employee`);
        console.log(`Found ${approvedBookingsSnapshot.size} approved bookings total`);
        
        // รวมข้อมูลการจองทั้งที่กำหนดให้พนักงานคนนี้แล้ว และที่มีสถานะ "ยืนยันแล้ว"
        const bookingsData = [];
        const processedIds = new Set(); // เก็บ ID ที่ได้ประมวลผลไปแล้ว เพื่อป้องกันข้อมูลซ้ำ
        
        // เพิ่มข้อมูลการจองที่กำหนดให้พนักงานคนนี้ก่อน
        for (const doc of bookingsSnapshot.docs) {
          const data = doc.data();
          const docId = doc.id;
          
          // จัดการกับข้อมูล timestamp อย่างปลอดภัย
          let createdAtDate = new Date();
          let bookingDate = null;
          
          // แปลงวันที่สร้างการจอง
          try {
            if (data.createdAt && typeof data.createdAt.toDate === 'function') {
              createdAtDate = data.createdAt.toDate();
            } else if (data.createdAt instanceof Date) {
              createdAtDate = data.createdAt;
            } else if (data.createdAt) {
              createdAtDate = new Date(data.createdAt);
            }
          } catch (e) {
            console.error('Error converting timestamp for createdAt:', e);
          }
          
          // แปลงวันที่การจอง
          const dateField = getBookingDate(data);
          try {
            if (dateField && typeof dateField.toDate === 'function') {
              bookingDate = dateField.toDate();
            } else if (dateField instanceof Date) {
              bookingDate = dateField;
            } else if (dateField) {
              bookingDate = new Date(dateField);
            }
          } catch (e) {
            console.error('Error converting booking date:', e);
          }
          
          // ดึงชื่อลูกค้าจาก users collection
          let customerName = data.customerName || 'ลูกค้า';
          if (data.userId) {
            try {
              const userDocRef = doc(db, 'artifacts/login-spa-7921d/users', data.userId);
              const userDoc = await getDoc(userDocRef);
              if (userDoc.exists()) {
                const userData = userDoc.data();
                customerName = userData.fullname || userData.name || userData.displayName || data.userEmail || 'ลูกค้า';
              }
            } catch (error) {
              console.log('Error fetching customer name:', error);
            }
          }
          
          bookingsData.push({ 
            id: docId, 
            ...data,
            customerName,
            createdAt: createdAtDate,
            normalizedDate: bookingDate
          });
          
          processedIds.add(docId); // เพิ่ม ID ที่ประมวลผลแล้ว
        }
        
        // เพิ่มข้อมูลการจองที่มีสถานะ "ยืนยันแล้ว" และยังไม่ได้กำหนดพนักงาน
        for (const doc of approvedBookingsSnapshot.docs) {
          const data = doc.data();
          const docId = doc.id;

          if (!processedIds.has(docId)) {
            // ดึงชื่อลูกค้าจาก users collection
            let customerName = data.customerName || 'ลูกค้า';
            if (data.userId) {
              try {
                const userDocRef = doc(db, 'artifacts/login-spa-7921d/users', data.userId);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  customerName = userData.fullname || userData.name || userData.displayName || data.userEmail || 'ลูกค้า';
                }
              } catch (error) {
                console.log('Error fetching customer name:', error);
              }
            }
            
            bookingsData.push({ id: docId, ...data, customerName });
            processedIds.add(docId);
          }
        }
        
        // Sort by date and time
        const sortedData = bookingsData.sort((a, b) => {
          const dateA = new Date(`${a.date} ${a.time}`);
          const dateB = new Date(`${b.date} ${b.time}`);
          return dateA - dateB;
        });
        
        setAppointments(sortedData);
        
        // Filter today's appointments
        const today = new Date().toISOString().split('T')[0];
        const todaysAppts = sortedData.filter(appt => appt.date === today);
        setTodayAppointments(todaysAppts);

        // Calculate total unique customers
        const uniqueCustomers = new Set(bookingsData.map(appt => appt.userEmail || appt.memberId)).size;
        setTotalCustomers(uniqueCustomers);

        // Get reviews for this employee
        // ดึงรีวิวที่ employeeId ตรงกับ user.uid (ซึ่งตอนนี้ employeeId จะเป็น uid ของพนักงานเสมอ)
        const reviewsQuery = query(
          collection(db, 'Reviews'),
          where('employeeId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const reviewsSnapshot = await getDocs(reviewsQuery);
        const reviewData = reviewsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            customerName: data.customerName || data.userEmail || 'ลูกค้า',
            rating: data.rating || 5,
            comment: data.comment || data.review || '',
            service: data.service || 'บริการสปา',
            date: data.createdAt?.toDate
              ? data.createdAt.toDate().toLocaleDateString('th-TH')
              : (data.date || ''),
            userEmail: data.userEmail || '',
            bookingId: data.bookingId || '',
          };
        });
        setReviews(reviewData);

        // คำนวณคะแนนเฉลี่ย
        if (reviewData.length > 0) {
          const totalRating = reviewData.reduce((sum, review) => sum + review.rating, 0);
          const avgRating = (totalRating / reviewData.length).toFixed(1);
          setAverageRating(avgRating);
        } else {
          setAverageRating('0.0');
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentWeekStart, currentMonth, currentYear]);

  // Generate weekly schedule function
  const generateWeeklySchedule = useCallback((staffSchedules) => {
    const weekData = [];
    const days = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
    
    // Get Monday of current week
    const monday = new Date(currentWeekStart);
    monday.setDate(monday.getDate() - monday.getDay() + 1);
    
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(monday);
      currentDate.setDate(monday.getDate() + i);
      
      const dayName = days[currentDate.getDay()];
      const dateString = currentDate.toISOString().split('T')[0];
      
      // Find schedules for this day
      const daySchedules = staffSchedules.filter(schedule => schedule.day === dayName);
      
      weekData.push({
        date: dateString,
        dayName: dayName,
        schedules: daySchedules,
        dayNumber: currentDate.getDate(),
        isToday: dateString === new Date().toISOString().split('T')[0]
      });
    }
    
    return weekData;
  }, [currentWeekStart]);

  // Generate monthly schedule function
  const generateMonthlySchedule = useCallback((staffSchedules) => {
    const days = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
    const schedules = [];
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(currentYear, currentMonth, day);
      const dayOfWeek = currentDate.getDay();
      const thaiDayName = days[dayOfWeek];
      
      const todaySchedules = staffSchedules.filter(schedule => 
        schedule.day === thaiDayName
      );

      if (todaySchedules.length > 0) {
        const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        schedules.push({
          date: dateString,
          day: day,
          schedules: todaySchedules,
          dayName: thaiDayName,
          isToday: dateString === new Date().toISOString().split('T')[0]
        });
      }
    }
    
    return schedules;
  }, [currentMonth, currentYear]);

  // Fetch employee reviews
  const fetchEmployeeReviews = useCallback(async (bookingsData = appointments) => {
    try {
      // Get reviews from completed appointments
      const completedAppointments = bookingsData.filter(appt => 
        appt.status === 'เสร็จสิ้น' && (appt.rating || appt.review)
      );
      
      // หากมีการให้คะแนนหรือรีวิวในการจอง ให้ดึงข้อมูลมาแสดง
      const reviewData = completedAppointments.map(appt => ({
        id: appt.id,
        customerName: appt.customerName || 'ลูกค้า',
        rating: appt.rating || 5,
        comment: appt.review || 'บริการดีมาก',
        service: appt.service || 'บริการสปา',
        date: appt.date || new Date().toISOString().split('T')[0],
        userEmail: appt.userEmail || ''
      }));
      
      // ไม่ใช้ข้อมูลปลอมอีกต่อไป ใช้ข้อมูลจริงเท่านั้น
      setReviews(reviewData);
      
      // Calculate average rating from real data
      if (reviewData.length > 0) {
        const totalRating = reviewData.reduce((sum, review) => sum + review.rating, 0);
        const avgRating = (totalRating / reviewData.length).toFixed(1);
        setAverageRating(avgRating);
      } else {
        // ถ้าไม่มีรีวิว ให้เป็น 0
        setAverageRating('0.0');
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
      // กรณีเกิดข้อผิดพลาด ให้กำหนดเป็นอาร์เรย์ว่าง
      setReviews([]);
      setAverageRating('0.0');
    }
  }, [appointments]);

  // Change week function
  const changeWeek = (direction) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentWeekStart(newDate);
  };

  // Change month function
  const changeMonth = (delta) => {
    let newMonth = currentMonth + delta;
    let newYear = currentYear;
    
    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }
    
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  // Generate calendar for monthly view
  const generateCalendar = () => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const calendar = [];
    
    let day = 0;
    let week = [];
    
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      week.push(<td key={`empty-${i}`} className="calendar-day"></td>);
      day++;
    }
    
    // Days in month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const hasSchedule = monthlySchedules.some(s => s.date === date);
      const isToday = date === new Date().toISOString().split('T')[0];
      const dayAppointments = appointments.filter(appt => appt.date === date);
      
      week.push(
        <td key={i} className={`calendar-day ${hasSchedule ? 'has-schedule' : ''} ${isToday ? 'today' : ''}`}>
          <div className="date-number">{i}</div>
          
          <div className="appointment-list">
            {dayAppointments.slice(0, 3).map((appt, idx) => (
              <div 
                key={idx} 
                className="appointment-item"
                title={`${appt.time || 'เวลาไม่ระบุ'} - ${appt.customerName || 'ลูกค้า'}: ${appt.service || 'บริการ'}`}
              >
                <i className="fas fa-clock me-1" style={{ fontSize: '0.7rem' }}></i>
                {appt.time || '00:00'} {appt.service ? appt.service.substring(0, 10) + (appt.service.length > 10 ? '...' : '') : 'บริการ'}
              </div>
            ))}
            
            {dayAppointments.length > 3 && (
              <div className="appointment-item" style={{ background: '#28a745' }}>
                <i className="fas fa-plus me-1"></i>
                อีก {dayAppointments.length - 3} รายการ
              </div>
            )}
          </div>
          
          {dayAppointments.length > 0 && (
            <div className="appointment-count">
              {dayAppointments.length}
            </div>
          )}
        </td>
      );
      
      day++;
      
      if (day % 7 === 0 || i === daysInMonth) {
        // Fill remaining cells
        while (day % 7 !== 0) {
          week.push(<td key={`empty-end-${day}`} className="calendar-day"></td>);
          day++;
        }
        
        calendar.push(<tr key={`week-${calendar.length}`}>{week}</tr>);
        week = [];
      }
    }
    
    return calendar;
  };

  // ฟังก์ชันสร้าง badge แสดงสถานะการจอง
  const getStatusBadge = (status) => {
    switch(status) {
      case 'ยืนยันแล้ว':
      case 'confirmed':
        return <span className="badge bg-success">ยืนยันแล้ว</span>;
      
      case 'รอยืนยัน':
      case 'รอชำระเงิน':
      case 'pending':
        return <span className="badge bg-warning text-dark">รอยืนยัน</span>;
      
      case 'เสร็จสิ้น':
      case 'completed':
        return <span className="badge bg-info">เสร็จสิ้น</span>;
      
      case 'ยกเลิก':
      case 'ปฏิเสธ':
      case 'cancelled':
        return <span className="badge bg-danger">ยกเลิก</span>;
      
      default:
        return <span className="badge bg-secondary">{status || 'ไม่ระบุ'}</span>;
    }
  };

  // ฟังก์ชันสำหรับอัปเดตสถานะการจอง
  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    try {
      const currentBooking = appointments.find(appt => appt.id === bookingId);
      if (!currentBooking) {
        alert('ไม่พบข้อมูลการจอง');
        return;
      }

      let updateData = { status: newStatus }; // อัพเดทสถานะเสมอ
      
      if (newStatus === 'เสร็จสิ้น') {
        // เพิ่มข้อมูลเมื่อจบบริการ
        updateData = {
          ...updateData,
          completedAt: new Date(),
          canReview: true, // เปิดให้ลูกค้ารีวิว
          reviewAvailable: true // เพิ่มฟิลด์นี้เพื่อให้แน่ใจ
        };
        
        console.log('Setting completed status with data:', updateData);
      }

      const bookingRef = doc(db, 'Bookings', bookingId);
      await updateDoc(bookingRef, updateData);
      
      // บันทึก log เพื่อตรวจสอบ
      console.log(`Updated booking ${bookingId} with status: ${newStatus}`, updateData);

      setAppointments(appts => 
        appts.map(appt => 
          appt.id === bookingId ? { ...appt, ...updateData } : appt
        )
      );

      alert(`✅ อัปเดตสถานะเป็น "${newStatus}" เรียบร้อยแล้ว`);
    } catch (error) {
      console.error("Error updating booking status:", error);
      alert('❌ เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    }
  };

  const handleLogout = async () => {
    if (window.confirm('คุณต้องการออกจากระบบหรือไม่?')) {
      try {
        await logout();
        navigate('/login');
      } catch (error) {
        console.error('Error logging out:', error);
        alert('เกิดข้อผิดพลาดในการออกจากระบบ');
      }
    }
  };

  useEffect(() => {
    console.log('Appointments:', appointments);
  }, [appointments]);

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
          
          .employee-profile-header {
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
          
          .status-indicator {
            position: absolute;
            bottom: 8px;
            right: 8px;
            width: 20px;
            height: 20px;
            background: #28a745;
            border-radius: 50%;
            border: 3px solid white;
          }
          
          .profile-info {
            flex: 1;
            color: white;
          }
          
          .profile-main {
            margin-bottom: 1.5rem;
          }
          
          .profile-name {
            font-size: 2rem;
            font-weight: 700;
            margin: 0 0 0.5rem 0;
            color: white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          }
          
          .profile-position {
            font-size: 1.1rem;
            margin: 0;
            color: rgba(255, 119, 48, 0.9);
            font-weight: 500;
          }
          
          .profile-details {
            display: flex;
            gap: 1.5rem;
            flex-wrap: wrap;
            margin-top: 0.5rem;
            justify-content: flex-start;
            min-height: 40px;
          }
          
          .detail-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: rgba(255, 255, 255, 0.9);
            font-size: 0.95rem;
            font-weight: 500;
            width: 200px;
            flex-shrink: 0;
            margin-bottom: 6px;
            min-height: 40px;
          }
          
          .detail-item i {
            width: 32px;
            height: 48px;
            text-align: center;
            flex-shrink: 0;
            margin-right: 8px;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 1.6rem;
            color: #fff;
        }
        /* Force calendar icon to match others exactly */
        .detail-item i.fa-calendar-day {
            width: 32px !important;
            height: 48px !important;
            font-size: 1.6rem !important;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff !important;
            margin-top: -2px !important;
        }
          }
          
          .detail-item span {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1;
            padding-top: 0;
            line-height: 40px;
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
            color: #ff7730;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
          }
          
          .stat-label {
            font-size: 0.85rem;
            color: rgba(255,255,255,0.9);
            font-weight: 500;
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
            
            .profile-details {
              justify-content: center;
              gap: 1rem;
              flex-direction: column;
              align-items: center;
            }
            
            .detail-item {
              width: 180px;
              font-size: 0.9rem;
              justify-content: center;
              display: flex;
              align-items: center;
            }
            
            .detail-item i {
              width: 25px;
              text-align: center;
              display: flex;
              justify-content: center;
              align-items: center;
              font-size: 1rem;
            }
            
            .detail-item span {
              line-height: 1.5;
              padding-top: 0;
            }
            
            .profile-name {
              font-size: 1.5rem;
            }
          }
          
          .page-header {
            padding: 0;
            margin-bottom: 2rem;
          }
          
          .stats-card {
            background: white;
            border-radius: 20px;
            padding: 1.5rem;
            transition: all 0.3s ease;
            border: 2px solid #f0f0f0;
            box-shadow: 0 5px 25px rgba(44, 44, 44, 0.08);
          }
          
          .stats-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 15px 40px rgba(44, 44, 44, 0.15);
            border-color: #ff7730;
          }
          
          .content-card {
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 5px 25px rgba(44, 44, 44, 0.1);
            border: 1px solid #2c2c2c;
          }
          
          .table-hover tbody tr:hover {
            background-color: rgba(255, 119, 48, 0.05);
          }
          
          .table {
            border: none;
          }
          
          .table th,
          .table td {
            border: none;
            border-top: none;
          }
          
          .badge-custom {
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
          }
          
          .calendar-container {
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 5px 25px rgba(44, 44, 44, 0.08);
          }
          
          .calendar-header {
            background: linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%);
            color: white;
            padding: 2rem;
            text-align: center;
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          
          .month-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255, 119, 48, 0.2);
            border: 2px solid #ff7730;
            color: #ff7730;
            width: 45px;
            height: 45px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            cursor: pointer;
            font-size: 1.1rem;
          }
          
          .month-nav:hover {
            background: #ff7730;
            color: white;
            transform: translateY(-50%) scale(1.1);
          }
          
          .month-prev { left: 2rem; }
          .month-next { right: 2rem; }
          
          .calendar-body {
            padding: 0;
          }
          
          .calendar-table {
            width: 100%;
            border-collapse: collapse;
            margin: 0;
          }
          
          .calendar-day-header {
            padding: 1.2rem 0.5rem;
            text-align: center;
            font-weight: 600;
            color: #ff7730;
            border: none;
            background: #f8f9fc;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .calendar-day {
            padding: 0;
            text-align: left;
            height: 120px;
            vertical-align: top;
            position: relative;
            border: 1px solid #e9ecef;
            cursor: pointer;
            transition: all 0.3s ease;
            background: white;
          }
          
          .calendar-day:hover {
            background: rgba(255, 119, 48, 0.05);
          }
          
          .calendar-day.today {
            background: rgba(255, 119, 48, 0.1);
            border: 2px solid #ff7730;
          }
          
          .calendar-day.has-schedule {
            background: rgba(255, 119, 48, 0.03);
          }
          
          .date-number {
            position: absolute;
            top: 8px;
            left: 8px;
            font-size: 1rem;
            font-weight: 600;
            color: #333;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: transparent;
          }
          
          .calendar-day.today .date-number {
            background: #ff7730;
            color: white;
          }
          
          .appointment-list {
            position: absolute;
            top: 40px;
            left: 8px;
            right: 8px;
            bottom: 8px;
            overflow: hidden;
          }
          
          .appointment-item {
            background: linear-gradient(135deg, #ff9900 0%, #ff7730 100%);
            color: white;
            padding: 4px 8px;
            margin-bottom: 2px;
            border-radius: 4px;
            font-size: 0.75rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          .appointment-item:hover {
            transform: scale(1.02);
            box-shadow: 0 2px 8px rgba(255, 119, 48, 0.3);
          }
          
          .appointment-count {
            position: absolute;
            bottom: 6px;
            right: 8px;
            background: #28a745;
            color: white;
            font-size: 0.7rem;
            padding: 2px 6px;
            border-radius: 10px;
            font-weight: 500;
          }
          
          @media (max-width: 768px) {
            .calendar-header {
              padding: 1.5rem 1rem;
            }
            
            .calendar-header h3 {
              font-size: 1.3rem;
            }
            
            .month-nav {
              width: 40px;
              height: 40px;
              font-size: 1rem;
            }
            
            .month-prev { left: 1rem; }
            .month-next { right: 1rem; }
            
            .calendar-day {
              height: 80px;
            }
            
            .calendar-day-header {
              padding: 0.8rem 0.3rem;
              font-size: 0.8rem;
            }
            
            .appointment-item {
              font-size: 0.65rem;
              padding: 2px 4px;
            }
            
            .appointment-list {
              top: 30px;
              left: 4px;
              right: 4px;
              bottom: 4px;
            }
            
            .date-number {
              top: 4px;
              left: 4px;
              width: 24px;
              height: 24px;
              font-size: 0.9rem;
            }
            
            .appointment-count {
              bottom: 3px;
              right: 4px;
              font-size: 0.6rem;
              padding: 1px 4px;
            }
          }
          
          .schedule-dot {
            width: 8px;
            height: 8px;
            background: linear-gradient(135deg, #ff9900 0%, #ff7730 100%);
            border-radius: 50%;
            margin: 2px auto;
            vertical-align: middle;
          }
          
          .has-schedule {
            background: rgba(255, 119, 48, 0.05);
          }
          
          .today {
            background: rgba(255, 119, 48, 0.1);
            border: none;
          }
          
          .review-card {
            border-left: 4px solid #ff7730;
            transition: all 0.3s ease;
            border-radius: 10px;
          }
          
          .review-card:hover {
            transform: translateX(8px);
          }
          
          .star-rating {
            color: #ffc107;
          }
          
          .collapse-btn {
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: rgba(255, 119, 48, 0.2);
            border: 2px solid #ff7730;
            color: #ff7730;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: 'flex';
            align-items: 'center';
            justify-content: 'center';
            transition: all 0.3s ease;
          }
          
          .collapse-btn:hover {
            background: #ff7730;
            color: white;
            transform: scale(1.1);
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
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', marginBottom: 2 }}>คุณ{userName || 'พนักงาน'}</div>
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
                >
                  <i className="fas fa-user-cog me-2"></i>
                  ตั้งค่าโปรไฟล์
                </button>
              </div>
            </>
          )}
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
        
        <nav className="sidebar-nav flex-grow-1">
          <button 
            className={`sidebar-nav-item ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
            title="ตารางงาน"
          >
            <i className="fas fa-calendar-week"></i>
            {!sidebarCollapsed && <span>ตารางงาน</span>}
          </button>
          
          <button 
            className={`sidebar-nav-item ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
            title="รายการลูกค้าจองคิว"
          >
            <i className="fas fa-users"></i>
            {!sidebarCollapsed && <span>รายการลูกค้าจองคิว</span>}
          </button>
          
          <button 
            className={`sidebar-nav-item ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
            title="รีวิวและคะแนน"
          >
            <i className="fas fa-star"></i>
            {!sidebarCollapsed && <span>รีวิวและคะแนน</span>}
          </button>
          
          {/* Logout Button */}
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

      {/* Main Content */}
      <div className="main-content" style={{ background: '#faf8f0ff' }}>
        {/* Employee Profile Header */}
        <div className="employee-profile-header">
          <div className="profile-card">
            <div className="profile-background">
              <div className="profile-content">
                <div className="profile-image-container">
                  <div className="profile-image">
                    {userName ? userName.charAt(0).toUpperCase() : <i className="fas fa-user"></i>}
                  </div>
                  <div className="status-indicator"></div>
                </div>
                
                <div className="profile-info">
                  <div className="profile-main">
                    <h2 className="profile-name">คุณ{userName}</h2>
                    <p className="profile-position">
                      <i className="fas fa-spa me-2"></i>
                      {employeeData?.position || 'นักบำบัดสปา'}
                    </p>
                  </div>
                  
                  <div className="profile-details">
                    <div className="detail-item">
                      <i className="fas fa-phone"></i>
                      <span>{employeeData?.phone || 'ไม่ระบุเบอร์โทร'}</span>
                    </div>
                    <div className="detail-item">
                      <i className="fas fa-star"></i>
                      <span>{averageRating} คะแนนรีวิว</span>
                    </div>
                    <div className="detail-item">
                      <i className="fas fa-calendar-day"></i>
                      <span>{currentTime.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                    </div>
                  </div>
                </div>
                
                <div className="profile-stats">
                  <div className="stat-item">
                    <div className="stat-number">{todayAppointments.length}</div>
                    <div className="stat-label">คิววันนี้</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number">{totalCustomers}</div>
                    <div className="stat-label">ลูกค้าทั้งหมด</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number">{averageRating}</div>
                    <div className="stat-label">คะแนนเฉลี่ย</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Tab Content */}
        {activeTab === 'schedule' && (
          <div className="content-card">
            <div className="card-header bg-gradient text-white p-4" style={{ background: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)', borderBottom: '3px solid #ff7730' }}>
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0" style={{ color: '#ff7730' }}>
                  <i className="fas fa-calendar-week me-2" style={{ color: '#ff7730' }}></i>
                  ตารางงานรายสัปดาห์
                </h4>
                
                <div className="d-flex align-items-center gap-3">
                  {/* Navigation Buttons */}
                  <div className="btn-group">
                    <button 
                      className="btn btn-sm"
                      onClick={() => changeWeek(-1)}
                      style={{
                        backgroundColor: 'transparent',
                        color: '#ff7730',
                        border: '1px solid #ff7730'
                      }}
                    >
                      <i className="fas fa-chevron-left me-1"></i>
                      สัปดาห์ก่อน
                    </button>
                    <button 
                      className="btn btn-sm"
                      onClick={() => changeWeek(1)}
                      style={{
                        backgroundColor: 'transparent',
                        color: '#ff7730',
                        border: '1px solid #ff7730'
                      }}
                    >
                      สัปดาห์หน้า
                      <i className="fas fa-chevron-right ms-1"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">กำลังโหลด...</span>
                  </div>
                  <p className="text-muted mb-0">กำลังโหลดตารางงาน...</p>
                </div>
              ) : (
                // Weekly Schedule View
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead style={{ background: '#f8f9fc' }}>
                      <tr>
                        <th className="py-3 px-4 fw-bold" style={{ width: '12%', color: '#ff7730' }}>วัน</th>
                        <th className="py-3 px-4 fw-bold" style={{ width: '12%', color: '#ff7730' }}>วันที่</th>
                        <th className="py-3 px-4 fw-bold" style={{ width: '25%', color: '#ff7730' }}>เวลาทำงาน</th>
                        <th className="py-3 px-4 fw-bold" style={{ width: '25%', color: '#ff7730' }}>การจองลูกค้า</th>
                        <th className="py-3 px-4 fw-bold" style={{ width: '15%', color: '#ff7730' }}>สถานะ</th>
                        <th className="py-3 px-4 fw-bold" style={{ width: '11%', color: '#ff7730' }}>การดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklySchedule.map((day, index) => {
                        const dayAppointments = appointments.filter(appt => appt.date === day.date);
                        return (
                          <tr key={index} className={day.isToday ? 'table-warning' : ''}>
                            <td className="py-3 px-4">
                              <span className={`badge-custom ${day.isToday ? 'bg-warning text-dark' : 'bg-light text-dark'}`}>
                                {day.dayName}
                              </span>
                            </td>
                            <td className="py-3 px-4" style={{ color: '#333', fontWeight: '500' }}>{day.dayNumber}</td>
                            <td className="py-3 px-4">
                              {day.schedules.length > 0 ? (
                                day.schedules.map((schedule, idx) => (
                                  <div key={idx} className="mb-2">
                                    <span className="badge-custom" style={{ 
                                      background: 'linear-gradient(135deg, #ff9900 0%, #ff7730 100%)', 
                                      color: 'white',
                                      padding: '6px 12px',
                                      borderRadius: '20px',
                                      fontSize: '12px'
                                    }}>
                                      {schedule.startTime || '10:00'} - {schedule.endTime || '19:00'}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-muted">วันหยุด</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {dayAppointments.length > 0 ? (
                                dayAppointments.map((appt, idx) => (
                                  <div key={idx} className="mb-2">
                                    <span className="badge bg-success" style={{ 
                                      padding: '6px 12px',
                                      borderRadius: '20px',
                                      fontSize: '12px'
                                    }}>
                                      {appt.time || '10:00'} - {appt.service || 'นวดแผนไทย'}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-muted">ไม่มีการจอง</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {day.schedules.length > 0 ? (
                                day.isToday ? (
                                  <span className="badge-custom" style={{ 
                                    background: '#28a745', 
                                    color: 'white',
                                    padding: '6px 12px',
                                    borderRadius: '20px',
                                    fontSize: '12px'
                                  }}>พร้อมทำงาน</span>
                                ) : (
                                  <span className="badge-custom" style={{ 
                                    background: '#17a2b8', 
                                    color: 'white',
                                    padding: '6px 12px',
                                    borderRadius: '20px',
                                    fontSize: '12px'
                                  }}>พร้อมทำงาน</span>
                                )
                              ) : (
                                <span className="badge-custom" style={{ 
                                  background: '#6c757d', 
                                  color: 'white',
                                  padding: '6px 12px',
                                  borderRadius: '20px',
                                  fontSize: '12px'
                                }}>หยุด</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {day.schedules.length > 0 && (
                                <button 
                                  className="btn btn-sm"
                                  style={{ 
                                    background: 'linear-gradient(135deg, #ff9900 0%, #ff7730 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '20px',
                                    padding: '6px 12px',
                                    fontSize: '12px'
                                  }}
                                  title="ดูรายละเอียด"
                                >
                                  <i className="fas fa-eye"></i>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="content-card">
            <div className="card-header bg-gradient text-white p-4" style={{ background: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)', borderBottom: '3px solid #ff7730' }}>
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0" style={{ color: '#ff7730' }}>
                  <i className="fas fa-users me-2" style={{ color: '#ff7730' }}></i>
                  รายการลูกค้าที่จองคิว
                </h4>
                <div className="d-flex align-items-center gap-3">
                  {/* ปุ่มสลับสถานะ */}
                  <div className="btn-group" role="group">
                    <button 
                      type="button" 
                      className={`btn btn-sm ${appointmentFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setAppointmentFilter('all')}
                      style={{ 
                        backgroundColor: appointmentFilter === 'all' ? '#007bff' : 'transparent',
                        borderColor: '#007bff',
                        color: appointmentFilter === 'all' ? 'white' : '#007bff'
                      }}
                    >
                      <i className="fas fa-list me-1"></i>
                      ทั้งหมด
                    </button>
                    <button 
                      type="button" 
                      className={`btn btn-sm ${appointmentFilter === 'ongoing' ? 'btn-warning' : 'btn-outline-warning'}`}
                      onClick={() => setAppointmentFilter('ongoing')}
                      style={{ 
                        backgroundColor: appointmentFilter === 'ongoing' ? '#ffc107' : 'transparent',
                        borderColor: '#ffc107',
                        color: appointmentFilter === 'ongoing' ? '#212529' : '#ffc107'
                      }}
                    >
                      <i className="fas fa-clock me-1"></i>
                      กำลังจอง
                    </button>
                    <button 
                      type="button" 
                      className={`btn btn-sm ${appointmentFilter === 'completed' ? 'btn-success' : 'btn-outline-success'}`}
                      onClick={() => setAppointmentFilter('completed')}
                      style={{ 
                        backgroundColor: appointmentFilter === 'completed' ? '#28a745' : 'transparent',
                        borderColor: '#28a745',
                        color: appointmentFilter === 'completed' ? 'white' : '#28a745'
                      }}
                    >
                      <i className="fas fa-check-circle me-1"></i>
                      เสร็จสิ้น
                    </button>
                  </div>
                  <span className="badge-custom" style={{ 
                    background: appointmentFilter === 'all' ? '#e3f2fd' :
                               appointmentFilter === 'ongoing' ? '#fff3cd' : '#d4edda',
                    color: appointmentFilter === 'all' ? '#1976d2' :
                           appointmentFilter === 'ongoing' ? '#856404' : '#155724',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}>
                    {appointmentFilter === 'all' ? `ทั้งหมด ${appointments.length}` :
                     appointmentFilter === 'ongoing' ? `กำลังจอง ${appointments.filter(a => a.status !== 'เสร็จสิ้น').length}` :
                     `เสร็จสิ้น ${appointments.filter(a => a.status === 'เสร็จสิ้น').length}`} รายการ
                  </span>
                </div>
              </div>
            </div>
            <div className="card-body p-4">
              {appointments.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-calendar-times mb-3" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
                  <h5>ยังไม่มีการจองคิว</h5>
                  <p className="text-muted">เมื่อลูกค้าจองคิวกับคุณ จะแสดงที่นี่</p>
                </div>
              ) : (
                <div className="row g-3">
                  {appointments
                    .filter(booking => {
                      if (appointmentFilter === 'ongoing') return booking.status !== 'เสร็จสิ้น';
                      if (appointmentFilter === 'completed') return booking.status === 'เสร็จสิ้น';
                      return true; // 'all'
                    })
                    .map(booking => (
                    <div className="col-md-6 col-lg-4" key={booking.id}>
                      <div className="stats-card h-100" style={{ 
                        border: '1px solid #e9ecef',
                        borderLeft: booking.status === 'ยืนยันแล้ว' ? '4px solid #28a745' : 
                                  booking.status === 'เสร็จสิ้น' ? '4px solid #17a2b8' :
                                  booking.status === 'ยกเลิก' || booking.status === 'ปฏิเสธ' ? '4px solid #dc3545' :
                                  '4px solid #ffc107'
                      }}>
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div className="d-flex align-items-center">
                            <div 
                              className="rounded-circle d-flex align-items-center justify-content-center me-3"
                              style={{ 
                                width: '45px', 
                                height: '45px', 
                                background: 'linear-gradient(135deg, #ff9900 0%, #ff7730 100%)',
                                color: 'white',
                                fontSize: '1.1rem',
                                fontWeight: 'bold'
                              }}
                            >
                              {booking.customerName ? booking.customerName.charAt(0).toUpperCase() : 'C'}
                            </div>
                            <div>
                              <h6 className="mb-1 fw-bold">{booking.customerName || 'ลูกค้า'}</h6>
                              <small className="text-muted">
                                <i className="fas fa-id-card me-1"></i>
                                {booking.memberId ? `ID: ${booking.memberId.substring(0, 8)}...` : 'ไม่มีข้อมูล'}
                              </small>
                            </div>
                          </div>
                          {getStatusBadge(booking.status)}
                        </div>
                        
                        <div className="mb-3">
                          <div className="d-flex align-items-center mb-2">
                            <i className="fas fa-spa me-2" style={{ color: '#28a745', width: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}></i>
                            <span className="fw-bold text-success">{booking.service || booking.serviceName || 'บริการสปา'}</span>
                          </div>
                          <div className="d-flex align-items-center mb-2">
                            <i className="fas fa-calendar me-2" style={{ color: '#ff7730', width: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}></i>
                            <span className="text-dark">{(() => {
                              try {
                                const dateField = getBookingDate(booking);
                                if (dateField && typeof dateField.toDate === 'function') {
                                  return new Date(dateField.toDate()).toLocaleDateString('th-TH');
                                } else if (dateField instanceof Date) {
                                  return dateField.toLocaleDateString('th-TH');
                                } else if (dateField && typeof dateField === 'string') {
                                  return new Date(dateField).toLocaleDateString('th-TH');
                                } else {
                                  return booking.date || 'ไม่ระบุวันที่';
                                }
                              } catch (error) {
                                console.error('Error formatting date:', error);
                                return booking.date || 'ไม่ระบุวันที่';
                              }
                            })()}</span>
                          </div>
                          <div className="d-flex align-items-center mb-2">
                            <i className="fas fa-clock me-2" style={{ color: '#ff7730', width: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}></i>
                            <span className="text-dark">{booking.time || booking.bookingTime || 'ไม่ระบุเวลา'}</span>
                          </div>
                          {booking.duration && (
                            <div className="d-flex align-items-center mb-2">
                              <i className="fas fa-hourglass-half me-2" style={{ color: '#ffc107', width: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}></i>
                              <span className="text-dark">{booking.duration} นาที</span>
                            </div>
                          )}
                          {booking.price && (
                            <div className="d-flex align-items-center mb-2">
                              <i className="fas fa-money-bill me-2" style={{ color: '#28a745', width: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}></i>
                              <span className="text-dark">{booking.price} บาท</span>
                            </div>
                          )}
                          {booking.paymentStatus && (
                            <div className="d-flex align-items-center mb-2">
                              <i className="fas fa-credit-card me-2" style={{ color: '#17a2b8', width: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}></i>
                              <span className="text-dark">
                                {booking.paymentStatus === 'ชำระเงินแล้ว' ? (
                                  <span className="text-success">ชำระเงินแล้ว</span>
                                ) : (
                                  <span className="text-warning">รอชำระเงิน</span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {booking.notes && (
                          <div className="mb-3">
                            <small className="text-muted">
                              <i className="fas fa-sticky-note me-1"></i>
                              หมายเหตุ: {booking.notes}
                            </small>
                          </div>
                        )}
                        
                        <div className="d-flex gap-2 mt-auto">
                          {/* ปุ่มสลับสถานะ */}
                          {booking.status !== 'เสร็จสิ้น' && booking.status !== 'ยกเลิก' && booking.status !== 'ปฏิเสธ' ? (
                            <button 
                              className="btn btn-sm btn-success flex-fill"
                              onClick={() => handleUpdateBookingStatus(booking.id, 'เสร็จสิ้น')}
                              style={{ 
                                fontSize: '0.85rem',
                                backgroundColor: '#28a745',
                                borderColor: '#28a745',
                                fontWeight: '500'
                              }}
                            >
                              <i className="fas fa-check me-1"></i>
                              ทำเสร็จ
                            </button>
                          ) : booking.status === 'เสร็จสิ้น' ? (
                            <button 
                              className="btn btn-sm btn-warning flex-fill"
                              onClick={() => handleUpdateBookingStatus(booking.id, 'ยืนยันแล้ว')}
                              style={{ 
                                fontSize: '0.85rem',
                                backgroundColor: '#ffc107',
                                borderColor: '#ffc107',
                                color: '#212529',
                                fontWeight: '500'
                              }}
                            >
                              <i className="fas fa-undo me-1"></i>
                              ย้อนกลับ
                            </button>
                          ) : null}
                          
                          {/* ปุ่มดูรายละเอียด - แสดงเสมอ */}
                          <button 
                            className="btn btn-sm btn-primary"
                            style={{ 
                              fontSize: '0.85rem',
                              backgroundColor: '#007bff',
                              borderColor: '#007bff',
                              minWidth: '45px'
                            }}
                            title="ดูรายละเอียด"
                            onClick={() => setSelectedAppointment(booking)}
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                        </div>

                        {/* แสดงข้อมูลรีวิวถ้ามี */}
                        {booking.review && booking.status === 'เสร็จสิ้น' && (
                          <div className="mt-3 p-2 bg-light rounded">
                            <div className="d-flex align-items-center mb-1">
                              <small className="text-muted me-2">รีวิวจากลูกค้า:</small>
                              <div className="star-rating">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <i 
                                    key={star} 
                                    className={`fas fa-star ${star <= (booking.rating || 0) ? 'text-warning' : 'text-muted'}`}
                                    style={{ fontSize: '0.7rem' }}
                                  ></i>
                                ))}
                              </div>
                            </div>
                            <small className="fst-italic">"{booking.review}"</small>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="content-card">
            <div className="card-header bg-gradient text-white p-4" style={{ background: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)', borderBottom: '3px solid #ff7730' }}>
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0" style={{ color: '#ff7730' }}>
                  <i className="fas fa-star me-2"></i>
                  รีวิวและคะแนนการให้บริการ
                </h4>
                <div className="d-flex align-items-center">
                  <div className="star-rating me-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <i 
                        key={star} 
                        className={`fas fa-star ${star <= Math.round(averageRating) ? 'text-warning' : 'text-white-50'}`}
                      ></i>
                    ))}
                  </div>
                  <span className="badge-custom" style={{ background: '#ffc107', color: '#2c2c2c' }}>{averageRating} / 5.0</span>
                </div>
              </div>
            </div>
            <div className="card-body">
              {reviews.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-star mb-3" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
                  <h5>ยังไม่มีรีวิว</h5>
                  <p className="text-muted">
                    เมื่อคุณทำงานเสร็จสิ้นและอัปเดตสถานะการให้บริการเป็น "เสร็จสิ้น" 
                    <br />ลูกค้าจะสามารถให้คะแนนและรีวิวการให้บริการของคุณได้
                  </p>
                  <div className="mt-3">
                    <div className="alert alert-info" role="alert">
                      <i className="fas fa-info-circle me-2"></i>
                      <span>ระบบจะแสดงข้อมูลรีวิวจริงจากลูกค้าที่ใช้บริการกับคุณเท่านั้น</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="row g-3">
                  {reviews.map(review => (
                    <div className="col-12" key={review.id}>
                      <div className="review-card stats-card">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div className="d-flex align-items-center">
                            <div className="icon-circle me-3" style={{ 
                              width: '50px', 
                              height: '50px', 
                              background: 'linear-gradient(135deg, #ff9900 0%, #ff7730 100%)',
                              color: 'white',
                              fontSize: '1.2rem',
                              fontWeight: 'bold',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {review.customerName?.charAt(0) || review.userEmail?.charAt(0) || 'C'}
                            </div>
                            <div>
                              <h6 className="mb-1 fw-bold">{review.customerName || review.userEmail || 'ลูกค้า'}</h6>
                              <small className="text-muted">{review.date}</small>
                            </div>
                          </div>
                          <div className="d-flex align-items-center">
                            <div className="star-rating me-2">
                              {[1, 2, 3, 4, 5].map(star => (
                                <i 
                                  key={star} 
                                  className={`fas fa-star ${star <= review.rating ? 'text-warning' : 'text-muted'}`}
                                ></i>
                              ))}
                            </div>
                            <span className="badge-custom" style={{ background: '#ffc107', color: '#2c2c2c' }}>{review.rating}/5</span>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <div className="d-flex align-items-center mb-2">
                            <i className="fas fa-spa me-2" style={{ color: '#28a745', width: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}></i>
                            <span className="fw-bold text-success">{review.service}</span>
                          </div>
                          <p className="text-dark mb-0" style={{ lineHeight: '1.6' }}>
                            "{review.comment}"
                          </p>
                        </div>
                        
                        {/* ลิงก์ไปยังการจองที่มีรีวิว (ถ้ามี ID) */}
                        {review.id && review.id !== '1' && review.id !== '2' && review.id !== '3' && (
                          <div className="text-end">
                            <button 
                              className="btn btn-sm btn-link" 
                              onClick={() => {
                                // ค้นหาการจองที่เกี่ยวข้องกับรีวิวนี้
                                const relatedBooking = appointments.find(appt => appt.id === review.id);
                                if (relatedBooking) {
                                  alert(`รหัสการจอง: ${relatedBooking.id}\nวันที่: ${relatedBooking.date}\nบริการ: ${relatedBooking.service}`);
                                }
                              }}
                            >
                              <i className="fas fa-external-link-alt me-1"></i>
                              ดูรายละเอียดการจอง
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal สำหรับแสดงรายละเอียดการจอง */}
      {selectedAppointment && (
        <div 
          className="modal show d-block" 
          tabIndex="-1" 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedAppointment(null);
            }
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: '15px', border: 'none' }}>
              <div className="modal-header" style={{ 
                background: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)', 
                color: 'white',
                borderTopLeftRadius: '15px',
                borderTopRightRadius: '15px',
                borderBottom: '3px solid #ff7730'
              }}>
                <h5 className="modal-title">
                  <i className="fas fa-calendar-check me-2" style={{ color: '#ff7730' }}></i>
                  รายละเอียดการจอง
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => setSelectedAppointment(null)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-4">
                  {/* ข้อมูลลูกค้า */}
                  <div className="col-md-6">
                    <div className="card h-100" style={{ border: '1px solid #e9ecef', borderRadius: '10px' }}>
                      <div className="card-header bg-light">
                        <h6 className="mb-0">
                          <i className="fas fa-user me-2" style={{ color: '#ff7730' }}></i>
                          ข้อมูลลูกค้า
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="d-flex align-items-center mb-3">
                          <div 
                            className="rounded-circle d-flex align-items-center justify-content-center me-3"
                            style={{ 
                              width: '50px', 
                              height: '50px', 
                              background: 'linear-gradient(135deg, #ff9900 0%, #ff7730 100%)',
                              color: 'white',
                              fontSize: '1.2rem',
                              fontWeight: 'bold'
                            }}
                          >
                            {selectedAppointment.customerName ? selectedAppointment.customerName.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div>
                            <h6 className="mb-1 fw-bold">{selectedAppointment.customerName || 'ลูกค้า'}</h6>
                            <small className="text-muted">
                              ID: {selectedAppointment.memberId ? selectedAppointment.memberId.substring(0, 12) : 'ไม่มีข้อมูล'}
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ข้อมูลการจอง */}
                  <div className="col-md-6">
                    <div className="card h-100" style={{ border: '1px solid #e9ecef', borderRadius: '10px' }}>
                      <div className="card-header bg-light">
                        <h6 className="mb-0">
                          <i className="fas fa-spa me-2" style={{ color: '#ff7730' }}></i>
                          ข้อมูลบริการ
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="mb-3">
                          <label className="form-label text-muted">บริการ</label>
                          <p className="fw-bold text-success mb-2">{selectedAppointment.service || selectedAppointment.serviceName || 'บริการสปา'}</p>
                        </div>
                        <div className="row g-3">
                          <div className="col-6">
                            <label className="form-label text-muted">วันที่</label>
                            <p className="mb-2">{(() => {
                              try {
                                const dateField = getBookingDate(selectedAppointment);
                                if (dateField && typeof dateField.toDate === 'function') {
                                  return new Date(dateField.toDate()).toLocaleDateString('th-TH');
                                } else if (dateField instanceof Date) {
                                  return dateField.toLocaleDateString('th-TH');
                                } else if (dateField && typeof dateField === 'string') {
                                  return new Date(dateField).toLocaleDateString('th-TH');
                                } else {
                                  return selectedAppointment.date || 'ไม่ระบุ';
                                }
                              } catch (error) {
                                console.error('Error formatting date:', error);
                                return selectedAppointment.date || 'ไม่ระบุ';
                              }
                            })()}</p>
                          </div>
                          <div className="col-6">
                            <label className="form-label text-muted">เวลา</label>
                            <p className="mb-2">{selectedAppointment.time || selectedAppointment.bookingTime || 'ไม่ระบุ'}</p>
                          </div>
                          <div className="col-6">
                            <label className="form-label text-muted">ระยะเวลา</label>
                            <p className="mb-2">{selectedAppointment.duration ? `${selectedAppointment.duration} นาที` : 'ไม่ระบุ'}</p>
                          </div>
                          <div className="col-6">
                            <label className="form-label text-muted">ราคา</label>
                            <p className="mb-2 text-success fw-bold">{selectedAppointment.price || selectedAppointment.serviceFee || selectedAppointment.amount ? `${selectedAppointment.price || selectedAppointment.serviceFee || selectedAppointment.amount} บาท` : 'ไม่ระบุ'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* สถานะและการชำระเงิน */}
                  <div className="col-12">
                    <div className="card" style={{ border: '1px solid #e9ecef', borderRadius: '10px' }}>
                      <div className="card-header bg-light">
                        <h6 className="mb-0">
                          <i className="fas fa-info-circle me-2" style={{ color: '#ff7730' }}></i>
                          สถานะและข้อมูลเพิ่มเติม
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="row g-3">
                          <div className="col-md-4">
                            <label className="form-label text-muted">สถานะการจอง</label>
                            <div>{getStatusBadge(selectedAppointment.status)}</div>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label text-muted">การชำระเงิน</label>
                            <p className="mb-0">
                              {selectedAppointment.paymentStatus === 'ชำระเงินแล้ว' ? (
                                <span className="badge bg-success">ชำระเงินแล้ว</span>
                              ) : (
                                <span className="badge bg-warning text-dark">รอชำระเงิน</span>
                              )}
                            </p>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label text-muted">รหัสการจอง</label>
                            <p className="mb-0 text-muted small">{selectedAppointment.id}</p>
                          </div>
                        </div>
                        
                        {selectedAppointment.notes && (
                          <div className="mt-3">
                            <label className="form-label text-muted">หมายเหตุ</label>
                            <p className="mb-0 p-3 bg-light rounded">{selectedAppointment.notes}</p>
                          </div>
                        )}

                        {/* แสดงรีวิวถ้ามี */}
                        {selectedAppointment.review && selectedAppointment.status === 'เสร็จสิ้น' && (
                          <div className="mt-3">
                            <label className="form-label text-muted">รีวิวจากลูกค้า</label>
                            <div className="p-3 bg-light rounded">
                              <div className="d-flex align-items-center mb-2">
                                <div className="star-rating me-2">
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <i 
                                      key={star} 
                                      className={`fas fa-star ${star <= (selectedAppointment.rating || 0) ? 'text-warning' : 'text-muted'}`}
                                    ></i>
                                  ))}
                                </div>
                                <span className="text-muted">({selectedAppointment.rating || 0}/5)</span>
                              </div>
                              <p className="mb-0 fst-italic">"{selectedAppointment.review}"</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer bg-light" style={{ 
                borderBottomLeftRadius: '15px',
                borderBottomRightRadius: '15px'
              }}>
                <div className="d-flex gap-2 w-100">
                  {selectedAppointment.status !== 'เสร็จสิ้น' && selectedAppointment.status !== 'ยกเลิก' && selectedAppointment.status !== 'ปฏิเสธ' && (
                    <button 
                      className="btn btn-success"
                      onClick={() => {
                        handleUpdateBookingStatus(selectedAppointment.id, 'เสร็จสิ้น');
                        setSelectedAppointment(null);
                      }}
                    >
                      <i className="fas fa-check me-2"></i>
                      ทำเสร็จ
                    </button>
                  )}
                  {selectedAppointment.status === 'เสร็จสิ้น' && (
                    <button 
                      className="btn btn-warning"
                      onClick={() => {
                        handleUpdateBookingStatus(selectedAppointment.id, 'ยืนยันแล้ว');
                        setSelectedAppointment(null);
                      }}
                    >
                      <i className="fas fa-undo me-2"></i>
                      ย้อนกลับ
                    </button>
                  )}
                  <button 
                    type="button" 
                    className="btn btn-secondary ms-auto"
                    onClick={() => setSelectedAppointment(null)}
                  >
                    ปิด
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardEmployee;

