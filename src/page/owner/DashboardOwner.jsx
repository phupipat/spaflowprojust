import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import ServiceManager from './ServiceManager';
import StaffSchedule from './StaffSchedule';
import MemberSettings from './MemberSettings';
import UserApproval from './UserApproval';
import PromotionAdd from './PromotionAdd';
import PaymentReport from './PaymentReport';
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../Firebase';
import '../../styles/SharedStyles.css';
import '../../styles/DashboardStyles.css';

function DashboardOwner() {
  const navigate = useNavigate();
  const [searchBookingId, setSearchBookingId] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [active, setActive] = useState('bookings');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pendingCount, setPendingCount] = useState(0);
  const [userProfileData, setUserProfileData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  // สถิติเชิงธุรกิจ
  const [stats, setStats] = useState({
    todayRevenue: 0,
    monthRevenue: 0,
    paymentChannels: {},
    todayBookings: 0,
    todayCustomers: 0
  });
  const [chartData, setChartData] = useState({
    dailyBookings: [], // [{date: '2025-08-01', count: 5}, ...]
    popularServices: [], // [{service: 'Thai Massage', count: 15}, ...]
    monthlyTrend: [] // [{month: '2025-01', count: 45}, ...]
  });
  const [chartSettings, setChartSettings] = useState({
    viewType: 'daily', // 'daily' or 'monthly'
    dateRange: {
      start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    }
  });
  // เพิ่ม state สำหรับปฏิทิน
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' หรือ 'bookings'
  
  // หมวดหมู่เมนู
  const menuCategories = [
    {
      title: "จัดการร้าน",
      icon: "store",
      items: [
        { id: "bookings", label: "ดูการจองทั้งหมด", icon: "calendar-check" },
        { id: "services", label: "จัดการบริการ", icon: "spa" },
        { id: "promotion", label: "จัดการโปรโมชั่น", icon: "tags" }
      ]
    },
    {
      title: "จัดการบุคลากร",
      icon: "users",
      items: [
        { id: "staff", label: "ตั้งเวลาพนักงาน", icon: "user-clock" },
        { id: "members", label: "ตั้งค่าระบบสมาชิก", icon: "users-cog" },
        { id: "approvals", label: "อนุมัติผู้ใช้", icon: "user-check" }
      ]
    },
    {
      title: "รายงาน",
      icon: "chart-line",
      items: [
        { id: "report", label: "แดชบอร์ด", icon: "chart-line" },
        { id: "payment-report", label: "รายงานการชำระเงิน", icon: "cash-register" }
      ]
    }
  ];
  
  useEffect(() => {
    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    // Responsive sidebar handler
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };
    
    // Listen for window resize
    window.addEventListener('resize', handleResize);
    
    // Fetch current user information
    const fetchCurrentUser = async () => {
      try {
        const auth = getAuth();
        
        onAuthStateChanged(auth, async (user) => {
          if (user) {
            // ผู้ใช้ล็อกอินอยู่ ดึงข้อมูลเพิ่มเติมจาก Firestore
            try {
              const userDocRef = doc(db, 'artifacts/login-spa-7921d/users', user.uid);
              const userDoc = await getDoc(userDocRef);
              
              if (userDoc.exists()) {
                setUserProfileData({
                  uid: user.uid,
                  email: user.email,
                  ...userDoc.data()
                });
              }
            } catch (error) {
              console.error('Error fetching user data:', error);
            }
          } else {
            // ถ้าไม่มีผู้ใช้ล็อกอิน ให้กลับไปที่หน้า login
            navigate('/login');
          }
        });
      } catch (error) {
        console.error('Error checking authentication:', error);
      }
    };
    
    // Fetch pending approvals count
    const fetchPendingCount = async () => {
      try {
        const usersRef = collection(db, 'artifacts/login-spa-7921d/users');
        const pendingQuery = query(usersRef, where('status', '==', 'pending'));
        const pendingSnapshot = await getDocs(pendingQuery);
        
        setPendingCount(pendingSnapshot.size);
      } catch (error) {
        console.error('Error fetching pending count:', error);
      }
    };

    // Fetch bookings data
    const fetchBookings = async () => {
      setLoadingBookings(true);
      try {
        console.log('=== FETCHING BOOKINGS DEBUG ===');
        console.log('Database instance:', db);
        
        // ตรวจสอบทั้ง collection ที่เป็นไปได้และใช้ real-time listener
        const possibleCollectionNames = ['Bookings', 'bookings', 'booking', 'bookings_spa', 'appointments'];
        let bookingsData = [];
        let foundCollection = false;
        
        for (const collectionName of possibleCollectionNames) {
          try {
            console.log(`Trying collection name: ${collectionName}`);
            const collectionRef = collection(db, collectionName);
            const snapshot = await getDocs(collectionRef);
            console.log(`Collection ${collectionName} size:`, snapshot.size);
            
            if (snapshot.size > 0) {
              foundCollection = true;
              
              // แปลงข้อมูลจาก Firebase
              const data = snapshot.docs.map(doc => {
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
                
                return {
                  id: docId,
                  ...data,
                  createdAt: createdAtDate,
                  normalizedDate: bookingDate // เพิ่มฟิลด์สำหรับใช้กรอง
                };
              });
              
              bookingsData = [...bookingsData, ...data];
              
              // ตั้ง real-time listener สำหรับ collection นี้
              const unsubscribe = onSnapshot(collectionRef, (snapshot) => {
                console.log(`Real-time update from ${collectionName}, changes:`, snapshot.docChanges().length);
                
                snapshot.docChanges().forEach(change => {
                  const docData = change.doc.data();
                  const docId = change.doc.id;
                  
                  // แปลงวันที่เหมือนข้างบน
                  let createdAtDate = new Date();
                  let bookingDate = null;
                  
                  try {
                    if (docData.createdAt && typeof docData.createdAt.toDate === 'function') {
                      createdAtDate = docData.createdAt.toDate();
                    } else if (docData.createdAt instanceof Date) {
                      createdAtDate = docData.createdAt;
                    } else if (docData.createdAt) {
                      createdAtDate = new Date(docData.createdAt);
                    }
                  } catch (e) {}
                  
                  const dateField = getBookingDate(docData);
                  try {
                    if (dateField && typeof dateField.toDate === 'function') {
                      bookingDate = dateField.toDate();
                    } else if (dateField instanceof Date) {
                      bookingDate = dateField;
                    } else if (dateField) {
                      bookingDate = new Date(dateField);
                    }
                  } catch (e) {}
                  
                  const formattedData = {
                    id: docId,
                    ...docData,
                    createdAt: createdAtDate,
                    normalizedDate: bookingDate
                  };
                  
                  // อัปเดต state ตามประเภทการเปลี่ยนแปลง
                  if (change.type === 'added') {
                    console.log('New booking added:', docId);
                    setBookings(prev => {
                      // ตรวจสอบว่ามีอยู่แล้วหรือไม่
                      const exists = prev.some(booking => booking.id === docId);
                      if (!exists) {
                        return [formattedData, ...prev];
                      }
                      return prev;
                    });
                  } else if (change.type === 'modified') {
                    console.log('Booking modified:', docId);
                    setBookings(prev => 
                      prev.map(booking => 
                        booking.id === docId ? formattedData : booking
                      )
                    );
                  } else if (change.type === 'removed') {
                    console.log('Booking removed:', docId);
                    setBookings(prev => prev.filter(booking => booking.id !== docId));
                  }
                });
              });
              
              // เก็บ unsubscribe function ไว้ใช้ตอน cleanup
              console.log(`Set up real-time listener for ${collectionName}`);
            }
          } catch (err) {
            console.log(`Error accessing collection ${collectionName}:`, err.message);
          }
        }
        
        if (!foundCollection || bookingsData.length === 0) {
          console.log('No bookings found in any collection');
          setBookings([]);
          return;
        }
        
        // เรียงข้อมูลตามวันที่สร้าง (ใหม่สุดขึ้นก่อน)
        const sortedBookings = bookingsData.sort((a, b) => b.createdAt - a.createdAt);
        
        console.log('Total bookings found:', sortedBookings.length);
        setBookings(sortedBookings);
        
        // เพิ่มข้อมูลสรุปสำหรับ debug
        const statusCounts = sortedBookings.reduce((acc, booking) => {
          acc[booking.status || 'unknown'] = (acc[booking.status || 'unknown'] || 0) + 1;
          return acc;
        }, {});
        console.log('Booking status summary:', statusCounts);
      } catch (error) {
        console.error('Error fetching bookings:', error);
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: error.stack
        });
        alert('เกิดข้อผิดพลาดในการดึงข้อมูลการจอง กรุณาลองใหม่อีกครั้ง');
        setBookings([]);
      } finally {
        setLoadingBookings(false);
      }
    };
    
    fetchCurrentUser();
    fetchPendingCount();
    fetchBookings();

    // Set up interval to refresh pending count every 5 minutes
    const pendingTimer = setInterval(fetchPendingCount, 5 * 60 * 1000);
    // Set up interval to refresh bookings every 2 minutes
    const bookingsTimer = setInterval(fetchBookings, 2 * 60 * 1000);

    return () => {
      clearInterval(timer);
      clearInterval(pendingTimer);
      clearInterval(bookingsTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // เพิ่ม useEffect สำหรับ debug ข้อมูล
  useEffect(() => {
    console.log('=== DEBUG INFO ===');
    console.log('Total bookings:', bookings.length);
    console.log('Current month:', currentMonth);
    console.log('Selected date:', selectedDate);
    console.log('View mode:', viewMode);
    if (bookings.length > 0) {
      console.log('Sample booking:', bookings[0]);
      console.log('Booking dates sample:', bookings.slice(0, 3).map(b => ({ id: b.id, date: b.date, service: b.service })));
    }
    console.log('==================');
  }, [bookings, currentMonth, selectedDate, viewMode]);

  // คำนวณสถิติเชิงธุรกิจเมื่อ bookings เปลี่ยน
  useEffect(() => {
    const fetchPaymentsAndUpdateStats = async () => {
      if (!bookings || bookings.length === 0) {
        setStats({
          todayRevenue: 0,
          monthRevenue: 0,
          paymentChannels: { cash: 0, transfer: 0, credit: 0 },
          todayBookings: 0,
          todayCustomers: 0
        });
        setChartData({
          dailyBookings: [],
          popularServices: [],
          monthlyTrend: []
        });
        return;
      }

      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const monthStr = now.toISOString().slice(0, 7);
      let todayRevenue = 0;
      let monthRevenue = 0;
      let paymentChannels = { cash: 0, transfer: 0, credit: 0 };
      let todayBookings = 0;
      let todayCustomersSet = new Set();

      // สำหรับแผนภูมิ
      const dailyBookingsMap = {};
      const serviceCountMap = {};
      const monthlyBookingsMap = {};
      const paymentDetailsMap = {}; // เก็บข้อมูลการชำระเงินตาม bookingId

      // ดึงข้อมูลการชำระเงินจาก Payments collection
      try {
        const paymentsCollection = collection(db, 'Payments');
        const paymentsSnapshot = await getDocs(paymentsCollection);
        
        if (!paymentsSnapshot.empty) {
          // สร้าง map ของข้อมูลการชำระเงินตาม bookingId
          paymentsSnapshot.docs.forEach(doc => {
            const paymentData = doc.data();
            if (paymentData.bookingId) {
              paymentDetailsMap[paymentData.bookingId] = {
                amount: Number(paymentData.amount || paymentData.totalAmount || 0),
                paymentMethod: paymentData.paymentMethod || 'cash',
                paymentStatus: paymentData.paymentStatus || 'รอชำระเงิน',
                paymentDate: paymentData.paymentDate || paymentData.paidAt || null
              };
            }
          });
          
          console.log('Payment details loaded:', Object.keys(paymentDetailsMap).length);
        } else {
          console.log('No payment records found');
        }
      } catch (error) {
        console.error('Error fetching payments data:', error);
      }

      bookings.forEach(b => {
        // หาข้อมูลการชำระเงินที่เกี่ยวข้อง
        const paymentInfo = paymentDetailsMap[b.id] || {};
        const isPaid = b.paymentStatus === 'ชำระเงินแล้ว' || paymentInfo.paymentStatus === 'ชำระเงินแล้ว';
        const bookingAmount = paymentInfo.amount || Number(b.price || b.totalAmount || 0);
        const paymentMethod = paymentInfo.paymentMethod || b.paymentMethod || 'cash';

        // เฉพาะที่ชำระเงินแล้ว
        if (isPaid) {
          // รายได้วันนี้
          const dateField = getBookingDate(b);
          if (dateField) {
            let bookingDate;
            
            try {
              if (typeof dateField === 'string') {
                bookingDate = new Date(dateField);
              } else if (dateField.toDate && typeof dateField.toDate === 'function') {
                bookingDate = dateField.toDate();
              } else if (dateField instanceof Date) {
                bookingDate = dateField;
              }
            } catch (e) {
              console.error('Error parsing booking date:', e);
              return;
            }
            
            const bookingDateStr = bookingDate.toISOString().slice(0, 10);
            const bookingMonthStr = bookingDate.toISOString().slice(0, 7);
            
            if (bookingDateStr === todayStr) {
              todayRevenue += bookingAmount;
              todayBookings += 1;
              if (b.userEmail) todayCustomersSet.add(b.userEmail);
              if (b.userId) todayCustomersSet.add(b.userId);
              if (b.customerEmail) todayCustomersSet.add(b.customerEmail);
            }
            
            if (bookingMonthStr === monthStr) {
              monthRevenue += bookingAmount;
            }
          }
          
          // รายรับแยกช่องทาง
          if (paymentChannels[paymentMethod] !== undefined) {
            paymentChannels[paymentMethod] += bookingAmount;
          }
        }

        // ข้อมูลสำหรับแผนภูมิ (ทุกสถานะ)
        const dateField = getBookingDate(b);
        if (dateField) {
          let bookingDate;
          
          try {
            if (typeof dateField === 'string') {
              bookingDate = new Date(dateField);
            } else if (dateField.toDate && typeof dateField.toDate === 'function') {
              bookingDate = dateField.toDate();
            } else if (dateField instanceof Date) {
              bookingDate = dateField;
            }
          } catch (e) {
            console.error('Error parsing booking date for chart:', e);
            return;
          }
          
          const dateStr = bookingDate.toISOString().slice(0, 10);
          const monthStr = bookingDate.toISOString().slice(0, 7);
          
          // กรองตามช่วงวันที่ที่เลือก
          if (dateStr >= chartSettings.dateRange.start && dateStr <= chartSettings.dateRange.end) {
            // นับการจองต่อวัน
            dailyBookingsMap[dateStr] = (dailyBookingsMap[dateStr] || 0) + 1;
          }
          
          // นับการจองต่อเดือน
          monthlyBookingsMap[monthStr] = (monthlyBookingsMap[monthStr] || 0) + 1;
        }

        // นับบริการยอดนิยม (กรองตามช่วงวันที่)
        const service = b.service || b.serviceName;
        if (service && dateField) {
          let bookingDate;
          
          try {
            if (typeof dateField === 'string') {
              bookingDate = new Date(dateField);
            } else if (dateField.toDate && typeof dateField.toDate === 'function') {
              bookingDate = dateField.toDate();
            } else if (dateField instanceof Date) {
              bookingDate = dateField;
            }
          } catch (e) {
            console.error('Error parsing booking date for service count:', e);
            return;
          }
          
          const dateStr = bookingDate.toISOString().slice(0, 10);
          if (dateStr >= chartSettings.dateRange.start && dateStr <= chartSettings.dateRange.end) {
            serviceCountMap[service] = (serviceCountMap[service] || 0) + 1;
          }
        }
      });

      // แปลงเป็นรูปแบบสำหรับแผนภูมิ
      const dailyBookings = Object.entries(dailyBookingsMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      const popularServices = Object.entries(serviceCountMap)
        .map(([service, count]) => ({ service, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // 5 บริการยอดนิยม

      const monthlyTrend = Object.entries(monthlyBookingsMap)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => new Date(a.month) - new Date(b.month))
        .slice(-6); // 6 เดือนล่าสุด

      setStats({
        todayRevenue,
        monthRevenue,
        paymentChannels,
        todayBookings,
        todayCustomers: todayCustomersSet.size
      });

      setChartData({
        dailyBookings,
        popularServices,
        monthlyTrend
      });
      
      console.log('Stats updated with payment data:', {
        todayRevenue,
        monthRevenue,
        paymentChannels,
        bookings: todayBookings,
        customers: todayCustomersSet.size
      });
    };

    fetchPaymentsAndUpdateStats();
  }, [bookings, chartSettings.dateRange]);

  // Handle clicking outside of sidebar on mobile to close it
  const handleOverlayClick = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };
  
  // Function to refresh pending approvals count
  const refreshPendingCount = async () => {
    try {
      const usersRef = collection(db, 'artifacts/login-spa-7921d/users');
      const pendingQuery = query(usersRef, where('status', '==', 'pending'));
      const pendingSnapshot = await getDocs(pendingQuery);
      
      setPendingCount(pendingSnapshot.size);
      return pendingSnapshot.size;
    } catch (error) {
      console.error('Error fetching pending count:', error);
      return 0;
    }
  };
  
  // ฟังก์ชันสำหรับออกจากระบบ
  const handleLogout = async () => {
    if (!window.confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) return;
    try {
      const auth = getAuth();
      await signOut(auth);
      // หลังจาก logout สำเร็จ ให้นำทางกลับไปที่หน้า login
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      alert('เกิดข้อผิดพลาดในการออกจากระบบ โปรดลองอีกครั้ง');
    }
  };

  // ฟังก์ชันสำหรับไปยังหน้าโปรไฟล์
  const goToProfile = () => {
    navigate('/owner/profile');
  };

  // ฟังก์ชันสำหรับไปยังหน้าตั้งค่าระบบ
  const goToSettings = () => {
    navigate('/owner/settings');
  };

  // ฟังก์ชันอนุมัติการจอง
  const approveBooking = async (bookingId) => {
    try {
      const bookingRef = doc(db, 'Bookings', bookingId);
      await updateDoc(bookingRef, {
        status: 'ยืนยันแล้ว',
        paymentStatus: 'ชำระเงินแล้ว',
        approvedAt: new Date()
      });
      // อัปเดต state
      setBookings(bookings.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: 'ยืนยันแล้ว', paymentStatus: 'ชำระเงินแล้ว', approvedAt: new Date() }
          : booking
      ));
      alert('อนุมัติการจองและยืนยันการชำระเงินเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error approving booking:', error);
      alert('เกิดข้อผิดพลาดในการอนุมัติการจอง');
    }
  };

  // ฟังก์ชันปฏิเสธการจอง
  const rejectBooking = async (bookingId) => {
    if (!window.confirm('ต้องการปฏิเสธการจองนี้ใช่หรือไม่?')) return;
    
    try {
      const bookingRef = doc(db, 'Bookings', bookingId);
      await updateDoc(bookingRef, {
        status: 'ปฏิเสธ',
        rejectedAt: new Date()
      });
      
      // อัปเดต state
      setBookings(bookings.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: 'ปฏิเสธ', rejectedAt: new Date() }
          : booking
      ));
      
      alert('ปฏิเสธการจองเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error rejecting booking:', error);
      alert('เกิดข้อผิดพลาดในการปฏิเสธการจอง');
    }
  };

  // ฟังก์ชันลบการจอง
  const deleteBooking = async (bookingId) => {
    if (!window.confirm('ต้องการลบการจองนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถยกเลิกได้')) return;
    
    try {
      const bookingRef = doc(db, 'Bookings', bookingId);
      await deleteDoc(bookingRef);
      
      // อัปเดต state
      setBookings(bookings.filter(booking => booking.id !== bookingId));
      
      alert('ลบการจองเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error deleting booking:', error);
      alert('เกิดข้อผิดพลาดในการลบการจอง');
    }
  };

  // ฟังก์ชันตรวจสอบคอลเลคชั่น Bookings ทั้งหมด
  const debugListAllCollections = async () => {
    try {
      console.log('Attempting to list all collections...');
      
      // ตรวจสอบ Bookings collection
      console.log('Checking Bookings collection...');
      const bookingsRef = collection(db, 'Bookings');
      const bookingsSnapshot = await getDocs(bookingsRef);
      
      if (bookingsSnapshot.empty) {
        console.log('The Bookings collection exists but is empty.');
        alert('คอลเลคชั่น Bookings ว่างเปล่า ไม่มีข้อมูลการจอง');
      } else {
        console.log(`Bookings collection has ${bookingsSnapshot.size} documents:`);
        bookingsSnapshot.forEach(doc => {
          console.log(`- Document ID: ${doc.id}`);
          console.log(`  Data:`, doc.data());
        });
        alert(`พบข้อมูลการจอง ${bookingsSnapshot.size} รายการในระบบ กรุณาดูรายละเอียดในคอนโซล`);
      }
      
      // อัปเดตข้อมูลการจองใน state ด้วยข้อมูลที่ดึงมาได้
      const bookingsData = bookingsSnapshot.docs.map(doc => {
        const data = doc.data();
        let createdAtDate = new Date();
        
        try {
          if (data.createdAt && typeof data.createdAt.toDate === 'function') {
            createdAtDate = data.createdAt.toDate();
          } else if (data.createdAt instanceof Date) {
            createdAtDate = data.createdAt;
          }
        } catch (e) {
          console.error('Error converting timestamp:', e);
        }
        
        return {
          id: doc.id,
          ...data,
          createdAt: createdAtDate
        };
      });
      
      if (bookingsData.length > 0) {
        const sortedBookings = bookingsData.sort((a, b) => b.createdAt - a.createdAt);
        console.log('Setting bookings state with data:', sortedBookings);
        setBookings(sortedBookings);
      }
    } catch (error) {
      console.error('Error listing collections:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      alert('เกิดข้อผิดพลาดในการตรวจสอบคอลเลคชั่น');
    }
  };

  // ฟังก์ชันสำหรับค้นหาการจองด้วย ID โดยตรง (สำหรับตรวจสอบ)
  const checkBookingById = async (bookingId) => {
    try {
      console.log(`Checking for booking with ID: ${bookingId}`);
      const bookingRef = doc(db, 'Bookings', bookingId);
      const bookingDoc = await getDoc(bookingRef);
      
      if (bookingDoc.exists()) {
        console.log(`Found booking ${bookingId}:`, bookingDoc.data());
        alert(`พบการจองรหัส ${bookingId} ในระบบ`);
        
        // เพิ่มการจองที่พบเข้าไปใน state หากยังไม่มี
        const existingBooking = bookings.find(b => b.id === bookingId);
        if (!existingBooking) {
          const data = bookingDoc.data();
          let createdAtDate = new Date();
          try {
            if (data.createdAt && typeof data.createdAt.toDate === 'function') {
              createdAtDate = data.createdAt.toDate();
            } else if (data.createdAt instanceof Date) {
              createdAtDate = data.createdAt;
            }
          } catch (e) {
            console.error('Error converting timestamp:', e);
          }
          
          const newBooking = {
            id: bookingId,
            ...data,
            createdAt: createdAtDate
          };
          
          setBookings(prevBookings => [newBooking, ...prevBookings]);
        }
      } else {
        console.log(`No booking found with ID: ${bookingId}`);
        alert(`ไม่พบการจองรหัส ${bookingId} ในระบบ`);
      }
    } catch (error) {
      console.error(`Error checking booking with ID ${bookingId}:`, error);
      alert(`เกิดข้อผิดพลาดในการค้นหาการจองรหัส ${bookingId}`);
    }
  };
  const confirmPayment = async (bookingId) => {
  console.log('DEBUG: confirmPayment bookingId =', bookingId);
    if (!window.confirm('ยืนยันการชำระเงินสำหรับการจองนี้ใช่หรือไม่?')) return;
    
    try {
      const bookingRef = doc(db, 'Bookings', bookingId);
      await updateDoc(bookingRef, {
        paymentStatus: 'ชำระเงินแล้ว',
        paidAt: new Date(),
        status: 'ยืนยันแล้ว'
      });

      // อัปเดต paymentStatus ใน collection Payments ด้วย
      // ค้นหา payment ที่ bookingId ตรงกัน
      const paymentsCol = collection(db, 'Payments');
      const q = query(paymentsCol, where('bookingId', '==', bookingId));
      const snapshot = await getDocs(q);
      console.log('DEBUG: Payments found for bookingId', bookingId, snapshot.docs.map(d => ({id: d.id, ...d.data()})));
      if (!snapshot.empty) {
        // อัปเดตทุก payment document ที่ bookingId ตรงกัน
        for (const docSnap of snapshot.docs) {
          const paymentDocRef = doc(db, 'Payments', docSnap.id);
          await updateDoc(paymentDocRef, {
            paymentStatus: 'ชำระเงินแล้ว',
            paidAt: new Date()
          });
        }
      }

      // อัปเดต state
      setBookings(bookings.map(booking => 
        booking.id === bookingId 
          ? { 
              ...booking, 
              paymentStatus: 'ชำระเงินแล้ว', 
              paidAt: new Date(),
              status: 'ยืนยันแล้ว'
            }
          : booking
      ));
      alert('ยืนยันการชำระเงินเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('เกิดข้อผิดพลาดในการยืนยันการชำระเงิน');
    }
  };

  // ฟังก์ชันดูรายละเอียดการจอง
  const viewBookingDetails = async (booking) => {
    try {
      // ดึงข้อมูล payment จาก collection Payments ด้วย booking.id
      let paymentData = {};
      try {
        const paymentsCol = collection(db, 'Payments');
        const q = query(paymentsCol, where('bookingId', '==', booking.id));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          paymentData = snapshot.docs[0].data();
        }
      } catch (err) {
        // ไม่พบข้อมูล payment
      }

      // ดึงข้อมูลลูกค้าจาก userId ที่เป็น member
      let userEmail = booking.userEmail || '';
      let userName = booking.userName || '';
      let userFullName = booking.fullName || '';

      if (booking.userId) {
        try {
          const memberDocRef = doc(db, 'artifacts/login-spa-7921d/users', booking.userId);
          const memberSnap = await getDoc(memberDocRef);
          if (memberSnap.exists()) {
            const memberData = memberSnap.data();
            userEmail = memberData.email || booking.userEmail || '';
            userName = memberData.userName || memberData.displayName || booking.userName || '';
            userFullName = memberData.fullName || memberData.name || '';
          }
        } catch (err) {
          console.log('Error fetching member data:', err);
        }
      }

      // ดึง employeeName จาก artifacts/login-spa-7921d/users
      let employeeName = booking.employeeName || '';
      if (booking.employeeId) {
        try {
          const userDocRef = doc(db, 'artifacts/login-spa-7921d/users', booking.employeeId);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.role === 'employee' && userData.fullName) {
              employeeName = userData.fullName;
            } else {
              employeeName = userData.displayName || userData.name || employeeName;
            }
          }
        } catch (err) {}
      }

      // ดึง serviceName จาก Services
      let serviceName = booking.service || '';
      if (booking.serviceId) {
        try {
          const serviceDocRef = doc(db, 'Services', booking.serviceId);
          const serviceSnap = await getDoc(serviceDocRef);
          if (serviceSnap.exists()) {
            const serviceData = serviceSnap.data();
            serviceName = serviceData.name || serviceName;
          }
        } catch (err) {
          console.log('Error fetching service data:', err);
        }
      }

      setSelectedBooking({
        ...booking,
        userEmail: userEmail || booking.userEmail,
        userName: userName || booking.userName,
        fullName: userFullName || booking.fullName,
        paymentStatus: paymentData.paymentStatus || 'รอชำระเงิน',
        paymentMethod: paymentData.paymentMethod || 'ไม่ระบุ',
        employeeName,
        service: serviceName
      });
      setShowBookingDetails(true);
    } catch (err) {
      setSelectedBooking({ ...booking });
      setShowBookingDetails(true);
    }
  };
  const refreshBookings = async () => {
    setLoadingBookings(true);
    try {
      console.log('Refreshing bookings...');
      // ตรวจสอบทั้ง collection ที่เป็นไปได้
      const possibleCollectionNames = ['Bookings', 'bookings', 'booking', 'bookings_spa', 'appointments'];
      let bookingsData = [];
      let foundCollection = false;
      
      for (const collectionName of possibleCollectionNames) {
        try {
          console.log(`Trying collection name: ${collectionName}`);
          const collectionRef = collection(db, collectionName);
          const snapshot = await getDocs(collectionRef);
          console.log(`Collection ${collectionName} size:`, snapshot.size);
          
          if (snapshot.size > 0) {
            foundCollection = true;
            
            // แปลงข้อมูลจาก Firebase
            const data = snapshot.docs.map(doc => {
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
              
              return {
                id: docId,
                ...data,
                createdAt: createdAtDate,
                normalizedDate: bookingDate
              };
            });
            
            bookingsData = [...bookingsData, ...data];
          }
        } catch (err) {
          console.log(`Error accessing collection ${collectionName}:`, err.message);
        }
      }
      
      if (!foundCollection || bookingsData.length === 0) {
        console.log('No bookings found in any collection');
        setBookings([]);
        return;
      }
      
      // เรียงข้อมูลตามวันที่สร้าง (ใหม่สุดขึ้นก่อน)
      const sortedBookings = bookingsData.sort((a, b) => b.createdAt - a.createdAt);
      
      console.log('Total bookings found after refresh:', sortedBookings.length);
      setBookings(sortedBookings);
      
      alert(`โหลดข้อมูลการจอง ${sortedBookings.length} รายการเรียบร้อยแล้ว`);
    } catch (error) {
      console.error('Error refreshing bookings:', error);
      alert('เกิดข้อผิดพลาดในการรีเฟรชข้อมูลการจอง กรุณาลองใหม่อีกครั้ง');
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  // ฟังก์ชันสำหรับการจัดการปฏิทิน
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleDateClick = (date) => {
    console.log('Date clicked:', date);
    
    const clickedDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    console.log('Clicked date string:', clickedDateStr);
    
    const matchingBookings = bookings.filter(booking => {
      if (!booking.date) return false;
      let bookingDate;
      try {
        if (typeof booking.date === 'string') {
          bookingDate = new Date(booking.date);
        } else if (booking.date.toDate && typeof booking.date.toDate === 'function') {
          bookingDate = booking.date.toDate();
        } else if (booking.date instanceof Date) {
          bookingDate = booking.date;
        } else {
          bookingDate = new Date(booking.date);
        }
        
        const bookingDateStr = `${bookingDate.getFullYear()}-${String(bookingDate.getMonth() + 1).padStart(2, '0')}-${String(bookingDate.getDate()).padStart(2, '0')}`;
        console.log('Comparing:', clickedDateStr, 'vs', bookingDateStr);
        
        return clickedDateStr === bookingDateStr;
      } catch (error) {
        console.error('Error processing booking date for click:', booking.date, error);
        return false;
      }
    });
    
    console.log('Matching bookings for clicked date:', matchingBookings.length, matchingBookings);
    
    setSelectedDate(date);
    setViewMode('bookings'); // เปลี่ยนไปแสดงรายการจอง
  };

  // ฟังก์ชันสร้างปฏิทิน
  const generateCalendar = () => {
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startDay = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();
    
    // สร้าง array เก็บวันที่มีการจอง
    const bookingDates = {};
    
    // Debug: ดูข้อมูลการจอง
    console.log('Processing bookings for calendar:', bookings.length, bookings);
    console.log('Current month:', currentMonth.getFullYear(), currentMonth.getMonth());
    
    bookings.forEach(booking => {
      // Use getBookingDate helper to support multiple date fields (bookingDate, date, serviceDate, Timestamp)
      const raw = getBookingDate(booking);
      if (!raw) return;

      let bookingDate = null;
      try {
        if (typeof raw === 'string') {
          bookingDate = new Date(raw);
        } else if (raw && typeof raw.toDate === 'function') {
          bookingDate = raw.toDate();
        } else if (raw instanceof Date) {
          bookingDate = raw;
        } else {
          bookingDate = new Date(raw);
        }
      } catch (error) {
        console.error('Error parsing booking date (getBookingDate returned):', raw, error);
        return;
      }

      if (!bookingDate || isNaN(bookingDate.getTime())) return;

      // Only include bookings in the currently displayed month
      if (bookingDate.getFullYear() === currentMonth.getFullYear() && bookingDate.getMonth() === currentMonth.getMonth()) {
        const year = bookingDate.getFullYear();
        const month = String(bookingDate.getMonth() + 1).padStart(2, '0');
        const day = String(bookingDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        if (!bookingDates[dateStr]) bookingDates[dateStr] = [];
        bookingDates[dateStr].push(booking);
      }
    });
    
    console.log('Booking dates for calendar:', bookingDates);
    
    const calendar = [];
    let cells = [];
    
    // สร้าง empty cells สำหรับวันก่อนวันแรกของเดือน
    for (let i = 0; i < startDay; i++) {
      cells.push(
        <td key={`empty-start-${i}`} className="calendar-cell empty-cell">
          <div className="calendar-day empty">&nbsp;</div>
        </td>
      );
    }
    
    // สร้าง cells สำหรับวันในเดือน
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      
      // ใช้วิธีเดียวกันในการสร้าง dateStr
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const dayStr = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayStr}`;
      
      const isToday = new Date().toDateString() === date.toDateString();
      const dayBookings = bookingDates[dateStr] || [];
      const hasBookings = dayBookings.length > 0;
      
      console.log(`Day ${day}: dateStr=${dateStr}, bookings=${dayBookings.length}`, dayBookings);
      
      cells.push(
        <td 
          key={`day-${day}`} 
          className={`calendar-cell ${isToday ? 'today' : ''} ${hasBookings ? 'has-bookings' : ''}`}
          onClick={() => handleDateClick(date)}
          style={{ cursor: 'pointer' }}
        >
          <div className="calendar-day">
            <div className="day-number">{day}</div>
            {hasBookings && (
              <div className="booking-indicators">
                <div className="booking-count-badge">
                  {dayBookings.length}
                </div>
                <div className="booking-dots">
                  {dayBookings.slice(0, 3).map((booking, idx) => (
                    <div 
                      key={idx} 
                      className={`booking-dot ${
                        booking.status === 'ยืนยันแล้ว' ? 'confirmed' :
                        booking.status === 'เสร็จสิ้น' ? 'completed' :
                        booking.status === 'ปฏิเสธ' ? 'rejected' : 'pending'
                      }`}
                      title={`${booking.service} - ${booking.time}`}
                    ></div>
                  ))}
                  {dayBookings.length > 3 && (
                    <div className="booking-dot more">+{dayBookings.length - 3}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </td>
      );
      
      if ((startDay + day) % 7 === 0) {
        calendar.push(<tr key={`week-${Math.floor((startDay + day) / 7)}`}>{cells}</tr>);
        cells = [];
      }
    }
    
    // เพิ่ม empty cells ในส่วนที่เหลือ
    if (cells.length > 0) {
      const remainingCells = 7 - cells.length;
      for (let i = 0; i < remainingCells; i++) {
        cells.push(
          <td key={`empty-end-${i}`} className="calendar-cell empty-cell">
            <div className="calendar-day empty">&nbsp;</div>
          </td>
        );
      }
      calendar.push(<tr key={`week-last`}>{cells}</tr>);
    }
    
    return calendar;
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

  // ฟังก์ชันกรอง bookings ตามวันที่ที่เลือก
  const bookingsForSelectedDate = bookings.filter(b => {
    if (!selectedDate) return false;
    const rawDate = getBookingDate(b);
    if (!rawDate) return false;
    let bookingDateStr;
    if (typeof rawDate === 'string') {
      bookingDateStr = rawDate.length > 10 ? rawDate.substring(0, 10) : rawDate;
    } else if (rawDate.toDate && typeof rawDate.toDate === 'function') {
      const d = rawDate.toDate();
      bookingDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } else if (rawDate instanceof Date) {
      bookingDateStr = `${rawDate.getFullYear()}-${String(rawDate.getMonth() + 1).padStart(2, '0')}-${String(rawDate.getDate()).padStart(2, '0')}`;
    } else {
      bookingDateStr = new Date(rawDate).toISOString().split('T')[0];
    }
    const selectedDateStr = typeof selectedDate === 'string' ? selectedDate : selectedDate.toISOString().split('T')[0];
    return bookingDateStr === selectedDateStr;
  });
  
  return (
    <div className="d-flex" id="wrapper" style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Add FontAwesome CDN */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" crossOrigin="anonymous" referrerPolicy="no-referrer" />
      
      {/* Overlay for mobile - only visible when sidebar is open on mobile */}
      {sidebarOpen && (
        <div 
          className="d-md-none" 
          onClick={handleOverlayClick}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1025,
            transition: 'opacity 0.3s ease'
          }}
        ></div>
      )}
      {/* Sidebar */}
      <div className={`border-end sidebar-wrapper ${sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`} 
           id="sidebar-wrapper" 
           style={{ 
             background: 'linear-gradient(135deg, #583015ff 0%, #331906ff 100%)',
             position: 'fixed',
             height: '100vh',
             zIndex: 1030,
             overflowX: 'hidden',
             overflowY: 'auto',
             borderRight: '2px solid #ff7730'
           }}>
        <div className="sidebar-heading d-flex align-items-center py-3 px-3" style={{ 
          borderBottom: '1px solid rgba(255, 119, 48, 0.3)', 
          background: 'rgba(0,0,0,0.2)',
          color: 'white'
        }}>
          <i className="fas fa-spa me-2" style={{ color: '#ff7730', fontSize: '1.5rem' }}></i>
          <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>SpaFlow Owner</span>
        </div>
        <div className="px-3 py-4" style={{ borderBottom: '1px solid rgba(255, 119, 48, 0.3)' }}>
          <div className="d-flex align-items-center mb-3">
            <div style={{
              width: 45,
              height: 45,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff9900 0%, #ff7730 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(255,119,48,0.10)'
            }}>
              <i className="fas fa-user" style={{ color: '#fff' }}></i>
            </div>
            <div className="ms-3">
              <div style={{ color: 'white', fontWeight: 'bold' }}>
                {userProfileData ? userProfileData.displayName || 'ผู้จัดการร้าน' : 'ผู้จัดการร้าน'}
              </div>
              <small style={{ color: 'rgba(255,255,255,0.6)' }}>ออนไลน์</small>
            </div>
          </div>
          <div className="d-flex flex-column">
            <button className="btn-sidebar-action" onClick={goToSettings} style={{
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
            }}>
              <i className="fas fa-sliders-h me-2"></i> ตั้งค่าระบบ
            </button>
          </div>
        </div>
        <div className="list-group list-group-flush">
          {menuCategories.map((category, index) => (
            <div key={index} className="sidebar-category mb-2">
              <div className="category-header d-flex align-items-center px-3 py-2">
                <i className={`fas fa-${category.icon} me-2`} style={{ color: '#ff7730' }}></i>
                <span style={{ color: '#ff7730', fontWeight: 'bold', fontSize: '0.85rem' }}>{category.title}</span>
              </div>
              
              <div className="category-items">
                {category.items.map((item) => (
                  <button
                    key={item.id}
                    className={`sidebar-nav-item ${active === item.id ? 'active' : ''}`}
                    onClick={() => setActive(item.id)}
                    title={item.label}
                  >
                    <i className={`fas fa-${item.icon}`} style={{ width: '20px', marginRight: '12px', fontSize: '1.1rem' }}></i>
                    <span>{item.label}</span>
                    {item.id === 'approvals' && pendingCount > 0 && (
                      <span className="ms-2 badge bg-danger rounded-pill">{pendingCount}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <style>
        {`
          .sidebar-category {
            margin-bottom: 5px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          .category-header {
            padding: 8px 15px;
            font-weight: 600;
            color: #ff7730;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .category-items {
            padding-left: 10px;
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
        `}
        </style>
        <div className="px-3 py-3 mt-auto">
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
            <i className="fas fa-sign-out-alt" style={{ width: '20px', marginRight: '12px', fontSize: '1.1rem' }}></i>
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </div>
      {/* Page content wrapper */}
      <div id="page-content-wrapper" 
           className={`flex-grow-1 page-content-wrapper ${sidebarOpen ? 'page-content-shifted' : 'page-content-full'}`} 
           style={{ 
             background: '#faf8f0ff',
             width: '100%',
             position: 'relative'
           }}>
        {/* Top navigation */}
        <nav className={`navbar navbar-expand-lg navbar-light bg-white border-bottom shadow-sm fixed-top ${sidebarOpen ? 'navbar-shifted' : 'navbar-full'}`}>
          <div className="container-fluid">
            <button 
              className="btn" 
              id="sidebarToggle" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'linear-gradient(135deg, #ff9900 0%, #ff7730 100%)',
                border: 'none',
                color: 'white',
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className={`fas ${sidebarOpen ? 'fa-chevron-left' : 'fa-bars'}`}></i>
            </button>
            <div className="ms-3 d-flex align-items-center">
              <h5 className="fw-bold mb-0" style={{ color: '#333' }}>
                <i className="fas fa-tachometer-alt me-2" style={{ color: '#ff7730' }}></i>
                แดชบอร์ดเจ้าของร้าน
              </h5>
            </div>
            <div className="ms-auto d-flex align-items-center">
              {pendingCount > 0 && (
                <button 
                  className="btn btn-danger btn-sm me-3 d-flex align-items-center" 
                  onClick={() => setActive('approvals')}
                >
                  <i className="fas fa-user-clock me-1"></i>
                  <span>มีผู้ใช้รออนุมัติ</span>
                  <span className="badge bg-white text-danger ms-2">{pendingCount}</span>
                </button>
              )}
              <div className="me-4 text-end">
                <div style={{ fontSize: '0.85rem', color: '#888' }}>{currentTime.toLocaleDateString('th-TH', { weekday: 'long' })}</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#333' }}>
                  {currentTime.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
              <div className="vr me-3 d-none d-sm-block" style={{ height: '30px' }}></div>
              <div 
                style={{ 
                  width: '38px', 
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ff9900 0%, #ff7730 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}
              >
                <i className="fas fa-user"></i>
              </div>
            </div>
          </div>
        </nav>

        {/* Page content */}
        <div className="container-fluid p-4" style={{ marginTop: '70px' }}>
          {active === 'bookings' && (
            <div className="animate-fade-in">
              {/* เพิ่ม CSS สำหรับปฏิทิน */}
              <style jsx>{`
                .calendar-cell {
                  padding: 0;
                  vertical-align: top;
                  height: 120px;
                  width: 14.28%;
                  border: 1px solid #e9ecef;
                  position: relative;
                }
                
                .calendar-cell.today {
                  background-color: rgba(255, 125, 41, 0.1);
                  border-color: #ff7730;
                }
                
                .calendar-cell.has-bookings {
                  background-color: rgba(13, 110, 253, 0.05);
                }
                
                .calendar-cell.has-bookings:hover {
                  background-color: rgba(13, 110, 253, 0.1);
                  transform: scale(1.02);
                  transition: all 0.2s ease;
                }
                
                .calendar-day {
                  padding: 8px;
                  height: 100%;
                  display: flex;
                  flex-direction: column;
                }
                
                .day-number {
                  font-weight: bold;
                  font-size: 16px;
                  color: #333;
                  margin-bottom: 4px;
                }
                
                .empty-cell .day-number {
                  color: #ccc;
                }
                
                .today .day-number {
                  color: #ff7730;
                  font-size: 18px;
                }
                
                .calendar-day { position: relative; }
                .booking-indicators {
                  /* indicators container is positioned relative to calendar-day */
                  display: block;
                }

                .booking-count-badge {
                  position: absolute;
                  top: 8px;
                  right: 8px;
                  background: linear-gradient(135deg, #ff9900 0%, #ff7730 100%);
                  color: white;
                  border-radius: 50%;
                  width: 24px;
                  height: 24px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 12px;
                  font-weight: bold;
                  z-index: 5;
                }

                .booking-dots {
                  position: absolute;
                  left: 8px;
                  bottom: 8px;
                  display: flex;
                  gap: 6px;
                  z-index: 5;
                }

                .booking-dot {
                  width: 10px;
                  height: 10px;
                  border-radius: 50%;
                  display: inline-block;
                }
                
                .booking-dot.pending {
                  background-color: #ffc107; /* สีเหลือง - รอชำระเงิน */
                }
                
                .booking-dot.confirmed {
                  background-color: #28a745; /* สีเขียว - ยืนยันแล้ว */
                }
                
                .booking-dot.completed {
                  background-color: #0d6efd; /* สีน้ำเงิน - เสร็จสิ้น */
                }
                
                .booking-dot.rejected {
                  background-color: #dc3545; /* สีแดง - ปฏิเสธ */
                }
                
                .booking-dot.more {
                  background-color: #6c757d;
                  color: white;
                  font-size: 6px;
                  width: 12px;
                  height: 8px;
                  border-radius: 4px;
                }
                
                .table-calendar th {
                  text-align: center;
                  padding: 12px;
                  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                  font-weight: 600;
                  border: 1px solid #dee2e6;
                }
              `}</style>
              
              <div className="row mb-4">
                <div className="col-12">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4 className="mb-0" style={{ color: '#333' }}>
                      <i className="fas fa-calendar-alt me-2" style={{ color: '#ff7730' }}></i>
                      {viewMode === 'calendar' ? 'ปฏิทินการจอง' : 'รายการจองในวันที่เลือก'}
                    </h4>
                    <div className="d-flex gap-2">
                      {viewMode === 'bookings' && (
                        <button 
                          className="btn btn-outline-secondary" 
                          onClick={() => {
                            setViewMode('calendar');
                            setSelectedDate(null);
                          }}
                        >
                          <i className="fas fa-arrow-left me-2"></i>
                          กลับไปปฏิทิน
                        </button>
                      )}
                      <button className="btn btn-sm" 
                        onClick={refreshBookings}
                        style={{
                          background: 'linear-gradient(135deg, #ff9900 0%, #ff7730 100%)',
                          color: 'white',
                          border: 'none'
                        }}
                      >
                        <i className="fas fa-sync-alt me-1"></i> รีเฟรช
                      </button>
                    </div>
                  </div>
                  
                  {viewMode === 'calendar' ? (
                    // แสดงปฏิทิน
                    <div className="card border-0 shadow-sm">
                    <div className="card-header bg-gradient text-white p-4" style={{ background: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)', borderBottom: '3px solid #ff7730' }}>
                      <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0" style={{ color: '#ff7730' }}>
                          {currentMonth.toLocaleString('th-TH', { 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </h5>
                        <div className="d-flex gap-2">
                          <button className="btn btn-outline-secondary btn-sm" onClick={prevMonth}>
                            <i className="fas fa-chevron-left"></i>
                          </button>
                          <button 
                            className="btn btn-sm"
                            onClick={() => setCurrentMonth(new Date())}
                            style={{ 
                              background: 'linear-gradient(135deg, #ff9900 0%, #ff7730 100%)',
                              color: 'white',
                              border: 'none'
                            }}
                          >
                            วันนี้
                          </button>
                          <button className="btn btn-outline-secondary btn-sm" onClick={nextMonth}>
                            <i className="fas fa-chevron-right"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                      <div className="card-body p-0">
                        {loadingBookings ? (
                          <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                              <span className="visually-hidden">กำลังโหลด...</span>
                            </div>
                            <p className="mt-2 text-muted">กำลังโหลดข้อมูลการจอง...</p>
                          </div>
                        ) : bookings.length === 0 ? (
                          <div className="text-center py-5">
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                              <i className="fas fa-calendar-times fa-3x mb-3" style={{ color: '#ddd' }}></i>
                              <h5>ไม่มีการจองในวันที่เลือก</h5>
                            </div>
                          </div>
                        ) : (
                          <div className="table-responsive">
                            <table className="table table-calendar mb-0">
                              <thead>
                                <tr>
                                  <th>อาทิตย์</th>
                                  <th>จันทร์</th>
                                  <th>อังคาร</th>
                                  <th>พุธ</th>
                                  <th>พฤหัสบดี</th>
                                  <th>ศุกร์</th>
                                  <th>เสาร์</th>
                                </tr>
                              </thead>
                              <tbody>
                                {generateCalendar()}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                      <div className="card-footer bg-light">
                        <div className="row align-items-center">
                          <div className="col-md-8">
                            <div className="d-flex align-items-center gap-4">
                              <div className="d-flex align-items-center">
                                <div className="me-2" style={{ 
                                  width: '8px', 
                                  height: '8px', 
                                  borderRadius: '50%', 
                                  backgroundColor: '#ffc107' 
                                }}></div>
                                <small>รอชำระเงิน</small>
                              </div>
                              <div className="d-flex align-items-center">
                                <div className="me-2" style={{ 
                                  width: '8px', 
                                  height: '8px', 
                                  borderRadius: '50%', 
                                  backgroundColor: '#28a745' 
                                }}></div>
                                <small>ยืนยันแล้ว</small>
                              </div>
                              <div className="d-flex align-items-center">
                                <div className="me-2" style={{ 
                                  width: '8px', 
                                  height: '8px', 
                                  borderRadius: '50%', 
                                  backgroundColor: '#0d6efd' 
                                }}></div>
                                <small>เสร็จสิ้น</small>
                              </div>
                              <div className="d-flex align-items-center">
                                <div className="me-2" style={{ 
                                  width: '8px', 
                                  height: '8px', 
                                  borderRadius: '50%', 
                                  backgroundColor: '#dc3545' 
                                }}></div>
                                <small>ปฏิเสธ</small>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-4 text-md-end">
                            <small className="text-muted">คลิกวันที่มีการจองเพื่อดูรายละเอียด</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // แสดงรายการจองในวันที่เลือก
                    <div className="card border-0 shadow-sm">
                      <div className="card-header bg-gradient text-white p-4" style={{ background: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)', borderBottom: '3px solid #ff7730' }}>
                        <div className="d-flex justify-content-between align-items-center">
                          <h5 className="mb-0" style={{ color: '#ff7730' }}>
                            <i className="fas fa-calendar-day me-2"></i>
                            รายการจอง - {selectedDate?.toLocaleDateString('th-TH', { 
                              weekday: 'long', 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            })}
                          </h5>
                          <span className="badge" style={{ 
                            background: 'linear-gradient(135deg, #ff9900 0%, #ff7730 100%)',
                            color: 'white'
                          }}>
                            {(() => {
                              const filteredCount = bookings.filter(b => {
                                const rawDate = getBookingDate(b);
                                if (!rawDate || !selectedDate) return false;
                                let bookingDate;
                                try {
                                  if (typeof rawDate === 'string') {
                                    bookingDate = new Date(rawDate);
                                  } else if (rawDate.toDate && typeof rawDate.toDate === 'function') {
                                    bookingDate = rawDate.toDate();
                                  } else if (rawDate instanceof Date) {
                                    bookingDate = rawDate;
                                  } else {
                                    return false;
                                  }
                                  return bookingDate.toDateString() === selectedDate.toDateString();
                                } catch (error) {
                                  console.error('Error filtering booking date:', rawDate, error);
                                  return false;
                                }
                              }).length;
                              return filteredCount;
                            })()} รายการ
                          </span>
                        </div>
                      </div>
                      <div className="card-body p-0">
                        <div className="table-responsive">
                          <table className="table table-hover mb-0">
                            <thead style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
                              <tr>
                                <th scope="col">เวลา</th>
                                <th scope="col">ลูกค้า</th>
                                <th scope="col">บริการ</th>
                                <th scope="col">ระยะเวลา</th>
                                <th scope="col">ราคา</th>
                                <th scope="col">พนักงาน</th>
                                <th scope="col">สถานะ</th>
                                <th scope="col">การดำเนินการ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bookings
                                .filter(booking => {
                                  const rawDate = getBookingDate(booking);
                                  if (!rawDate || !selectedDate) return false;
                                  let bookingDate;
                                  try {
                                    if (typeof rawDate === 'string') {
                                      bookingDate = new Date(rawDate);
                                    } else if (rawDate.toDate && typeof rawDate.toDate === 'function') {
                                      bookingDate = rawDate.toDate();
                                    } else if (rawDate instanceof Date) {
                                      bookingDate = rawDate;
                                    } else {
                                      return false;
                                    }
                                    return bookingDate.toDateString() === selectedDate.toDateString();
                                  } catch (error) {
                                    console.error('Error filtering booking date:', rawDate, error);
                                    return false;
                                  }
                                })
                                .sort((a, b) => {
                                  // เรียงตามเวลา
                                  if (!a.time || !b.time) return 0;
                                  return a.time.localeCompare(b.time);
                                })
                                .map((booking) => {
                                  console.log('Rendering booking:', booking.id, booking);
                                  
                                  const statusConfig = {
                                    'รอชำระเงิน': { class: 'bg-warning text-dark', icon: 'fa-clock' },
                                    'จองแล้ว': { class: 'bg-warning text-dark', icon: 'fa-clock' },
                                    'ยืนยันแล้ว': { class: 'bg-success', icon: 'fa-check' },
                                    'ปฏิเสธ': { class: 'bg-danger', icon: 'fa-times' },
                                    'เสร็จสิ้น': { class: 'bg-primary', icon: 'fa-check-circle' },
                                    'ยกเลิก': { class: 'bg-secondary', icon: 'fa-ban' }
                                  };
                                  
                                  const status = statusConfig[booking.status] || statusConfig['จองแล้ว'];
                                  
                                  return (
                                    <tr key={booking.id} className="align-middle">
                                      <td>
                                        <div className="fw-bold" style={{ color: '#0d6efd', fontSize: '1.1rem' }}>
                                          {booking.bookingTime ? `${booking.bookingTime} น.` : (booking.time ? `${booking.time} น.` : 'ไม่ระบุ')}
                                        </div>
                                      </td>
                                      <td>
                                        <div className="d-flex align-items-center">
                                          <div style={{
                                            width: 35,
                                            height: 35,
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: '8px',
                                            border: '1px solid #dee2e6'
                                          }}>
                                            <i className="fas fa-user" style={{ color: '#6c757d' }}></i>
                                          </div>
                                          <div>
                                            <div className="text-truncate fw-medium" style={{ maxWidth: '130px' }}>
                                              {booking.userEmail ? booking.userEmail : (booking.userName ? booking.userName : (booking.fullName ? booking.fullName : 'ไม่ระบุ'))}
                                            </div>
                                            <small className="text-muted">{booking.memberId ? booking.memberId.substring(0, 8) + '...' : (booking.userId ? booking.userId.substring(0, 8) + '...' : '')}</small>
                                          </div>
                                        </div>
                                      </td>
                                      <td>
                                        <div className="d-flex align-items-center">
                                          <div style={{
                                            width: 35,
                                            height: 35,
                                            borderRadius: '8px',
                                            background: 'rgba(255, 125, 41, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: '8px'
                                          }}>
                                            <i className="fas fa-spa" style={{ color: '#ff7730' }}></i>
                                          </div>
                                          <div>
                                            <div className="fw-medium">{booking.service || booking.serviceName || (booking.serviceId ? 'กำลังโหลดข้อมูล...' : 'ไม่ระบุ')}</div>
                                          </div>
                                        </div>
                                      </td>
                                      <td>
                                        <span className="text-muted">
                                          {booking.duration ? `${booking.duration} นาที` : 'ไม่ระบุ'}
                                        </span>
                                      </td>
                                      <td>
                                        <span className="fw-bold" style={{ color: '#198754' }}>
                                          ฿{booking.price || '0'}
                                        </span>
                                      </td>
                                      <td>
                                        {booking.employeeName ? (
                                          <div className="d-flex align-items-center">
                                            <div style={{
                                              width: 30,
                                              height: 30,
                                              borderRadius: '50%',
                                              background: 'rgba(13, 110, 253, 0.1)',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              marginRight: '8px'
                                            }}>
                                              <i className="fas fa-user-tie" style={{ color: '#0d6efd' }}></i>
                                            </div>
                                            <span>{booking.employeeName}</span>
                                          </div>
                                        ) : (
                                          <span className="text-muted">ยังไม่กำหนด</span>
                                        )}
                                      </td>
                                      <td>
                                        <span className={`badge ${status.class} rounded-pill`}>
                                          <i className={`fas ${status.icon} me-1`}></i>
                                          {booking.status || 'รอชำระเงิน'}
                                        </span>
                                      </td>
                                      <td>
                                        <div className="d-flex justify-content-center gap-1">
                                          <button 
                                            className="btn btn-sm btn-outline-primary" 
                                            onClick={() => viewBookingDetails(booking)}
                                            title="ดูรายละเอียด"
                                          >
                                            <i className="fas fa-eye"></i>
                                          </button>
                                          {booking.status === 'รอชำระเงิน' && (
                                            <button 
                                              className="btn btn-sm btn-success" 
                                              onClick={() => approveBooking(booking.id)}
                                              title="อนุมัติ"
                                            >
                                              <i className="fas fa-check"></i>
                                            </button>
                                          )}
                                          <button 
                                            className="btn btn-sm btn-danger" 
                                            onClick={() => deleteBooking(booking.id)}
                                            title="ลบ"
                                          >
                                            <i className="fas fa-trash-alt"></i>
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              }
                            </tbody>
                          </table>
                          
                          {(() => {
                            const emptyCheck = bookings.filter(b => {
                              const rawDate = getBookingDate(b);
                              if (!rawDate || !selectedDate) return false;
                              let bookingDate;
                              try {
                                if (typeof rawDate === 'string') {
                                  bookingDate = new Date(rawDate);
                                } else if (rawDate.toDate && typeof rawDate.toDate === 'function') {
                                  bookingDate = rawDate.toDate();
                                } else if (rawDate instanceof Date) {
                                  bookingDate = rawDate;
                                } else {
                                  return false;
                                }
                                return bookingDate.toDateString() === selectedDate.toDateString();
                              } catch (error) {
                                console.error('Error filtering booking date for empty check:', rawDate, error);
                                return false;
                              }
                            });
                            
                            return emptyCheck.length === 0;
                          })() && (
                            <div className="text-center py-5 text-muted">
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="fas fa-calendar-times fa-3x mb-3" style={{ color: '#ddd' }}></i>
                                <h5>ไม่มีการจองในวันที่เลือก</h5>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {active === 'services' && <ServiceManager />}
          {active === 'staff' && <StaffSchedule />}
          {active === 'members' && <MemberSettings />}
          {active === 'approvals' && <UserApproval />}
          {active === 'report' && (
            <div className="animate-fade-in">
             
              <div className="row mb-4">
                <div className="col-12">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4 className="mb-0" style={{ color: '#333' }}>
                      <i className="fas fa-chart-line me-2" style={{ color: '#ff7730' }}></i>
                      รายงานรายได้
                    </h4>
                    <div className="d-flex gap-2">
                      <select 
                        className="form-select form-select-sm"
                        style={{
                          maxWidth: '180px',
                          borderRadius: '8px',
                          borderColor: '#ddd'
                        }}
                      >
                        <option value="today">วันนี้</option>
                        <option value="yesterday">เมื่อวาน</option>
                        <option value="week">7 วันล่าสุด</option>
                        <option value="month">เดือนนี้</option>
                        <option value="lastMonth">เดือนที่แล้ว</option>
                      </select>
                      <button className="btn btn-sm" style={{ 
                        background: 'linear-gradient(135deg, #ff9900 0%, #ff7730 100%)',
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px' 
                      }}>
                        <i className="fas fa-download me-1"></i> ดาวน์โหลดรายงาน
                      </button>
                    </div>
                  </div>
                  <div className="row g-3">
                    <div className="col-md-3">
                      <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                          <div className="d-flex align-items-center mb-2">
                            <div style={{ 
                              width: '60px', 
                              height: '60px',
                              borderRadius: '15px',
                              background: 'rgba(255, 125, 41, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ff7730',
                              fontSize: '24px'
                            }}>
                              <i className="fas fa-wallet"></i>
                            </div>
                            <div className="ms-3">
                              <span className="d-block text-muted" style={{ fontSize: '0.85rem' }}>รายได้วันนี้</span>
                              <span className="fw-bold" style={{ fontSize: '1.5rem' }}>฿{stats.todayRevenue.toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="d-flex justify-content-between mt-2">
                            <small className="text-success">
                              <i className="fas fa-arrow-up me-1"></i>
                              <span>+12% จากเมื่อวาน</span>
                            </small>
                            <small className="text-muted">
                              <i className="far fa-calendar-alt me-1"></i>
                              <span>{new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                          <div className="d-flex align-items-center mb-2">
                            <div style={{ 
                              width: '60px', 
                              height: '60px',
                              borderRadius: '15px',
                              background: 'rgba(0, 123, 255, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#0d6efd',
                              fontSize: '24px'
                            }}>
                              <i className="fas fa-calendar-alt"></i>
                            </div>
                            <div className="ms-3">
                              <span className="d-block text-muted" style={{ fontSize: '0.85rem' }}>รายได้เดือนนี้</span>
                              <span className="fw-bold" style={{ fontSize: '1.5rem' }}>฿{stats.monthRevenue.toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="d-flex justify-content-between mt-2">
                            <small className="text-success">
                              <i className="fas fa-arrow-up me-1"></i>
                              <span>+5% จากเดือนที่แล้ว</span>
                            </small>
                            <small className="text-muted">
                              <i className="far fa-calendar me-1"></i>
                              <span>{new Date().toLocaleDateString('th-TH', { month: 'long' })}</span>
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                          <div className="d-flex align-items-center mb-2">
                            <div style={{ 
                              width: '60px', 
                              height: '60px',
                              borderRadius: '15px',
                              background: 'rgba(40, 167, 69, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#28a745',
                              fontSize: '24px'
                            }}>
                              <i className="fas fa-users"></i>
                            </div>
                            <div className="ms-3">
                              <span className="d-block text-muted" style={{ fontSize: '0.85rem' }}>ลูกค้าวันนี้</span>
                              <span className="fw-bold" style={{ fontSize: '1.5rem' }}> {stats.todayCustomers.toLocaleString()} คน</span>
                            </div>
                          </div>
                          <div className="d-flex justify-content-between mt-2">
                            <small className="text-success">
                              <i className="fas fa-arrow-up me-1"></i>
                              <span>+8% จากค่าเฉลี่ย</span>
                            </small>
                            <small className="text-muted">
                              <i className="fas fa-dollar-sign me-1"></i>
                              <span>฿{Math.round(stats.todayRevenue / (stats.todayCustomers || 1)).toLocaleString()}/คน</span>
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                          <div className="d-flex align-items-center mb-2">
                            <div style={{ 
                              width: '60px', 
                              height: '60px',
                              borderRadius: '15px',
                              background: 'rgba(220, 53, 69, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#dc3545',
                              fontSize: '24px'
                            }}>
                              <i className="fas fa-clipboard-check"></i>
                            </div>
                            <div className="ms-3">
                              <span className="d-block text-muted" style={{ fontSize: '0.85rem' }}>การจองวันนี้</span>
                              <span className="fw-bold" style={{ fontSize: '1.5rem' }}>{stats.todayBookings.toLocaleString()} รายการ</span>
                            </div>
                          </div>
                          <div className="d-flex justify-content-between mt-2">
                            <small className="text-success">
                              <i className="fas fa-arrow-up me-1"></i>
                              <span>+3 จากเมื่อวาน</span>
                            </small>
                            <small className="text-muted">
                              <i className="fas fa-check-circle me-1"></i>
                              <span>อัตราการยืนยัน 89%</span>
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* รายรับแยกช่องทางการชำระเงิน */}
                  <div className="row mt-4">
                    <div className="col-12">
                      <h5 className="mb-3" style={{ color: '#333' }}>
                        <i className="fas fa-money-check-alt me-2" style={{ color: '#0d6efd' }}></i>
                        รายรับสุทธิแยกตามช่องทางการชำระเงิน
                      </h5>
                      <div className="row g-3">
                        <div className="col-md-4">
                          <div className="card border-0 shadow-sm h-100">
                            <div className="card-body">
                              <div className="d-flex align-items-center mb-2">
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(40,167,69,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#28a745', fontSize: '20px' }}>
                                  <i className="fas fa-money-bill-wave"></i>
                                </div>
                                <div className="ms-3">
                                  <span className="d-block fw-bold">เงินสด</span>
                                </div>
                              </div>
                              <div className="mt-2">
                                <h4 className="mb-1">฿{stats.paymentChannels.cash ? stats.paymentChannels.cash.toLocaleString() : '0'}</h4>
                                <div className="d-flex align-items-center">
                                  <div className="progress flex-grow-1" style={{ height: '8px' }}>
                                    <div 
                                      className="progress-bar bg-success" 
                                      role="progressbar" 
                                      style={{ 
                                        width: `${stats.paymentChannels.cash && stats.todayRevenue ? (stats.paymentChannels.cash / stats.todayRevenue * 100) : 0}%` 
                                      }}
                                      aria-valuenow={stats.paymentChannels.cash || 0} 
                                      aria-valuemin="0" 
                                      aria-valuemax={stats.todayRevenue || 100}>
                                    </div>
                                  </div>
                                  <span className="ms-2 text-muted small">
                                    {stats.paymentChannels.cash && stats.todayRevenue 
                                      ? `${Math.round(stats.paymentChannels.cash / stats.todayRevenue * 100)}%` 
                                      : '0%'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="card border-0 shadow-sm h-100">
                            <div className="card-body">
                              <div className="d-flex align-items-center mb-2">
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(0,123,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d6efd', fontSize: '20px' }}>
                                  <i className="fas fa-university"></i>
                                </div>
                                <div className="ms-3">
                                  <span className="d-block fw-bold">โอนเงิน</span>
                                </div>
                              </div>
                              <div className="mt-2">
                                <h4 className="mb-1">฿{stats.paymentChannels.transfer ? stats.paymentChannels.transfer.toLocaleString() : '0'}</h4>
                                <div className="d-flex align-items-center">
                                  <div className="progress flex-grow-1" style={{ height: '8px' }}>
                                    <div 
                                      className="progress-bar bg-primary" 
                                      role="progressbar" 
                                      style={{ 
                                        width: `${stats.paymentChannels.transfer && stats.todayRevenue ? (stats.paymentChannels.transfer / stats.todayRevenue * 100) : 0}%` 
                                      }}
                                      aria-valuenow={stats.paymentChannels.transfer || 0} 
                                      aria-valuemin="0" 
                                      aria-valuemax={stats.todayRevenue || 100}>
                                    </div>
                                  </div>
                                  <span className="ms-2 text-muted small">
                                    {stats.paymentChannels.transfer && stats.todayRevenue 
                                      ? `${Math.round(stats.paymentChannels.transfer / stats.todayRevenue * 100)}%` 
                                      : '0%'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="card border-0 shadow-sm h-100">
                            <div className="card-body">
                              <div className="d-flex align-items-center mb-2">
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,193,7,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffc107', fontSize: '20px' }}>
                                  <i className="fas fa-credit-card"></i>
                                </div>
                                <div className="ms-3">
                                  <span className="d-block fw-bold">บัตรเครดิต/เดบิต</span>
                                </div>
                              </div>
                              <div className="mt-2">
                                <h4 className="mb-1">฿{stats.paymentChannels.credit ? stats.paymentChannels.credit.toLocaleString() : '0'}</h4>
                                <div className="d-flex align-items-center">
                                  <div className="progress flex-grow-1" style={{ height: '8px' }}>
                                    <div 
                                      className="progress-bar bg-warning" 
                                      role="progressbar" 
                                      style={{ 
                                        width: `${stats.paymentChannels.credit && stats.todayRevenue ? (stats.paymentChannels.credit / stats.todayRevenue * 100) : 0}%` 
                                      }}
                                      aria-valuenow={stats.paymentChannels.credit || 0} 
                                      aria-valuemin="0" 
                                      aria-valuemax={stats.todayRevenue || 100}>
                                    </div>
                                  </div>
                                  <span className="ms-2 text-muted small">
                                    {stats.paymentChannels.credit && stats.todayRevenue 
                                      ? `${Math.round(stats.paymentChannels.credit / stats.todayRevenue * 100)}%` 
                                      : '0%'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* แผนภูมิและกราฟ */}
                  <div className="row mt-4">
                    <div className="col-12">
                      {/* ปุ่มควบคุมแผนภูมิ */}
                      <div className="card border-0 shadow-sm mb-3">
                        <div className="card-header bg-gradient text-white p-4" style={{ background: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)', borderBottom: '3px solid #ff7730' }}>
                          <div className="row align-items-center">
                            <div className="col-md-6">
                              <h6 className="mb-0" style={{ color: '#ff7730' }}>
                                <i className="fas fa-chart-bar me-2"></i>
                                ตัวเลือกแผนภูมิ
                              </h6>
                            </div>
                            <div className="col-md-6">
                              <div className="d-flex align-items-center justify-content-md-end gap-3">
                                {/* ปุ่มสลับ รายวัน/รายเดือน */}
                                <div className="btn-group" role="group">
                                  <button 
                                    type="button" 
                                    className={`btn btn-sm ${chartSettings.viewType === 'daily' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setChartSettings(prev => ({ ...prev, viewType: 'daily' }))}
                                  >
                                    <i className="fas fa-calendar-day me-1"></i>
                                    รายวัน
                                  </button>
                                  <button 
                                    type="button" 
                                    className={`btn btn-sm ${chartSettings.viewType === 'monthly' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setChartSettings(prev => ({ ...prev, viewType: 'monthly' }))}
                                  >
                                    <i className="fas fa-calendar-alt me-1"></i>
                                    รายเดือน
                                  </button>
                                </div>
                                
                                {/* เลือกช่วงวันที่ (แสดงเฉพาะเมื่อเป็นรายวัน) */}
                                {chartSettings.viewType === 'daily' && (
                                  <div className="d-flex align-items-center gap-2">
                                    <label className="form-label mb-0 text-muted small">ตั้งแต่:</label>
                                    <input 
                                      type="date" 
                                      className="form-control form-control-sm" 
                                      value={chartSettings.dateRange.start}
                                      max={chartSettings.dateRange.end}
                                      onChange={(e) => setChartSettings(prev => ({
                                        ...prev,
                                        dateRange: { ...prev.dateRange, start: e.target.value }
                                      }))}
                                      style={{ width: '140px' }}
                                    />
                                    <span className="text-muted">ถึง:</span>
                                    <input 
                                      type="date" 
                                      className="form-control form-control-sm" 
                                      value={chartSettings.dateRange.end}
                                      min={chartSettings.dateRange.start}
                                      max={new Date().toISOString().split('T')[0]}
                                      onChange={(e) => setChartSettings(prev => ({
                                        ...prev,
                                        dateRange: { ...prev.dateRange, end: e.target.value }
                                      }))}
                                      style={{ width: '140px' }}
                                    />
                                  </div>
                                )}
                                
                                {/* ปุ่มรีเซ็ต */}
                                <button 
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => setChartSettings({
                                    viewType: 'daily',
                                    dateRange: {
                                      start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
                                      end: new Date().toISOString().split('T')[0]
                                    }
                                  })}
                                  title="รีเซ็ตเป็นค่าเริ่มต้น (7 วันล่าสุด)"
                                >
                                  <i className="fas fa-undo"></i>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-lg-8">
                      {/* แผนภูมิการจองต่อวัน/เดือน */}
                      <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-gradient text-white p-4" style={{ background: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)', borderBottom: '3px solid #ff7730' }}>
                          <h5 className="mb-0" style={{ color: '#ff7730' }}>
                            <i className="fas fa-chart-line me-2"></i>
                            {chartSettings.viewType === 'daily' 
                              ? `จำนวนการจองต่อวัน (${new Date(chartSettings.dateRange.start).toLocaleDateString('th-TH')} - ${new Date(chartSettings.dateRange.end).toLocaleDateString('th-TH')})`
                              : 'แนวโน้มการจองรายเดือน (6 เดือนล่าสุด)'
                            }
                          </h5>
                        </div>
                        <div className="card-body">
                          <div className="chart-container" style={{ height: '250px', display: 'flex', alignItems: 'end', gap: '10px', padding: '20px 0' }}>
                            {chartSettings.viewType === 'daily' ? (
                              chartData.dailyBookings.length > 0 ? (
                                chartData.dailyBookings.map((item, index) => {
                                  const maxCount = Math.max(...chartData.dailyBookings.map(d => d.count));
                                  const height = maxCount > 0 ? (item.count / maxCount) * 200 : 0;
                                  return (
                                    <div key={index} className="chart-bar" style={{ 
                                      flex: 1, 
                                      display: 'flex', 
                                      flexDirection: 'column', 
                                      alignItems: 'center',
                                      minHeight: '220px',
                                      justifyContent: 'end'
                                    }}>
                                      <div style={{
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        color: '#333',
                                        marginBottom: '5px'
                                      }}>
                                        {item.count}
                                      </div>
                                      <div style={{
                                        width: '100%',
                                        height: `${height}px`,
                                        background: `linear-gradient(135deg, #ff9900 0%, #ff7730 100%)`,
                                        borderRadius: '4px 4px 0 0',
                                        marginBottom: '10px',
                                        display: 'flex',
                                        alignItems: 'end',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontSize: '11px',
                                        transition: 'all 0.3s ease'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.target.style.transform = 'scale(1.05)';
                                        e.target.style.boxShadow = '0 4px 15px rgba(255,153,0,0.3)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.target.style.transform = 'scale(1)';
                                        e.target.style.boxShadow = 'none';
                                      }}
                                      ></div>
                                      <div style={{
                                        fontSize: '10px',
                                        color: '#666',
                                        textAlign: 'center',
                                        transform: 'rotate(-45deg)',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {new Date(item.date).toLocaleDateString('th-TH', { 
                                          month: 'short', 
                                          day: 'numeric' 
                                        })}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="text-center w-100" style={{ color: '#999' }}>
                                  <i className="fas fa-chart-line fa-3x mb-3"></i>
                                  <p>ไม่มีข้อมูลการจองในช่วงเวลาที่เลือก</p>
                                </div>
                              )
                            ) : (
                              chartData.monthlyTrend.length > 0 ? (
                                chartData.monthlyTrend.map((item, index) => {
                                  const maxCount = Math.max(...chartData.monthlyTrend.map(m => m.count));
                                  const height = maxCount > 0 ? (item.count / maxCount) * 200 : 0;
                                  return (
                                    <div key={index} className="chart-bar" style={{ 
                                      flex: 1, 
                                      display: 'flex', 
                                      flexDirection: 'column', 
                                      alignItems: 'center',
                                      minHeight: '220px',
                                      justifyContent: 'end'
                                    }}>
                                      <div style={{
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        color: '#333',
                                        marginBottom: '8px'
                                      }}>
                                        {item.count}
                                      </div>
                                      <div style={{
                                        width: '80%',
                                        height: `${height}px`,
                                        background: `linear-gradient(135deg, #28a745 0%, #20c997 100%)`,
                                        borderRadius: '8px 8px 0 0',
                                        marginBottom: '15px',
                                        display: 'flex',
                                        alignItems: 'end',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontSize: '12px',
                                        transition: 'all  0.3s ease',
                                        cursor: 'pointer'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.target.style.transform = 'translateY(-5px)';
                                        e.target.style.boxShadow = '0 8px 25px rgba(40,167,69,0.3)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.target.style.transform = 'translateY(0)';
                                        e.target.style.boxShadow = 'none';
                                      }}
                                      ></div>
                                      <div style={{
                                        fontSize: '12px',
                                        color: '#666',
                                        textAlign: 'center',
                                        fontWeight: '500'
                                      }}>
                                        {new Date(item.month + '-01').toLocaleDateString('th-TH', { 
                                          month: 'short', 
                                          year: '2-digit' 
                                        })}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="text-center w-100" style={{ color: '#999' }}>
                                  <i className="fas fa-chart-area fa-3x mb-3"></i>
                                  <p>ยังไม่มีข้อมูลแนวโน้มรายเดือน</p>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-lg-4">
                      {/* บริการยอดนิยม */}
                      <div className="card border-0 shadow-sm h-100">
                        <div className="card-header bg-gradient text-white p-4" style={{ background: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)', borderBottom: '3px solid #ff7730' }}>
                          <h5 className="mb-0" style={{ color: '#ff7730' }}>
                            <i className="fas fa-star me-2"></i>
                            บริการยอดนิยม
                          </h5>
                        </div>
                        <div className="card-body">
                          {chartData.popularServices.length > 0 ? (
                            <div className="list-group list-group-flush">
                              {chartData.popularServices.map((item, index) => {
                                const maxCount = Math.max(...chartData.popularServices.map(s => s.count));
                                const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                                const colors = ['#ff7730', '#0d6efd', '#28a745', '#dc3545', '#6f42c1'];
                                return (
                                  <div key={index} className="list-group-item border-0 px-0 py-2">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                      <span className="fw-medium" style={{ fontSize: '14px' }}>
                                        {item.service}
                                      </span>
                                      <span className="badge rounded-pill" style={{ 
                                        backgroundColor: colors[index % colors.length],
                                        color: 'white'
                                      }}>
                                        {item.count}
                                      </span>
                                    </div>
                                    <div className="progress" style={{ height: '8px' }}>
                                      <div 
                                        className="progress-bar" 
                                        style={{ 
                                          width: `${percentage}%`,
                                          backgroundColor: colors[index % colors.length],
                                          transition: 'width 0.6s ease'
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center" style={{ color: '#999' }}>
                              <i className="fas fa-spa fa-3x mb-3"></i>
                              <p>ยังไม่มีข้อมูลบริการ</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {active === 'promotion' && (
            <div className="animate-fade-in">
              <PromotionAdd />
            </div>
          )}
          {active === 'payment-report' && (
            <div className="animate-fade-in">
              <PaymentReport />
            </div>
          )}
        </div>
      </div>
      
      {/* Modal แสดงรายละเอียดการจอง */}
      {showBookingDetails && selectedBooking && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content" style={{ borderRadius: '15px', border: 'none', overflow: 'hidden' }}>
              <div className="modal-header" style={{ 
                background: 'linear-gradient(135deg, #2c3e50 0%, #1a1a1a 100%)', 
                color: 'white',
                border: 'none'
              }}>
                <h5 className="modal-title">
                  <i className="fas fa-info-circle me-2" style={{ color: '#ff7730' }}></i>
                  รายละเอียดการจอง - {selectedBooking.id}
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowBookingDetails(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="row mb-4">
                  <div className="col-md-6">
                    <div className="card h-100" style={{ borderRadius: '10px', border: '1px solid #e9ecef' }}>
                      <div className="card-header bg-light" style={{ borderRadius: '10px 10px 0 0' }}>
                        <h6 className="mb-0">
                          <i className="fas fa-user me-2" style={{ color: '#ff7730' }}></i>
                          ข้อมูลลูกค้า
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="mb-3">
                          <small className="text-muted d-block">อีเมล</small>
                          <div className="fw-medium">{selectedBooking.userEmail || 'ไม่ระบุ'}</div>
                        </div>
                        {selectedBooking.userName && (
                          <div className="mb-3">
                            <small className="text-muted d-block">ชื่อผู้ใช้</small>
                            <div className="fw-medium">{selectedBooking.userName}</div>
                          </div>
                        )}
                        {selectedBooking.fullName && (
                          <div className="mb-3">
                            <small className="text-muted d-block">ชื่อ-นามสกุล</small>
                            <div className="fw-medium">{selectedBooking.fullName}</div>
                          </div>
                        )}
                        <div className="mb-3">
                          <small className="text-muted d-block">รหัสสมาชิก</small>
                          <div className="fw-medium">
                            {selectedBooking.userId || selectedBooking.memberId || 'ไม่ระบุ'}
                          </div>
                        </div>
                        <div>
                          <small className="text-muted d-block">สร้างเมื่อ</small>
                          <div className="fw-medium">
                            {selectedBooking.createdAt ? 
                              selectedBooking.createdAt.toLocaleString('th-TH', { 
                                day: 'numeric', 
                                month: 'long', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'ไม่ระบุ'
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card h-100" style={{ borderRadius: '10px', border: '1px solid #e9ecef' }}>
                      <div className="card-header bg-light" style={{ borderRadius: '10px 10px 0 0' }}>
                        <h6 className="mb-0">
                          <i className="fas fa-spa me-2" style={{ color: '#ff7730' }}></i>
                          ข้อมูลบริการ
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="mb-3">
                          <small className="text-muted d-block">บริการ</small>
                          <div className="fw-medium">{selectedBooking.service || selectedBooking.serviceName || 'ไม่ระบุ'}</div>
                        </div>
                        <div className="mb-3">
                          <small className="text-muted d-block">รหัสบริการ</small>
                          <div className="fw-medium">{selectedBooking.serviceId ? selectedBooking.serviceId : 'ไม่ระบุ'}</div>
                        </div>
                        <div className="row">
                          <div className="col-6">
                            <small className="text-muted d-block">ระยะเวลา</small>
                            <div className="fw-medium">{selectedBooking.duration || '0'} นาที</div>
                          </div>
                          <div className="col-6">
                            <small className="text-muted d-block">ราคา</small>
                            <div className="fw-bold" style={{ color: '#198754' }}>฿{selectedBooking.price || '0'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row mb-4">
                  <div className="col-md-6">
                    <div className="card h-100" style={{ borderRadius: '10px', border: '1px solid #e9ecef' }}>
                      <div className="card-header bg-light" style={{ borderRadius: '10px 10px 0 0' }}>
                        <h6 className="mb-0">
                          <i className="fas fa-calendar-alt me-2" style={{ color: '#ff7730' }}></i>
                          ข้อมูลการจอง
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="mb-3">
                          <small className="text-muted d-block">วันที่จอง</small>
                          <div className="fw-medium">
                            {selectedBooking.bookingDate ? 
                              new Date(selectedBooking.bookingDate).toLocaleDateString('th-TH', { 
                                day: 'numeric', 
                                month: 'long', 
                                year: 'numeric',
                                weekday: 'long'
                              }) : 'ไม่ระบุ'
                            }
                          </div>
                        </div>
                        <div className="mb-3">
                          <small className="text-muted d-block">เวลา</small>
                          <div className="fw-medium">{selectedBooking.bookingTime ? `${selectedBooking.bookingTime} น.` : (selectedBooking.time ? `${selectedBooking.time} น.` : 'ไม่ระบุ')}</div>
                        </div>
                        <div>
                          <small className="text-muted d-block">พนักงาน</small>
                          <div className="fw-medium">{selectedBooking.employeeName ? selectedBooking.employeeName : (selectedBooking.employeeFullName ? selectedBooking.employeeFullName : 'ยังไม่กำหนด')}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card h-100" style={{ borderRadius: '10px', border: '1px solid #e9ecef' }}>
                      <div className="card-header bg-light" style={{ borderRadius: '10px 10px 0 0' }}>
                        <h6 className="mb-0">
                          <i className="fas fa-check-circle me-2" style={{ color: '#ff7730' }}></i>
                          สถานะ
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="mb-3">
                          <small className="text-muted d-block">สถานะการจอง</small>
                          <div>
                            <span className={`badge ${
                              selectedBooking.status === 'ยืนยันแล้ว' ? 'bg-success' : 
                              selectedBooking.status === 'ปฏิเสธ' ? 'bg-danger' :
                              selectedBooking.status === 'เสร็จสิ้น' ? 'bg-primary' :
                              'bg-warning text-dark'
                            } rounded-pill p-2`}>
                              <i className={`fas ${
                                selectedBooking.status === 'ยืนยันแล้ว' ? 'fa-check' : 
                                selectedBooking.status === 'ปฏิเสธ' ? 'fa-times' :
                                selectedBooking.status === 'เสร็จสิ้น' ? 'fa-check-circle' :
                                'fa-clock'
                              } me-1`}></i>
                              {selectedBooking.status || 'รอชำระเงิน'}
                            </span>
                          </div>
                        </div>
                        <div className="mb-3">
                          <small className="text-muted d-block">สถานะการชำระเงิน</small>
                          <div>
                            <span className={`badge ${
                              selectedBooking.paymentStatus === 'ชำระเงินแล้ว' ? 'bg-success' : 
                              selectedBooking.paymentStatus === 'ยกเลิก' ? 'bg-secondary' :
                              'bg-warning text-dark'
                            } rounded-pill p-2`}>
                              <i className={`fas ${
                                selectedBooking.paymentStatus === 'ชำระเงินแล้ว' ? 'fa-check-circle' : 
                                selectedBooking.paymentStatus === 'ยกเลิก' ? 'fa-ban' :
                                'fa-hourglass-half'
                              } me-1`}></i>
                              {selectedBooking.paymentStatus || 'รอชำระเงิน'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <small className="text-muted d-block">วิธีการชำระเงิน</small>
                          <div className="fw-medium">
                            {selectedBooking.paymentMethod === 'cash' ? 'เงินสด' : 
                             selectedBooking.paymentMethod === 'transfer' ? 'โอนเงิน' :
                             selectedBooking.paymentMethod === 'credit' ? 'บัตรเครดิต/เดบิต' :
                             selectedBooking.paymentMethod || 'ไม่ระบุ'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-12">
                    <div className="card" style={{ borderRadius: '10px', border: '1px solid #e9ecef' }}>
                      <div className="card-header bg-light" style={{ borderRadius: '10px 10px 0 0' }}>
                        <h6 className="mb-0">
                          <i className="fas fa-history me-2" style={{ color: '#ff7730' }}></i>
                          ประวัติการดำเนินการ
                        </h6>
                      </div>
                      <div className="card-body">
                        <ul className="list-unstyled mb-0">
                          <li className="d-flex align-items-center mb-2">
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: 'rgba(255, 125, 41, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: '15px'
                            }}>
                              <i className="fas fa-plus" style={{ color: '#ff7730' }}></i>
                            </div>
                            <div>
                              <div className="fw-medium">สร้างการจอง</div>
                              <small className="text-muted">
                                {selectedBooking.createdAt ? 
                                  selectedBooking.createdAt.toLocaleString('th-TH', { 
                                    day: 'numeric', 
                                    month: 'long', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : 'ไม่ระบุ'
                                }
                              </small>
                            </div>
                          </li>
                          
                          {selectedBooking.approvedAt && (
                            <li className="d-flex align-items-center mb-2">
                              <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'rgba(40, 167, 69, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: '15px'
                              }}>
                                <i className="fas fa-check" style={{ color: '#28a745' }}></i>
                              </div>
                              <div>
                                <div className="fw-medium">อนุมัติการจอง</div>
                                <small className="text-muted">
                                  {new Date(selectedBooking.approvedAt).toLocaleString('th-TH', { 
                                    day: 'numeric', 
                                    month: 'long', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </small>
                              </div>
                            </li>
                          )}
                          
                          {selectedBooking.rejectedAt && (
                            <li className="d-flex align-items-center mb-2">
                              <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'rgba(220, 53, 69, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: '15px'
                              }}>
                                <i className="fas fa-times" style={{ color: '#dc3545' }}></i>
                              </div>
                              <div>
                                <div className="fw-medium">ปฏิเสธการจอง</div>
                                <small className="text-muted">
                                  {new Date(selectedBooking.rejectedAt).toLocaleString('th-TH', { 
                                    day: 'numeric', 
                                    month: 'long', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </small>
                              </div>
                            </li>
                          )}
                          
                          {selectedBooking.paidAt && (
                            <li className="d-flex align-items-center">
                              <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'rgba(0, 123, 255, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: '15px'
                              }}>
                                <i className="fas fa-money-bill-wave" style={{ color: '#0d6efd' }}></i>
                              </div>
                              <div>
                                <div className="fw-medium">ชำระเงิน</div>
                                <small className="text-muted">
                                  {new Date(selectedBooking.paidAt).toLocaleString('th-TH', { 
                                    day: 'numeric', 
                                    month: 'long', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </small>
                              </div>
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer" style={{ border: 'none' }}>
                  <div className="d-flex justify-content-between w-100">
                    <div>
                      {(selectedBooking.status === 'รอชำระเงิน' || !selectedBooking.status) && (
                        <button 
                          className="btn btn-success me-2" 
                          onClick={() => {
                            approveBooking(selectedBooking.id);
                            setShowBookingDetails(false);
                          }}
                        >
                          <i className="fas fa-check me-2"></i>
                          อนุมัติการจอง
                        </button>
                      )}
                      
                      {(selectedBooking.status === 'ยืนยันแล้ว' || selectedBooking.status === 'รอชำระเงิน') && 
                        selectedBooking.paymentStatus === 'รอชำระเงิน' && (
                        <button 
                          className="btn btn-primary me-2" 
                          onClick={() => {
                            confirmPayment(selectedBooking.id);
                            setShowBookingDetails(false);
                          }}
                        >
                          <i className="fas fa-money-bill-wave me-2"></i>
                          ยืนยันการชำระเงิน
                        </button>
                      )}
                    </div>
                    
                    <div>
                      {(selectedBooking.status === 'รอชำระเงิน' || selectedBooking.status === 'ยืนยันแล้ว') && (
                        <button 
                          className="btn btn-outline-warning me-2" 
                          onClick={() => {
                            rejectBooking(selectedBooking.id);
                            setShowBookingDetails(false);
                          }}
                        >
                          <i className="fas fa-ban me-2"></i>
                          ยกเลิกการจอง
                        </button>
                      )}
                      
                      <button 
                        className="btn btn-outline-danger me-2" 
                        onClick={() => {
                          if (window.confirm('ต้องการลบการจองนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถยกเลิกได้')) {
                            deleteBooking(selectedBooking.id);
                            setShowBookingDetails(false);
                          }
                        }}
                      >
                        <i className="fas fa-trash-alt me-2"></i>
                        ลบการจอง
                      </button>
                      
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => setShowBookingDetails(false)}
                      >
                        ปิด
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardOwner;