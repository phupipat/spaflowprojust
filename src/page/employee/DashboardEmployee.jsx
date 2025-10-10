// src/pages/employee/DashboardEmployee.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { db } from '../../Firebase'; 
import { collection, query, where, getDocs, doc as firestoreDoc, updateDoc, getDoc, orderBy } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../styles/SharedStyles.css';
import '../../styles/DashboardStyles.css';

// Custom CSS for week navigation buttons
const weekNavButtonStyle = `
  @keyframes buttonPulse {
    0% { transform: scale(1); }
    50% { transform: scale(0.97); }
    100% { transform: scale(1); }
  }
  
  @keyframes buttonRipple {
    0% {
      transform: scale(0);
      opacity: 0.5;
    }
    100% {
      transform: scale(2);
      opacity: 0;
    }
  }
`;

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
  const [currentMonth] = useState(new Date().getMonth());
  const [currentYear] = useState(new Date().getFullYear());
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [employeeData, setEmployeeData] = useState(null);
  const [employeePhone, setEmployeePhone] = useState('');
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [appointmentFilter, setAppointmentFilter] = useState('all'); // 'all', 'ongoing', 'completed'
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // State สำหรับระบบแจ้งเตือน
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  // เก็บข้อมูลรีวิวครั้งก่อนเพื่อเปรียบเทียบ
  const [prevReviewsCount, setPrevReviewsCount] = useState(0);
  // In-memory cache for service names to reduce Firestore reads
  const serviceCacheRef = React.useRef({});
  
  // ฟังก์ชันเพิ่มการแจ้งเตือน
  const addNotification = (message, type = 'info') => {
    const newNotification = {
      id: Date.now(),
      message,
      type,
      time: new Date().toLocaleTimeString('th-TH'),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  // ฟังก์ชันอ่านการแจ้งเตือนทั้งหมด
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    setUnreadCount(0);
  };

  // ฟังก์ชันล้างการแจ้งเตือน
  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  useEffect(() => {
    // Update current time every 30 seconds (for auto-refresh)
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
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
        
  // ดึงรายละเอียดของผู้ใช้งาน (พนักงาน)
        const userQuery = query(
          collection(db, 'artifacts/login-spa-7921d/users'),
          where('__name__', '==', user.uid)
        );
        const userSnapshot = await getDocs(userQuery);
        const userData = userSnapshot.docs[0]?.data();
        setUserName(userData?.fullname || userData?.name || 'พนักงาน');
        console.log('Employee name:', userData?.fullname || userData?.name || 'พนักงาน');

  // ดึงข้อมูลพนักงานจากคอลเลกชัน Staffs
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
          
          // const monthlyData = generateMonthlySchedule(staffSchedules);
          // setMonthlySchedules(monthlyData);
          // Prefer phone from Users collection (userData) but fall back to staff record
          try {
            const phoneFromUser = userData?.phone;
            const phoneFromStaff = staffData?.phone;
            if (phoneFromUser) setEmployeePhone(phoneFromUser);
            else if (phoneFromStaff) setEmployeePhone(phoneFromStaff);
          } catch (err) {
            console.error('Error setting employee phone from staff data:', err);
          }
        } else {
          console.log('No staff data found');
          // Still set phone from user document if available
          try {
            if (userData?.phone) setEmployeePhone(userData.phone);
          } catch (err) {
            console.error('Error setting employee phone from user data:', err);
          }
        }

  // ดึงการจองทั้งหมดที่เกี่ยวข้องกับพนักงานคนนี้ (ไม่กรองตามสถานะ)
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
        // Debug: show raw docs
        try {
          console.log('bookingsSnapshot.docs ids:', bookingsSnapshot.docs.map(d => d.id));
          console.log('approvedBookingsSnapshot.docs ids:', approvedBookingsSnapshot.docs.map(d => d.id));
        } catch (e) {
          console.error('Error logging snapshots:', e);
        }
        
        // รวมข้อมูลการจองทั้งที่กำหนดให้พนักงานคนนี้แล้ว และที่มีสถานะ "ยืนยันแล้ว"
        const bookingsData = [];
        const processedIds = new Set(); // เก็บ ID ที่ได้ประมวลผลไปแล้ว เพื่อป้องกันข้อมูลซ้ำ
        
        // เพิ่มข้อมูลการจองที่กำหนดให้พนักงานคนนี้ก่อน
        for (const bookingDoc of bookingsSnapshot.docs) {
          const data = bookingDoc.data();
          const docId = bookingDoc.id;
          console.log('Processing bookingDoc id:', docId, 'raw data keys:', Object.keys(data || {}));
          
          // จัดการกับข้อมูล timestamp อย่างปลอดภัย
          let createdAtDate = new Date();
          let bookingDate = null;
          let dateISO = null;
          let timeStr = '';
          
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
          
          // แปลงวันที่การจอง (normalize เป็น Date และ ISO string)
          const dateField = getBookingDate(data);
          try {
            if (dateField && typeof dateField.toDate === 'function') {
              bookingDate = dateField.toDate();
            } else if (dateField instanceof Date) {
              bookingDate = dateField;
            } else if (dateField) {
              bookingDate = new Date(dateField);
            }

            if (bookingDate && !Number.isNaN(bookingDate.getTime())) {
              dateISO = bookingDate.toISOString().split('T')[0];
            }
          } catch (e) {
            console.error('Error converting booking date:', e);
          }

          // Normalize time string
          timeStr = data.time || data.bookingTime || data.timeSlot || '';
          
          // ดึงชื่อลูกค้าจาก users collection
          let customerName = data.customerName || 'ลูกค้า';
          // ดึงชื่อบริการจาก Services collection ถ้ามีการเก็บเป็น serviceId หรือ service (string id)
          let resolvedServiceName = data.service || data.serviceName || '';
          try {
            const serviceId = data.serviceId || (typeof data.service === 'string' ? data.service : null) || (data.service && data.service.id ? data.service.id : null);
            if (serviceId) {
              // check cache first
              if (serviceCacheRef.current[serviceId]) {
                resolvedServiceName = serviceCacheRef.current[serviceId];
              } else {
                const serviceDocRef = firestoreDoc(db, 'Services', serviceId);
                const serviceDoc = await getDoc(serviceDocRef);
                if (serviceDoc.exists()) {
                  const serviceData = serviceDoc.data();
                  if (serviceData && serviceData.name) {
                    resolvedServiceName = serviceData.name;
                    serviceCacheRef.current[serviceId] = serviceData.name; // cache it
                    console.log('Resolved service from DB and cached:', serviceId, serviceData.name);
                  }
                } else {
                  console.log('Service doc not found for id:', serviceId);
                }
              }
            } else if (data.service && typeof data.service === 'object' && data.service.name) {
              resolvedServiceName = data.service.name;
            }
          } catch (err) {
            console.error('Error resolving service name for booking', docId, err);
          }
          if (data.userId) {
            try {
              const userDocRef = firestoreDoc(db, 'artifacts/login-spa-7921d/users', data.userId);
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
            // date in ISO yyyy-mm-dd for filtering/calendar
            date: dateISO || (data.date ? (new Date(data.date).toISOString().split('T')[0]) : undefined),
            // normalized time string
            time: timeStr || data.time || data.bookingTime,
            // normalizedDate as ISO datetime string for sorting
            normalizedDate: bookingDate && !Number.isNaN(bookingDate.getTime()) ? bookingDate.toISOString() : (createdAtDate ? createdAtDate.toISOString() : null)
          ,
            serviceName: resolvedServiceName
          });

          console.log('Pushed booking id:', docId, 'normalizedDate:', bookingsData[bookingsData.length-1].normalizedDate, 'date:', bookingsData[bookingsData.length-1].date, 'time:', bookingsData[bookingsData.length-1].time);
          
          processedIds.add(docId); // เพิ่ม ID ที่ประมวลผลแล้ว
        }
        
        // เพิ่มข้อมูลการจองที่มีสถานะ "ยืนยันแล้ว" และยังไม่ได้กำหนดพนักงาน
        for (const approvedDoc of approvedBookingsSnapshot.docs) {
          const data = approvedDoc.data();
          const docId = approvedDoc.id;

          if (!processedIds.has(docId)) {
            // ดึงชื่อลูกค้าจาก users collection
            let customerName = data.customerName || 'ลูกค้า';
            if (data.userId) {
              try {
                const userDocRef = firestoreDoc(db, 'artifacts/login-spa-7921d/users', data.userId);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  customerName = userData.fullname || userData.name || userData.displayName || data.userEmail || 'ลูกค้า';
                }
              } catch (error) {
                console.log('Error fetching customer name:', error);
              }
            }

            // Normalize date/time for approved bookings as well
            let approvedCreatedAt = new Date();
            try {
              if (data.createdAt && typeof data.createdAt.toDate === 'function') approvedCreatedAt = data.createdAt.toDate();
              else if (data.createdAt instanceof Date) approvedCreatedAt = data.createdAt;
              else if (data.createdAt) approvedCreatedAt = new Date(data.createdAt);
            } catch (e) {
              console.error('Error parsing approved createdAt:', e);
            }

            let approvedBookingDate = null;
            let approvedDateISO = null;
            try {
              const df = getBookingDate(data);
              if (df && typeof df.toDate === 'function') approvedBookingDate = df.toDate();
              else if (df instanceof Date) approvedBookingDate = df;
              else if (df) approvedBookingDate = new Date(df);
              if (approvedBookingDate && !Number.isNaN(approvedBookingDate.getTime())) approvedDateISO = approvedBookingDate.toISOString().split('T')[0];
            } catch (e) {
              console.error('Error converting approved booking date:', e);
            }

            const approvedTimeStr = data.time || data.bookingTime || data.timeSlot || '';
            // Resolve service name for approved bookings too
            let approvedResolvedServiceName = data.service || data.serviceName || '';
            try {
              const serviceId = data.serviceId || (typeof data.service === 'string' ? data.service : null) || (data.service && data.service.id ? data.service.id : null);
              if (serviceId) {
                if (serviceCacheRef.current[serviceId]) {
                  approvedResolvedServiceName = serviceCacheRef.current[serviceId];
                } else {
                  const serviceDocRef = firestoreDoc(db, 'Services', serviceId);
                  const serviceDoc = await getDoc(serviceDocRef);
                  if (serviceDoc.exists()) {
                    const serviceData = serviceDoc.data();
                    if (serviceData && serviceData.name) {
                      approvedResolvedServiceName = serviceData.name;
                      serviceCacheRef.current[serviceId] = serviceData.name;
                      console.log('Resolved approved service from DB and cached:', serviceId, serviceData.name);
                    }
                  } else {
                    console.log('Service doc not found for approved id:', serviceId);
                  }
                }
              } else if (data.service && typeof data.service === 'object' && data.service.name) {
                approvedResolvedServiceName = data.service.name;
              }
            } catch (err) {
              console.error('Error resolving service name for approved booking', docId, err);
            }

            bookingsData.push({
              id: docId,
              ...data,
              customerName,
              createdAt: approvedCreatedAt,
              date: approvedDateISO || (data.date ? (new Date(data.date).toISOString().split('T')[0]) : undefined),
              time: approvedTimeStr,
              normalizedDate: approvedBookingDate && !Number.isNaN(approvedBookingDate.getTime()) ? approvedBookingDate.toISOString() : (approvedCreatedAt ? approvedCreatedAt.toISOString() : null)
            ,
              serviceName: approvedResolvedServiceName
            });

            console.log('Pushed approved booking id:', docId, 'normalizedDate:', bookingsData[bookingsData.length-1].normalizedDate);

            processedIds.add(docId);
          }
        }
        
        // Debug before sorting
        console.log('bookingsData length before sort:', bookingsData.length);
        console.log('bookingsData sample before sort:', bookingsData.slice(0,3));

        // Sort by normalizedDate (ISO datetime string) or createdAt fallback
        const sortedData = bookingsData.sort((a, b) => {
          const da = a.normalizedDate ? new Date(a.normalizedDate) : (a.createdAt ? new Date(a.createdAt) : new Date());
          const db = b.normalizedDate ? new Date(b.normalizedDate) : (b.createdAt ? new Date(b.createdAt) : new Date());
          return da - db;
        });

        console.log('sortedData length after sort:', sortedData.length);
        console.log('sortedData sample after sort:', sortedData.slice(0,3));
              
        setAppointments(sortedData);
        console.log('setAppointments called with length:', sortedData.length);
            console.log('Fetched bookings sample:', sortedData.slice(0, 5));
        
        // Filter today's appointments
        const today = new Date().toISOString().split('T')[0];
        const todaysAppts = sortedData.filter(appt => appt.date === today);
        setTodayAppointments(todaysAppts);

  // Calculate total unique customers (filter out falsy values)
        const uniqueCustomers = new Set(bookingsData.map(appt => appt.userEmail || appt.memberId || appt.userId).filter(Boolean)).size;
          setTotalCustomers(uniqueCustomers);

  // ดึงรีวิวสำหรับพนักงานคนนี้
        // ดึงรีวิวที่ employeeId ตรงกับ user.uid (ซึ่งตอนนี้ employeeId จะเป็น uid ของพนักงานเสมอ)
        const reviewsQuery = query(
          collection(db, 'Reviews'),
          where('employeeId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const reviewsSnapshot = await getDocs(reviewsQuery);
        const reviewData = reviewsSnapshot.docs.map(revDoc => {
          const data = revDoc.data();
          return {
            id: revDoc.id,
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

    // --- รีเฟรชข้อมูลอัตโนมัติ ---
    const interval = setInterval(() => {
      fetchData();
    }, 30000); // 30 วินาที
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentWeekStart, currentMonth, currentYear]);

  // Generate weekly schedule function
  const generateWeeklySchedule = useCallback((staffSchedules) => {
    const weekData = [];
    const days = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
    
  // หาวันจันทร์ของสัปดาห์ปัจจุบัน
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



  // Change week function
  const changeWeek = (direction) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentWeekStart(newDate);
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
          // reviewAvailable: true // ยกเลิกการใช้ reviewAvailable ใช้ canReview อย่างเดียว
        };
        
        console.log('Setting completed status with data:', updateData);
      }

      const bookingRef = firestoreDoc(db, 'Bookings', bookingId);
      await updateDoc(bookingRef, updateData);
      
      // บันทึก log เพื่อตรวจสอบ
      console.log(`Updated booking ${bookingId} with status: ${newStatus}`, updateData);

      setAppointments(appts => 
        appts.map(appt => 
          appt.id === bookingId ? { ...appt, ...updateData } : appt
        )
      );

      // เพิ่มการแจ้งเตือนเมื่ออัปเดตสำเร็จ
      addNotification(`✅ อัปเดตสถานะการจองเป็น "${newStatus}" เรียบร้อยแล้ว`, 'success');
    } catch (error) {
      console.error("Error updating booking status:", error);
      addNotification(`❌ เกิดข้อผิดพลาดในการอัปเดตสถานะ`, 'error');
    }
  };

  // ฟังก์ชันสำหรับรีเฟรชข้อมูลด้วยตัวเอง
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    addNotification('🔄 กำลังรีเฟรชข้อมูล...', 'info');
    try {
      // เรียกใช้ fetchData (ไม่ต้องส่งพารามิเตอร์)
      const fetchData = async () => {
        if (!user) return;
  
        try {
          console.log('=== FETCHING EMPLOYEE DATA ===');
          console.log('Current employee ID:', user.uid);
          
          // ดึงรายละเอียดของผู้ใช้งาน (พนักงาน)
          const userQuery = query(
            collection(db, 'artifacts/login-spa-7921d/users'),
            where('__name__', '==', user.uid)
          );
          const userSnapshot = await getDocs(userQuery);
          const userData = userSnapshot.docs[0]?.data();
          setUserName(userData?.fullname || userData?.name || 'พนักงาน');
          console.log('Employee name:', userData?.fullname || userData?.name || 'พนักงาน');
  
          // ดึงข้อมูลพนักงานจากคอลเลกชัน Staffs
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
            
            // Prefer phone from Users collection (userData) but fall back to staff record
            try {
              const phoneFromUser = userData?.phone;
              const phoneFromStaff = staffData?.phone;
              if (phoneFromUser) setEmployeePhone(phoneFromUser);
              else if (phoneFromStaff) setEmployeePhone(phoneFromStaff);
            } catch (err) {
              console.error('Error setting employee phone from staff data:', err);
            }
          } else {
            console.log('No staff data found');
            // Still set phone from user document if available
            try {
              if (userData?.phone) setEmployeePhone(userData.phone);
            } catch (err) {
              console.error('Error setting employee phone from user data:', err);
            }
          }
  
          // ดึงการจองทั้งหมดที่เกี่ยวข้องกับพนักงานคนนี้ (ไม่กรองตามสถานะ)
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
          for (const bookingDoc of bookingsSnapshot.docs) {
            const data = bookingDoc.data();
            const docId = bookingDoc.id;
            
            // จัดการกับข้อมูล timestamp อย่างปลอดภัย
            let createdAtDate = new Date();
            let bookingDate = null;
            let dateISO = null;
            let timeStr = '';
            
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
            
            // แปลงวันที่การจอง (normalize เป็น Date และ ISO string)
            const dateField = getBookingDate(data);
            try {
              if (dateField && typeof dateField.toDate === 'function') {
                bookingDate = dateField.toDate();
              } else if (dateField instanceof Date) {
                bookingDate = dateField;
              } else if (dateField) {
                bookingDate = new Date(dateField);
              }
  
              if (bookingDate && !Number.isNaN(bookingDate.getTime())) {
                dateISO = bookingDate.toISOString().split('T')[0];
              }
            } catch (e) {
              console.error('Error converting booking date:', e);
            }
  
            // Normalize time string
            timeStr = data.time || data.bookingTime || data.timeSlot || '';
            
            // ดึงชื่อลูกค้าจาก users collection
            let customerName = data.customerName || 'ลูกค้า';
            // ดึงชื่อบริการจาก Services collection ถ้ามีการเก็บเป็น serviceId หรือ service (string id)
            let resolvedServiceName = data.service || data.serviceName || '';
            try {
              const serviceId = data.serviceId || (typeof data.service === 'string' ? data.service : null) || (data.service && data.service.id ? data.service.id : null);
              if (serviceId) {
                // check cache first
                if (serviceCacheRef.current[serviceId]) {
                  resolvedServiceName = serviceCacheRef.current[serviceId];
                } else {
                  const serviceDocRef = firestoreDoc(db, 'Services', serviceId);
                  const serviceDoc = await getDoc(serviceDocRef);
                  if (serviceDoc.exists()) {
                    const serviceData = serviceDoc.data();
                    if (serviceData && serviceData.name) {
                      resolvedServiceName = serviceData.name;
                      serviceCacheRef.current[serviceId] = serviceData.name; // cache it
                      console.log('Resolved service from DB and cached:', serviceId, serviceData.name);
                    }
                  } else {
                    console.log('Service doc not found for id:', serviceId);
                  }
                }
              } else if (data.service && typeof data.service === 'object' && data.service.name) {
                resolvedServiceName = data.service.name;
              }
            } catch (err) {
              console.error('Error resolving service name for booking', docId, err);
            }
            if (data.userId) {
              try {
                const userDocRef = firestoreDoc(db, 'artifacts/login-spa-7921d/users', data.userId);
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
              // date in ISO yyyy-mm-dd for filtering/calendar
              date: dateISO || (data.date ? (new Date(data.date).toISOString().split('T')[0]) : undefined),
              // normalized time string
              time: timeStr || data.time || data.bookingTime,
              // normalizedDate as ISO datetime string for sorting
              normalizedDate: bookingDate && !Number.isNaN(bookingDate.getTime()) ? bookingDate.toISOString() : (createdAtDate ? createdAtDate.toISOString() : null)
            ,
              serviceName: resolvedServiceName
            });
            
            processedIds.add(docId); // เพิ่ม ID ที่ประมวลผลแล้ว
          }
          
          // เพิ่มข้อมูลการจองที่มีสถานะ "ยืนยันแล้ว" และยังไม่ได้กำหนดพนักงาน
          for (const approvedDoc of approvedBookingsSnapshot.docs) {
            const data = approvedDoc.data();
            const docId = approvedDoc.id;
  
            if (!processedIds.has(docId)) {
              // ดึงชื่อลูกค้าจาก users collection
              let customerName = data.customerName || 'ลูกค้า';
              if (data.userId) {
                try {
                  const userDocRef = firestoreDoc(db, 'artifacts/login-spa-7921d/users', data.userId);
                  const userDoc = await getDoc(userDocRef);
                  if (userDoc.exists()) {
                    const userData = userDoc.data();
                    customerName = userData.fullname || userData.name || userData.displayName || data.userEmail || 'ลูกค้า';
                  }
                } catch (error) {
                  console.log('Error fetching customer name:', error);
                }
              }
  
              // Normalize date/time for approved bookings as well
              let approvedCreatedAt = new Date();
              try {
                if (data.createdAt && typeof data.createdAt.toDate === 'function') approvedCreatedAt = data.createdAt.toDate();
                else if (data.createdAt instanceof Date) approvedCreatedAt = data.createdAt;
                else if (data.createdAt) approvedCreatedAt = new Date(data.createdAt);
              } catch (e) {
                console.error('Error parsing approved createdAt:', e);
              }
  
              let approvedBookingDate = null;
              let approvedDateISO = null;
              try {
                const df = getBookingDate(data);
                if (df && typeof df.toDate === 'function') approvedBookingDate = df.toDate();
                else if (df instanceof Date) approvedBookingDate = df;
                else if (df) approvedBookingDate = new Date(df);
                if (approvedBookingDate && !Number.isNaN(approvedBookingDate.getTime())) approvedDateISO = approvedBookingDate.toISOString().split('T')[0];
              } catch (e) {
                console.error('Error converting approved booking date:', e);
              }
  
              const approvedTimeStr = data.time || data.bookingTime || data.timeSlot || '';
              // Resolve service name for approved bookings too
              let approvedResolvedServiceName = data.service || data.serviceName || '';
              try {
                const serviceId = data.serviceId || (typeof data.service === 'string' ? data.service : null) || (data.service && data.service.id ? data.service.id : null);
                if (serviceId) {
                  if (serviceCacheRef.current[serviceId]) {
                    approvedResolvedServiceName = serviceCacheRef.current[serviceId];
                  } else {
                    const serviceDocRef = firestoreDoc(db, 'Services', serviceId);
                    const serviceDoc = await getDoc(serviceDocRef);
                    if (serviceDoc.exists()) {
                      const serviceData = serviceDoc.data();
                      if (serviceData && serviceData.name) {
                        approvedResolvedServiceName = serviceData.name;
                        serviceCacheRef.current[serviceId] = serviceData.name;
                        console.log('Resolved approved service from DB and cached:', serviceId, serviceData.name);
                      }
                    } else {
                      console.log('Service doc not found for approved id:', serviceId);
                    }
                  }
                } else if (data.service && typeof data.service === 'object' && data.service.name) {
                  approvedResolvedServiceName = data.service.name;
                }
              } catch (err) {
                console.error('Error resolving service name for approved booking', docId, err);
              }
  
              bookingsData.push({
                id: docId,
                ...data,
                customerName,
                createdAt: approvedCreatedAt,
                date: approvedDateISO || (data.date ? (new Date(data.date).toISOString().split('T')[0]) : undefined),
                time: approvedTimeStr,
                normalizedDate: approvedBookingDate && !Number.isNaN(approvedBookingDate.getTime()) ? approvedBookingDate.toISOString() : (approvedCreatedAt ? approvedCreatedAt.toISOString() : null)
              ,
                serviceName: approvedResolvedServiceName
              });
  
              processedIds.add(docId);
            }
          }
          
          // Sort by normalizedDate (ISO datetime string) or createdAt fallback
          const sortedData = bookingsData.sort((a, b) => {
            const da = a.normalizedDate ? new Date(a.normalizedDate) : (a.createdAt ? new Date(a.createdAt) : new Date());
            const db = b.normalizedDate ? new Date(b.normalizedDate) : (b.createdAt ? new Date(b.createdAt) : new Date());
            return da - db;
          });
                
          setAppointments(sortedData);
          
          // Filter today's appointments
          const today = new Date().toISOString().split('T')[0];
          const todaysAppts = sortedData.filter(appt => appt.date === today);
          setTodayAppointments(todaysAppts);
  
          // Calculate total unique customers (filter out falsy values)
          const uniqueCustomers = new Set(bookingsData.map(appt => appt.userEmail || appt.memberId || appt.userId).filter(Boolean)).size;
            setTotalCustomers(uniqueCustomers);
  
          // ดึงรีวิวสำหรับพนักงานคนนี้
          // ดึงรีวิวที่ employeeId ตรงกับ user.uid (ซึ่งตอนนี้ employeeId จะเป็น uid ของพนักงานเสมอ)
          const reviewsQuery = query(
            collection(db, 'Reviews'),
            where('employeeId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          const reviewsSnapshot = await getDocs(reviewsQuery);
          const reviewData = reviewsSnapshot.docs.map(revDoc => {
            const data = revDoc.data();
            return {
              id: revDoc.id,
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
      
      // เก็บจำนวนรีวิวก่อนรีเฟรช
      const reviewsCountBeforeRefresh = reviews.length;
      
      // เรียกใช้ fetchData
      await fetchData();
      
      // ตรวจสอบว่ามีรีวิวใหม่หลังรีเฟรชหรือไม่
      const newReviewsCount = reviews.length - reviewsCountBeforeRefresh;
      if (newReviewsCount > 0) {
        addNotification(`⭐ พบรีวิวใหม่ ${newReviewsCount} รายการจากการรีเฟรช`, 'success');
      } else {
        addNotification('✅ รีเฟรชข้อมูลเรียบร้อยแล้ว', 'success');
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
      addNotification('❌ เกิดข้อผิดพลาดในการรีเฟรชข้อมูล', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('คุณต้องการออกจากระบบหรือไม่?')) {
      try {
        addNotification('กำลังออกจากระบบ...', 'info');
        await logout();
        navigate('/login');
      } catch (error) {
        console.error('Error logging out:', error);
        addNotification('❌ เกิดข้อผิดพลาดในการออกจากระบบ', 'error');
      }
    }
  };

  useEffect(() => {
    console.log('Appointments:', appointments);
    
    if (appointments.length > 0) {
      // ตรวจสอบการจองที่มีวันที่วันนี้
      const today = new Date().toISOString().split('T')[0];
      const todayAppts = appointments.filter(appt => appt.date === today && appt.status === 'ยืนยันแล้ว');
      
      if (todayAppts.length > 0) {
        addNotification(`📅 มีการจอง ${todayAppts.length} รายการในวันนี้`, 'info');
      }
    }
  }, [appointments]);
  
  // ตรวจสอบการเปลี่ยนแปลงของรีวิว
  useEffect(() => {
    // ตรวจสอบว่ามีรีวิวใหม่หรือไม่
    if (reviews.length > 0 && prevReviewsCount > 0 && reviews.length > prevReviewsCount) {
      const newReviewsCount = reviews.length - prevReviewsCount;
      const latestReview = reviews[0]; // รีวิวล่าสุดจะอยู่บนสุดเพราะมีการเรียงลำดับโดยวันที่ล่าสุด

      // แจ้งเตือนว่ามีรีวิวใหม่
      if (newReviewsCount === 1) {
        addNotification(
          `⭐ คุณได้รับรีวิวใหม่ ${latestReview.rating} ดาว จากคุณ${latestReview.customerName}`,
          'success'
        );
      } else if (newReviewsCount > 1) {
        addNotification(
          `⭐ คุณได้รับ ${newReviewsCount} รีวิวใหม่`,
          'success'
        );
      }
    }
    
    // อัปเดตจำนวนรีวิวเพื่อใช้เปรียบเทียบในครั้งต่อไป
    setPrevReviewsCount(reviews.length);
    
    // แจ้งเตือนครั้งแรกที่โหลดเพจ ถ้ามีรีวิว
    if (prevReviewsCount === 0 && reviews.length > 0) {
      addNotification(`⭐ คุณมีรีวิวทั้งหมด ${reviews.length} รายการ และคะแนนเฉลี่ย ${averageRating}`, 'info');
    }
  }, [reviews, prevReviewsCount, averageRating]);

  return (
    <div className="d-flex vh-100 bg-light">
      {/* Add FontAwesome CDN */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" 
        integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" 
        crossOrigin="anonymous" referrerPolicy="no-referrer" />
      
      <style>
        {`
          /* Make appointment filter buttons stand out with shadow and strong border */
          /* ...existing code... */
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
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
          }
          
          .collapse-btn:hover {
            background: #ff7730;
            color: white;
            transform: scale(1.1);
          }

          /* Modal card header style for selected appointment modal */
          .modal-card-header {
            background: linear-gradient(135deg, #3b2208 0%, #2b1706 100%); /* dark brown */
            color: #ffffff !important; /* white text */
            border-bottom: 3px solid #ff7730;
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
                  onClick={() => navigate('/employee/EmployeeProfile')}
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
        {/* ปุ่มแจ้งเตือน */}
        <div className="notification-container" style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999 }}>
          <button 
            className="notification-button btn" 
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ 
              backgroundColor: '#ff7730', 
              color: 'white',
              borderRadius: '50%', 
              width: '48px', 
              height: '48px',
              display: 'flex',
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
              position: 'relative'
            }}
          >
            <i className="fas fa-bell"></i>
            {unreadCount > 0 && (
              <span style={{ 
                position: 'absolute', 
                top: '-5px', 
                right: '-5px',
                background: 'red',
                color: 'white',
                borderRadius: '50%',
                minWidth: '18px',
                height: '18px',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}>
                {unreadCount}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <div 
              className="notifications-dropdown" 
              style={{
                position: 'absolute',
                top: '60px',
                right: '0',
                width: '350px',
                maxHeight: '400px',
                overflowY: 'auto',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0px 8px 20px rgba(0, 0, 0, 0.15)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                zIndex: 9999
              }}
            >
              <div className="notification-header" style={{ 
                padding: '12px 16px', 
                background: 'linear-gradient(135deg, #ff9900 0%, #ff7730 100%)',
                color: 'white',
                borderTopLeftRadius: '12px',
                borderTopRightRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h6 style={{ margin: 0, fontWeight: 'bold' }}>
                  <i className="fas fa-bell me-2"></i> การแจ้งเตือน
                </h6>
                <div>
                  <button 
                    className="btn btn-sm text-white" 
                    onClick={markAllAsRead}
                    style={{ fontSize: '0.8rem', padding: '2px 8px' }}
                  >
                    <i className="fas fa-check-double"></i> อ่านทั้งหมด
                  </button>
                  <button 
                    className="btn btn-sm text-white ms-1" 
                    onClick={clearNotifications}
                    style={{ fontSize: '0.8rem', padding: '2px 8px' }}
                  >
                    <i className="fas fa-trash"></i> ล้างทั้งหมด
                  </button>
                </div>
              </div>
              
              <div className="notification-body" style={{ padding: '0', maxHeight: '320px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="fas fa-bell-slash mb-2" style={{ fontSize: '1.5rem', color: '#6c757d' }}></i>
                    <p className="text-muted mb-0">ไม่มีการแจ้งเตือนใหม่</p>
                  </div>
                ) : (
                  notifications.map(notification => (
                    <div 
                      key={notification.id}
                      className="notification-item"
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #eee',
                        backgroundColor: notification.read ? '#fff' : 'rgba(255, 119, 48, 0.05)',
                        position: 'relative',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div className="d-flex align-items-start">
                        <div className="notification-icon me-3" style={{ marginTop: '2px' }}>
                          {notification.type === 'success' && <i className="fas fa-check-circle" style={{ color: '#28a745' }}></i>}
                          {notification.type === 'error' && <i className="fas fa-exclamation-circle" style={{ color: '#dc3545' }}></i>}
                          {notification.type === 'info' && <i className="fas fa-info-circle" style={{ color: '#17a2b8' }}></i>}
                          {notification.type === 'warning' && <i className="fas fa-exclamation-triangle" style={{ color: '#ffc107' }}></i>}
                        </div>
                        <div className="notification-content" style={{ flex: 1 }}>
                          <div className="notification-message" style={{ fontSize: '0.9rem' }}>{notification.message}</div>
                          <div className="notification-time" style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '4px' }}>
                            <i className="fas fa-clock me-1"></i> {notification.time}
                          </div>
                        </div>
                      </div>
                      {!notification.read && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#ff7730'
                          }}
                        ></span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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
                      <span>{employeePhone || employeeData?.phone || 'ไม่ระบุเบอร์โทร'}</span>
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
                      className="btn btn-sm week-nav-btn"
                      onClick={(e) => {
                        // Create ripple element
                        const ripple = document.createElement('span');
                        ripple.classList.add('btn-ripple');
                        ripple.style.position = 'absolute';
                        ripple.style.top = e.nativeEvent.offsetY + 'px';
                        ripple.style.left = e.nativeEvent.offsetX + 'px';
                        ripple.style.width = '5px';
                        ripple.style.height = '5px';
                        ripple.style.background = 'rgba(255, 255, 255, 0.5)';
                        ripple.style.borderRadius = '50%';
                        ripple.style.transform = 'translate(-50%, -50%)';
                        ripple.style.animation = 'buttonRipple 0.6s ease';
                        e.currentTarget.appendChild(ripple);
                        
                        // Remove ripple after animation
                        setTimeout(() => {
                          ripple.remove();
                        }, 600);
                        
                        changeWeek(-1);
                      }}
                      style={{
                        backgroundColor: 'transparent',
                        color: '#ff7730',
                        border: '1px solid #ff7730',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 119, 48, 0.1)';
                        e.currentTarget.querySelector('i').style.transform = 'translateX(-3px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.querySelector('i').style.transform = 'translateX(0)';
                      }}
                    >
                      <i className="fas fa-chevron-left me-1" style={{ transition: 'transform 0.3s ease' }}></i>
                      สัปดาห์ก่อน
                    </button>
                    <button 
                      className="btn btn-sm week-nav-btn"
                      onClick={(e) => {
                        // Create ripple element
                        const ripple = document.createElement('span');
                        ripple.classList.add('btn-ripple');
                        ripple.style.position = 'absolute';
                        ripple.style.top = e.nativeEvent.offsetY + 'px';
                        ripple.style.left = e.nativeEvent.offsetX + 'px';
                        ripple.style.width = '5px';
                        ripple.style.height = '5px';
                        ripple.style.background = 'rgba(255, 255, 255, 0.5)';
                        ripple.style.borderRadius = '50%';
                        ripple.style.transform = 'translate(-50%, -50%)';
                        ripple.style.animation = 'buttonRipple 0.6s ease';
                        e.currentTarget.appendChild(ripple);
                        
                        // Remove ripple after animation
                        setTimeout(() => {
                          ripple.remove();
                        }, 600);
                        
                        changeWeek(1);
                      }}
                      style={{
                        backgroundColor: 'transparent',
                        color: '#ff7730',
                        border: '1px solid #ff7730',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 119, 48, 0.1)';
                        e.currentTarget.querySelector('i').style.transform = 'translateX(3px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.querySelector('i').style.transform = 'translateX(0)';
                      }}
                    >
                      สัปดาห์หน้า
                      <i className="fas fa-chevron-right ms-1" style={{ transition: 'transform 0.3s ease' }}></i>
                    </button>
                  </div>

                  {/* Refresh Button */}
                  <button 
                    className="btn btn-sm" 
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    style={{
                      backgroundColor: 'rgba(255, 119, 48, 0.1)',
                      color: '#ff7730',
                      border: '1px solid #ff7730',
                      borderRadius: '20px',
                      padding: '5px 15px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                    title="รีเฟรชข้อมูล"
                  >
                    {isRefreshing ? (
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
                        {/* คอลัมน์การดำเนินการ ถูกนำออกตามคำขอ */}
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
                            {/* คอลัมน์การดำเนินการ ถูกนำออกตามคำขอ */}
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
                      className={`filter-btn-all btn me-2 ${appointmentFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setAppointmentFilter('all')}
                    >
                      <i className="fas fa-list me-1"></i>
                      ทั้งหมด
                    </button>
                    <button 
                      type="button" 
                      className={`filter-btn-ongoing btn me-2 ${appointmentFilter === 'ongoing' ? 'active' : ''}`}
                      onClick={() => setAppointmentFilter('ongoing')}
                    >
                      <i className="fas fa-clock me-1"></i>
                      กำลังจอง
                    </button>
                    <button 
                      type="button" 
                      className={`filter-btn-completed btn me-2 ${appointmentFilter === 'completed' ? 'active' : ''}`}
                      onClick={() => setAppointmentFilter('completed')}
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
                  
                  {/* Refresh Button */}
                  <button 
                    className="btn btn-sm" 
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    style={{
                      backgroundColor: 'rgba(255, 119, 48, 0.1)',
                      color: '#ff7730',
                      border: '1px solid #ff7730',
                      borderRadius: '20px',
                      padding: '5px 15px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                    title="รีเฟรชข้อมูล"
                  >
                    {isRefreshing ? (
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
                                { (booking.memberId || booking.userId || booking.userEmail) ? `ID: ${((booking.memberId || booking.userId || booking.userEmail).toString()).substring(0, 12)}...` : 'ไม่มีข้อมูล' }
                              </small>
                            </div>
                          </div>
                          {getStatusBadge(booking.status)}
                        </div>
                        
                        <div className="mb-3">
                          <div className="d-flex align-items-center mb-2">
                            <i className="fas fa-spa me-2" style={{ color: '#28a745', width: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}></i>
                            <span className="fw-bold text-success">{booking.service || booking.serviceName || booking.serviceType || booking.service?.name || booking.service?.title || booking.serviceName?.name || 'บริการสปา'}</span>
                          </div>
                          <div className="d-flex align-items-center mb-2">
                            <i className="fas fa-calendar me-2" style={{ color: '#ff7730', width: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}></i>
                            <span className="text-dark">{(() => {
                              try {
                                // Prefer normalized booking.date (ISO yyyy-mm-dd) then fallback
                                const preferred = booking.date || getBookingDate(booking);
                                if (preferred && typeof preferred.toDate === 'function') {
                                  return new Date(preferred.toDate()).toLocaleDateString('th-TH');
                                } else if (preferred instanceof Date) {
                                  return preferred.toLocaleDateString('th-TH');
                                } else if (typeof preferred === 'string' && preferred) {
                                  return new Date(preferred).toLocaleDateString('th-TH');
                                } else {
                                  return 'ไม่ระบุวันที่';
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
                <div className="d-flex align-items-center gap-3">
                  <div className="star-rating me-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <i 
                        key={star} 
                        className={`fas fa-star ${star <= Math.round(averageRating) ? 'text-warning' : 'text-white-50'}`}
                      ></i>
                    ))}
                  </div>
                  <span className="badge-custom" style={{ background: '#ffc107', color: '#2c2c2c' }}>{averageRating} / 5.0</span>
                  
                  {/* Refresh Button */}
                  <button 
                    className="btn btn-sm" 
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    style={{
                      backgroundColor: 'rgba(255, 119, 48, 0.1)',
                      color: '#ff7730',
                      border: '1px solid #ff7730',
                      borderRadius: '20px',
                      padding: '5px 15px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                    title="รีเฟรชข้อมูล"
                  >
                    {isRefreshing ? (
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
                        
                        {/* ปุ่มลิงก์ไปยังการจอง ถูกนำออกตามคำขอ */}
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
          style={{ backgroundColor: 'rgba(74, 31, 1, 0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedAppointment(null);
            }
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: '15px', border: 'none' }}>
              <div className="modal-header" style={{ 
                background: 'linear-gradient(135deg, #542e00ff 0%, #1a1a1a 100%)', 
                color: 'white',
                borderTopLeftRadius: '15px',
                borderTopRightRadius: '15px',
                borderBottom: '3px solid #ff7730'
              }}>
                <h5 className="modal-title">
                  <i className="fas fa-calendar-check me-2" style={{ color: '#ffffffff' }}></i>
                  รายละเอียดการจอง
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={() => setSelectedAppointment(null)}
                ></button>
              </div>
              <div className="modal-body p-4">
                {/* Preview card: show the same compact appointment card inside the modal */}
                <div className="mb-4">
                  <div className="stats-card h-100" style={{ border: '1px solid #e9ecef', padding: '1rem' }}>
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
                          {selectedAppointment.customerName ? selectedAppointment.customerName.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div>
                          <h6 className="mb-1 fw-bold" style={{ marginBottom: 0 }}>{selectedAppointment.customerName || 'ลูกค้า'}</h6>
                          <small className="text-muted">{ (selectedAppointment.memberId || selectedAppointment.userId || selectedAppointment.userEmail) ? `ID: ${((selectedAppointment.memberId || selectedAppointment.userId || selectedAppointment.userEmail).toString()).substring(0, 12)}...` : 'ไม่มีข้อมูล' }</small>
                        </div>
                      </div>
                      <div>
                        {getStatusBadge(selectedAppointment.status)}
                      </div>
                    </div>

                    <div className="mb-2">
                      <div className="d-flex align-items-center mb-2">
                        <i className="fas fa-spa me-2" style={{ color: '#28a745', width: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}></i>
                        <span className="fw-bold text-success">{selectedAppointment.serviceName || selectedAppointment.service || selectedAppointment.serviceType || 'บริการสปา'}</span>
                      </div>
                      <div className="d-flex align-items-center mb-2">
                        <i className="fas fa-calendar me-2" style={{ color: '#ff7730', width: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}></i>
                        <span className="text-dark">{selectedAppointment.date || 'ไม่ระบุวันที่'}</span>
                      </div>
                      <div className="d-flex align-items-center">
                        <i className="fas fa-clock me-2" style={{ color: '#ff7730', width: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}></i>
                        <span className="text-dark">{selectedAppointment.time || selectedAppointment.bookingTime || 'ไม่ระบุเวลา'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row g-4">
                  {/* ข้อมูลลูกค้า */}
                  <div className="col-md-6">
                    <div className="card h-100" style={{ border: '1px solid #e9ecef', borderRadius: '10px' }}>
                      <div className="card-header modal-card-header">
                        <h6 className="mb-0">
                          <i className="fas fa-user me-2" style={{ color: '#ffffffff' }}></i>
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
                              ID: {(selectedAppointment.memberId || selectedAppointment.userId || selectedAppointment.userEmail) ? ((selectedAppointment.memberId || selectedAppointment.userId || selectedAppointment.userEmail).toString()).substring(0, 20) : 'ไม่มีข้อมูล'}
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ข้อมูลการจอง */}
                  <div className="col-md-6">
                    <div className="card h-100" style={{ border: '1px solid #e9ecef', borderRadius: '10px' }}>
                      <div className="card-header modal-card-header">
                        <h6 className="mb-0">
                          <i className="fas fa-spa me-2" style={{ color: '#ffffffff' }}></i>
                          ข้อมูลบริการ
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="mb-3">
                          <label className="form-label text-muted">บริการ</label>
                          <p className="fw-bold text-success mb-2">{selectedAppointment.service || selectedAppointment.serviceName || selectedAppointment.serviceType || selectedAppointment.service?.name || selectedAppointment.service?.title || 'บริการสปา'}</p>
                        </div>
                        <div className="row g-3">
                          <div className="col-6">
                            <label className="form-label text-muted">วันที่</label>
                            <p className="mb-2">{(() => {
                              try {
                                const preferred = selectedAppointment.date || getBookingDate(selectedAppointment);
                                if (preferred && typeof preferred.toDate === 'function') {
                                  return new Date(preferred.toDate()).toLocaleDateString('th-TH');
                                } else if (preferred instanceof Date) {
                                  return preferred.toLocaleDateString('th-TH');
                                } else if (typeof preferred === 'string' && preferred) {
                                  return new Date(preferred).toLocaleDateString('th-TH');
                                } else {
                                  return 'ไม่ระบุ';
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
                      <div className="card-header modal-card-header">
                        <h6 className="mb-0">
                          <i className="fas fa-info-circle me-2" style={{ color: '#ffffffff' }}></i>
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

