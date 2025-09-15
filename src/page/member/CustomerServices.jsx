import React, { useState, useEffect } from 'react';
import { db } from '../../Firebase';
import { collection, getDocs, addDoc, Timestamp, query, where, setDoc, doc, getDoc, updateDoc, writeBatch, increment } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function CustomerServices() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]); // เพิ่มตัวแปรสำหรับเก็บบริการที่กรองแล้ว
  const [selectedType, setSelectedType] = useState(''); // เพิ่มตัวแปรสำหรับเลือกประเภทบริการ
  const [userDetails, setUserDetails] = useState(null); // เพิ่มตัวแปรเก็บข้อมูลผู้ใช้จาก Firestore
  const [loading, setLoading] = useState(true);
  const [bookingService, setBookingService] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [employees, setEmployees] = useState([]);
  const [employeeSchedules, setEmployeeSchedules] = useState({}); // { employeeId: [ {date, start, end}, ... ] }
  const [submitting, setSubmitting] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [activeTab, setActiveTab] = useState('booking');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [serviceTypes, setServiceTypes] = useState([]); // เพิ่มตัวแปรสำหรับเก็บประเภทบริการทั้งหมด
  
  // ตัวแปรสำหรับส่วนลด
  const [availableDiscounts, setAvailableDiscounts] = useState([]); // เก็บรายการส่วนลดที่ใช้งานได้
  const [selectedDiscount, setSelectedDiscount] = useState(null); // ส่วนลดที่เลือกใช้
  const [appliedDiscount, setAppliedDiscount] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);

  // ฟังก์ชันคำนวณส่วนลด
  const getDiscountPercent = () => {
    if (selectedDiscount && appliedDiscount) {
      return selectedDiscount.rewardValue || 0;
    }
    return 0;
  };

  // ฟังก์ชันคำนวณมูลค่าส่วนลด
  const getDiscountAmount = () => {
    if (!selectedDiscount || !appliedDiscount) return 0;
    const totalPrice = Number(getTotalPrice());
    // Fix: parseFloat to handle string with percent sign
    let percent = selectedDiscount.rewardValue;
    if (typeof percent === 'string') {
      percent = parseFloat(percent.replace('%', ''));
    }
    percent = Number(percent) || 0;
    let discountValue = (totalPrice * percent / 100);
    if (selectedDiscount.maxDiscount && discountValue > selectedDiscount.maxDiscount) {
      discountValue = Number(selectedDiscount.maxDiscount);
    }
    // Always return a valid number (as number, not string)
    return isNaN(discountValue) ? 0 : discountValue;
  };

  // ฟังก์ชันคำนวณราคาสุทธิหลังหักส่วนลด
  const getFinalPrice = () => {
    const total = Number(getTotalPrice());
    const discount = Number(getDiscountAmount());
    const final = total - discount;
    return isNaN(final) ? total.toFixed(2) : final.toFixed(2);
  };

  // ฟังก์ชันใช้คูปองส่วนลด
  const applyDiscountTicket = async () => {
    if (!selectedDiscount) return;

    try {
      // ตรวจสอบเงื่อนไขการใช้งาน (ถ้ามี)
      if (selectedDiscount.minimumPurchase && getTotalPrice() < selectedDiscount.minimumPurchase) {
        alert(`ต้องมียอดสั่งซื้อขั้นต่ำ ${selectedDiscount.minimumPurchase} บาท`);
        return false;
      }

      setAppliedDiscount(true);
      
      // แสดงการแจ้งเตือนเมื่อใช้คูปองส่วนลดสำเร็จ
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(45deg, #FF7D29, #FFB067);
          color: white;
          padding: 15px 20px;
          border-radius: 10px;
          box-shadow: 0 8px 25px rgba(255, 125, 41, 0.3);
          z-index: 10000;
          animation: slideInRight 0.5s ease;
          max-width: 300px;
        ">
          <div style="display: flex; align-items: center;">
            <i class="fas fa-ticket-alt" style="font-size: 1.5rem; margin-right: 10px;"></i>
            <div>
              <div style="font-weight: bold; margin-bottom: 5px;">ใช้คูปองส่วนลดสำเร็จ!</div>
              <div style="font-size: 0.9rem; opacity: 0.9;">
                คุณได้รับส่วนลด ${selectedDiscount.rewardValue}%
                ${selectedDiscount.maxDiscount ? `(สูงสุด ${selectedDiscount.maxDiscount} บาท)` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(notification);

      setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.5s ease';
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 500);
      }, 3000);

      return true;
    } catch (error) {
      console.error('Error applying discount ticket:', error);
      alert('เกิดข้อผิดพลาดในการใช้คูปองส่วนลด กรุณาลองใหม่อีกครั้ง');
      return false;
    }
  };

  // ฟังก์ชันสำหรับกรองบริการตามประเภท
  const filterServicesByType = (services, type) => {
    if (!type) return services;
    return services.filter(service => service.type === type);
  };

  // ฟังก์ชันสำหรับเรียงบริการตามรหัส
  const sortServicesById = (services) => {
    return [...services].sort((a, b) => {
      if (a.id < b.id) return -1;
      if (a.id > b.id) return 1;
      return 0;
    });
  };
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Step 1: ดึงข้อมูลบริการ
        let servicesData = [];
        try {
          const servicesSnap = await getDocs(collection(db, 'Services'));
          servicesData = servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (serviceError) {
          console.error('Error fetching services:', serviceError);
          servicesData = []; // ใช้ array ว่างถ้าเกิดข้อผิดพลาด
        }
        
        // เรียงบริการตามรหัส
        const sortedServices = sortServicesById(servicesData);
        setServices(sortedServices);
        setFilteredServices(sortedServices);
        
        // ดึงประเภทบริการที่มีทั้งหมด (unique)
        const types = [...new Set(sortedServices.map(service => service.type).filter(Boolean))];
        setServiceTypes(types);

        // Step 2: ดึงข้อมูลพนักงาน (เฉพาะรายชื่อ)
        let employeesData = [];
        try {
          const employeesSnap = await getDocs(collection(db, '/artifacts/login-spa-7921d/users'));
          employeesData = employeesSnap.docs
            .map(doc => ({ ...doc.data(), id: doc.id })) // ใช้ doc.id (uid จริง) เป็น id
            .filter(user => user.role === 'employee');
          console.log('Found employee data:', employeesData);
          setEmployees(employeesData);
        } catch (empError) {
          console.error('Error fetching employees:', empError);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  
  // ใช้ useEffect เพื่อกรองบริการเมื่อมีการเลือกประเภท
  useEffect(() => {
    const filtered = filterServicesByType(services, selectedType);
    setFilteredServices(filtered);
  }, [selectedType, services]);

  // ดึงข้อมูลผู้ใช้และส่วนลดจาก Firestore
  useEffect(() => {
    const fetchUserDetailsAndDiscounts = async () => {
      if (!user) return;
      
      try {
        // ดึงข้อมูลผู้ใช้
        const projectId = 'login-spa-7921d';
        const userDocRef = doc(db, 'artifacts', projectId, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        
        if (docSnap.exists()) {
          setUserDetails(docSnap.data());
          console.log('User details loaded:', docSnap.data());
        } else {
          const altDocSnap = await getDoc(doc(db, 'users', user.uid));
          if (altDocSnap.exists()) {
            setUserDetails(altDocSnap.data());
            console.log('User details loaded from alt path:', altDocSnap.data());
          } else {
            console.log('User document not found in any expected path');
          }
        }

        // ดึงข้อมูลส่วนลดที่ยังไม่ถูกใช้
        const redemptionsRef = collection(db, 'Redemptions');
        const redemptionsQuery = query(
          redemptionsRef,
          where('userId', '==', user.uid),
          where('used', '==', false),
          where('rewardType', '==', 'discount')
        );
        const redemptionsSnapshot = await getDocs(redemptionsQuery);
        const activeDiscounts = redemptionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log('Available discounts:', activeDiscounts);
        setAvailableDiscounts(activeDiscounts);

      } catch (error) {
        console.error('Error fetching user details and discounts:', error);
      }
    };
    
    fetchUserDetailsAndDiscounts();
  }, [user]);
  
  // ฟังก์ชันหาพนักงานที่ว่างในวันและเวลาที่เลือก
  const getAvailableEmployees = (date, time, duration = 60) => {
    if (!date || !time) return [];

    // แปลงเวลาที่ต้องการจองเป็นนาที
    const [bookingHour, bookingMin] = time.split(":").map(Number);
    const bookingStartTime = bookingHour * 60 + bookingMin;
    const bookingEndTime = bookingStartTime + duration;

    return employees.filter(emp => {
      // ตรวจสอบการจองที่มีอยู่ในตะกร้า
      const cartConflict = cartItems.some(item => {
        if (item.employee === emp.id && item.date === date) {
          const [itemHour, itemMin] = item.time.split(":").map(Number);
          const itemStartTime = itemHour * 60 + itemMin;
          const itemEndTime = itemStartTime + item.service.duration;

          // ตรวจสอบการทับซ้อนของเวลา
          return (
            (bookingStartTime >= itemStartTime && bookingStartTime < itemEndTime) ||
            (bookingEndTime > itemStartTime && bookingEndTime <= itemEndTime) ||
            (bookingStartTime <= itemStartTime && bookingEndTime >= itemEndTime)
          );
        }
        return false;
      });

      // ถ้ามีการทับซ้อนในตะกร้า ไม่สามารถเลือกพนักงานคนนี้ได้
      if (cartConflict) return false;

      // ตรวจสอบตารางงานที่มีอยู่
      const schedules = employeeSchedules[emp.id] || [];
      const schedulesConflict = schedules.some(sch => {
        if (sch.date === date) {
          const [startHour, startMin] = sch.start.split(":").map(Number);
          const [endHour, endMin] = sch.end.split(":").map(Number);
          const scheduleStartTime = startHour * 60 + startMin;
          const scheduleEndTime = endHour * 60 + endMin;

          // ตรวจสอบการทับซ้อนของเวลา
          return (
            (bookingStartTime >= scheduleStartTime && bookingStartTime < scheduleEndTime) ||
            (bookingEndTime > scheduleStartTime && bookingEndTime <= scheduleEndTime) ||
            (bookingStartTime <= scheduleStartTime && bookingEndTime >= scheduleEndTime)
          );
        }
        return false;
      });

      // คืนค่า true ถ้าไม่มีการทับซ้อนของเวลา
      return !schedulesConflict;
    });
  };

  // อัปเดตเวลาทุกวินาที
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // ฟังก์ชันเพิ่มลงตะกร้า
  const addToCart = (service, date, time, employee) => {
    if (!date) {
      alert('กรุณาเลือกวันที่');
      return;
    }
    
    if (!time || !validateBookingTime(time)) {
      alert('กรุณาเลือกเวลาระหว่าง 10:00 - 23:00 น. เท่านั้น');
      return;
    }

    // ตรวจสอบว่าพนักงานที่เลือกยังว่างอยู่
    if (employee) {
      const availableEmployees = getAvailableEmployees(date, time, service.duration);
      if (!availableEmployees.some(emp => emp.id === employee)) {
        alert('ขออภัย พนักงานที่เลือกไม่ว่างในช่วงเวลานี้ กรุณาเลือกพนักงานท่านอื่น หรือเปลี่ยนเวลาจอง');
        return;
      }
    }

    // ตรวจสอบการทับซ้อนของเวลาในตะกร้า
    const [bookingHour, bookingMin] = time.split(":").map(Number);
    const bookingStartTime = bookingHour * 60 + bookingMin;
    const bookingEndTime = bookingStartTime + service.duration;

    const hasTimeConflict = cartItems.some(item => {
      if (item.date === date) {
        const [itemHour, itemMin] = item.time.split(":").map(Number);
        const itemStartTime = itemHour * 60 + itemMin;
        const itemEndTime = itemStartTime + item.service.duration;

        // ตรวจสอบการทับซ้อนของเวลา
        if (
          (bookingStartTime >= itemStartTime && bookingStartTime < itemEndTime) ||
          (bookingEndTime > itemStartTime && bookingEndTime <= itemEndTime) ||
          (bookingStartTime <= itemStartTime && bookingEndTime >= itemEndTime)
        ) {
          if (employee && item.employee === employee) {
            return true; // มีการทับซ้อนของเวลากับพนักงานคนเดียวกัน
          }
        }
      }
      return false;
    });

    if (hasTimeConflict) {
      alert('ขออภัย พนักงานที่เลือกมีการจองในช่วงเวลานี้แล้ว กรุณาเลือกเวลาอื่นหรือเปลี่ยนพนักงาน');
      return;
    }

    const cartItem = {
      id: Date.now(), // unique id for cart item
      service: service,
      date: date,
      time: time,
      employee: employee,
      addedAt: new Date() // เพิ่มเวลาที่เพิ่มลงตะกร้า
    };

    setCartItems([...cartItems, cartItem]);
    setBookingService(null);
    setBookingDate('');
    setBookingTime('');
    setSelectedEmployee('');
    
    // แสดงข้อความแจ้งเตือนที่สวยงามขึ้น
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(45deg, #28a745, #20c997);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 8px 25px rgba(40, 167, 69, 0.3);
        z-index: 10000;
        animation: slideInRight 0.5s ease;
        max-width: 300px;
      ">
        <div style="display: flex; align-items: center;">
          <i class="fas fa-check-circle" style="font-size: 1.5rem; margin-right: 10px;"></i>
          <div>
            <div style="font-weight: bold; margin-bottom: 5px;">เพิ่มลงตะกร้าสำเร็จ!</div>
            <div style="font-size: 0.9rem; opacity: 0.9;">\${service.name}</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.5s ease';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 500);
    }, 3000);
  };

  // ฟังก์ชันลบจากตะกร้า
  const removeFromCart = (itemId) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
  };

  // ฟังก์ชันล้างตะกร้า
  const clearCart = () => {
    setCartItems([]);
  };

  // คำนวณราคารวม
  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => total + parseFloat(item.service.price), 0);
  };

  // ฟังก์ชันเปิด Modal จองคิว
  const openBookingModal = (service) => {
    if (!user) {
      alert('กรุณาเข้าสู่ระบบเพื่อจองบริการ');
      navigate('/login');
      return;
    }
    setBookingService(service);
    setBookingDate('');
    setBookingTime('');
    setSelectedEmployee('');
    setActiveTab('booking');
  };

  // ฟังก์ชันจองหลายรายการพร้อมชำระเงิน
  const handleMultipleBooking = async () => {
    if (cartItems.length === 0) {
      alert('ไม่มีรายการในตะกร้า');
      return;
    }

    setSubmitting(true);
    try {
      // สร้าง batch เพื่อทำ transaction
      const batch = writeBatch(db);
      const bookingIds = [];

      // หากมีการใช้ส่วนลดจาก Redemptions
      if (selectedDiscount) {
        // อัปเดตสถานะการใช้งานส่วนลด
        const redemptionRef = doc(db, 'Redemptions', selectedDiscount.id);
        batch.update(redemptionRef, {
          used: true,
          usedAt: Timestamp.now()
        });
      }

      // สร้าง Payment record
      const paymentId = `P${Math.floor(100000 + Math.random() * 900000)}`;
      const paymentRef = doc(db, 'Payments', paymentId);
      const paymentData = {
        paymentMethod: paymentMethod,
        paymentStatus: 'รอชำระเงิน',
        totalAmount: parseFloat(getFinalPrice()),
        discountAmount: parseFloat(getDiscountAmount()),
        redemptionsId: selectedDiscount ? selectedDiscount.id : null,
        createdAt: Timestamp.now()
      };
      batch.set(paymentRef, paymentData);

      // สร้าง Booking records
      for (const item of cartItems) {
        const bookingId = `B${Math.floor(100000 + Math.random() * 900000)}`;
        bookingIds.push(bookingId);

        // Booking record (merged with BookingDetails)
        const bookingRef = doc(db, 'Bookings', bookingId);
        const bookingData = {
          userId: user.uid,
          serviceId: item.service.id,
          employeeId: item.employee || '',
          bookingDate: item.date,
          bookingTime: item.time,
          status: 'รอชำระเงิน',
          paymentId: paymentId,
          createdAt: Timestamp.now(),
          duration: item.service.duration,
          price: parseFloat(item.service.price),
          canReview: true,
          reviewsId: ''
        };
        batch.set(bookingRef, bookingData);
      }

      // อัปเดต Payment record ด้วย bookingIds
      batch.update(paymentRef, { bookingIds: bookingIds });

      // บันทึกประวัติการใช้คูปองส่วนลด
      if (appliedDiscount && selectedDiscount) {
        // อัปเดตสถานะการใช้งานคูปองส่วนลด
        batch.update(doc(db, 'Redemptions', selectedDiscount.id), {
          used: true,
          usedAt: Timestamp.now(),
          orderAmount: parseFloat(getTotalPrice()),
          discountAmount: parseFloat(getDiscountAmount())
        });
      }

      // เพิ่มแต้มจากการซื้อสินค้า/บริการ ทุกชนิด 10 แต้มต่อรายการ
      for (const item of cartItems) {
        const pointHistoryId = `PH${Math.floor(100000 + Math.random() * 900000)}`;
        const pointHistoryRef = doc(db, 'PointHistory', pointHistoryId);
        const pointHistoryData = {
          userId: user.uid,
          userEmail: user.email,
          points: 10,
          type: 'EARN',
          source: 'PURCHASE',
          paymentId: paymentId,
          serviceId: item.service.id,
          amount: parseFloat(item.service.price),
          reason: `ได้รับแต้มจากการซื้อสินค้า/บริการ ${item.service.name}`,
          status: 'ACTIVE',
          expiryDate: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)),
          createdAt: Timestamp.now()
        };
        batch.set(pointHistoryRef, pointHistoryData);
      }

      // เพิ่มแต้มรีวิวหลังใช้บริการ 5 แต้ม (เมื่อ reviewed = true)
      // ตัวอย่าง: สามารถเรียกใช้ logic นี้หลังจากรีวิวจริง หรือในจุดที่ reviewed ถูกเปลี่ยนเป็น true
      // for (const item of cartItems) {
      //   if (item.reviewed) {
      //     const reviewPointId = `PH${Math.floor(100000 + Math.random() * 900000)}`;
      //     const reviewPointRef = doc(db, 'PointHistory', reviewPointId);
      //     batch.set(reviewPointRef, {
      //       userId: user.uid,
      //       userEmail: user.email,
      //       points: 5,
      //       type: 'REVIEW',
      //       source: 'REVIEW',
      //       serviceId: item.service.id,
      //       reason: `ได้รับแต้มจากการรีวิวสินค้า/บริการ ${item.service.name}`,
      //       status: 'ACTIVE',
      //       createdAt: Timestamp.now()
      //     });
      //   }
      // }

      // Commit batch transaction
      await batch.commit();
      
      clearCart();
      setShowPaymentSuccess(true);
      setShowCart(false);
      // รีเซ็ตค่าส่วนลดทั้งหมด
      setAppliedDiscount(false);
      setSelectedDiscount(null);
      setDiscountPercent(0);
      // รีเฟรชแต้มสะสมหลังจอง/ชำระเงิน
      if (user?.uid) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserDetails(userSnap.data());
        }
      }
    } catch (error) {
      console.error('Error booking:', error);
      alert('เกิดข้อผิดพลาดในการจอง กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  };

  // สร้างวันที่ที่เลือกได้ (วันนี้ + 30 วัน)
  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  // Add this function to validate the time before adding to cart
  const validateBookingTime = (time) => {
    if (!time) return false;
    
    const [hours, minutes] = time.split(':').map(Number);
    const timeValue = hours * 60 + minutes;
    
    // Convert operating hours to minutes for comparison
    const openTime = 10 * 60; // 10:00
    const closeTime = 23 * 60; // 23:00
    
    return timeValue >= openTime && timeValue <= closeTime;
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%)'
    }}>
      {/* Header Section */}
      <div style={{
        background: 'linear-gradient(135deg, #2c3e50 0%, #1a2a38 100%)',
        color: 'white',
        padding: '60px 0 80px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* ปุ่มย้อนกลับ */}
        <button
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            color: 'white',
            fontSize: '1.2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            zIndex: 10,
            backdropFilter: 'blur(10px)'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 153, 0, 0.8)';
            e.target.style.borderColor = '#ff9900';
            e.target.style.transform = 'scale(1.1)';
            e.target.style.boxShadow = '0 5px 15px rgba(255, 153, 0, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.1)';
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = 'none';
          }}
        >
          <i className="fas fa-arrow-left"></i>
        </button>

        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ff9900" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          opacity: 0.3
        }}></div>
        <div className="container text-center" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(255, 153, 0, 0.2)',
            borderRadius: '50%',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <i className="fas fa-spa" style={{ fontSize: '3rem', color: '#ff9900' }}></i>
          </div>
          <h1 className="mb-3" style={{ 
            fontSize: '2.5rem',
            fontWeight: 'bold',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            เมนูบริการของเรา
          </h1>
          <p style={{ 
            fontSize: '1.2rem', 
            color: 'rgba(255,255,255,0.8)',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            เลือกบริการที่คุณต้องการและจองคิวได้เลย พร้อมระบบจองออนไลน์ที่สะดวกรวดเร็ว
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container" style={{ marginTop: '-40px', position: 'relative', zIndex: 3 }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px 30px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          border: '1px solid rgba(255, 153, 0, 0.1)'
        }}>
      
          {loading ? (
            <div className="text-center py-5">
            <div style={{
              display: 'inline-block',
              padding: '30px',
              background: 'rgba(255, 153, 0, 0.1)',
              borderRadius: '20px',
              marginBottom: '20px'
            }}>
              <div className="spinner-border" style={{ color: '#ff9900', width: '3rem', height: '3rem' }} role="status">
                <span className="visually-hidden">กำลังโหลด...</span>
              </div>
            </div>
            <h4 style={{ color: '#2c3e50', marginBottom: '10px' }}>กำลังโหลดบริการ...</h4>
            <p className="text-muted">โปรดรอสักครู่</p>
          </div>
        ) : (
          <>
            {/* Services Stats */}
            <div className="row mb-5">
              <div className="col-md-4 mb-3">
                <div style={{
                  background: 'linear-gradient(135deg, #ff9900, #ff7730)',
                  color: 'white',
                  padding: '25px',
                  borderRadius: '15px',
                  textAlign: 'center',
                  boxShadow: '0 5px 15px rgba(255, 153, 0, 0.3)'
                }}>
                  <i className="fas fa-spa fa-2x mb-2"></i>
                  <h4 className="mb-1">{services.length}</h4>
                  <p className="mb-0">บริการทั้งหมด</p>
                </div>
              </div>
              <div className="col-md-4 mb-3">
                <div style={{
                  background: 'white',
                  padding: '25px',
                  borderRadius: '15px',
                  textAlign: 'center',
                  boxShadow: '0 5px 15px rgba(44, 62, 80, 0.1)',
                  border: '1px solid rgba(255, 153, 0, 0.2)'
                }}>
                  <i className="fas fa-clock fa-2x mb-2" style={{ color: '#ff9900' }}></i>
                  <h4 className="mb-1" style={{ color: '#2c3e50' }}>10:00-23:00</h4>
                  <p className="mb-0 text-muted">เวลาทำการ</p>
                </div>
              </div>
              <div className="col-md-4 mb-3">
                <div style={{
                  background: 'white',
                  padding: '25px',
                  borderRadius: '15px',
                  textAlign: 'center',
                  boxShadow: '0 5px 15px rgba(44, 62, 80, 0.1)',
                  border: '1px solid rgba(255, 153, 0, 0.2)'
                }}>
                  <i className="fas fa-calendar-check fa-2x mb-2" style={{ color: '#ff9900' }}></i>
                  <h4 className="mb-1" style={{ color: '#2c3e50' }}>จองออนไลน์</h4>
                  <p className="mb-0 text-muted">ตลอด 24 ชั่วโมง</p>
                </div>
              </div>
            </div>

            <div className="row g-4">
              {/* เพิ่มตัวกรองประเภทบริการ */}
          <div className="mb-4">
            <h5 className="mb-3" style={{ 
              color: '#2c3e50', 
              fontWeight: '600', 
              display: 'flex', 
              alignItems: 'center' 
            }}>
              <i className="fas fa-filter me-2" style={{ color: '#ff9900' }}></i>
              ประเภทบริการ
            </h5>
            <div className="d-flex flex-wrap gap-2 mb-3">
              <button 
                className="btn shadow-sm"
                onClick={() => setSelectedType('')}
                style={{ 
                  backgroundColor: !selectedType ? '#ff9900' : '#f8f9fa',
                  color: !selectedType ? 'white' : '#6c757d',
                  border: !selectedType ? 'none' : '1px solid #dee2e6',
                  borderRadius: '25px',
                  padding: '8px 15px',
                  fontWeight: '500',
                  transition: 'all 0.3s ease'
                }}
              >
                <i className={`fas fa-spa me-1 ${!selectedType ? '' : 'text-muted'}`}></i> ทั้งหมด
                <span className="ms-2 badge bg-white text-dark">{services.length}</span>
              </button>
              {serviceTypes.map((type, index) => (
                <button 
                  key={index} 
                  className="btn shadow-sm"
                  onClick={() => setSelectedType(type)}
                  style={{ 
                    backgroundColor: selectedType === type ? '#ff9900' : '#f8f9fa',
                    color: selectedType === type ? 'white' : '#6c757d',
                    border: selectedType === type ? 'none' : '1px solid #dee2e6',
                    borderRadius: '25px',
                    padding: '8px 15px',
                    fontWeight: '500',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <i className={`fas fa-spa me-1 ${selectedType === type ? '' : 'text-muted'}`}></i> {type}
                  <span className="ms-2 badge bg-white text-dark">
                    {services.filter(s => s.type === type).length}
                  </span>
                </button>
              ))}
            </div>
            <div className="d-flex justify-content-between align-items-center">
              <p className="text-muted mb-0">
                <i className="fas fa-info-circle me-1"></i> 
                แสดง <span className="fw-bold text-success">{filteredServices.length}</span> จาก <span className="fw-bold">{services.length}</span> รายการ
              </p>
              
              <div className="btn-group">
                <button 
                  className="btn btn-sm btn-outline-secondary" 
                  onClick={() => setSelectedType('')}
                  disabled={!selectedType}
                >
                  <i className="fas fa-sync-alt me-1"></i> ล้างตัวกรอง
                </button>
              </div>
            </div>
          </div>

          {filteredServices.length === 0 ? (
                <div className="col-12 text-center py-5">
                  <div style={{
                    background: 'rgba(255, 153, 0, 0.1)',
                    borderRadius: '20px',
                    padding: '50px 30px',
                    border: '2px dashed rgba(255, 153, 0, 0.3)'
                  }}>
                    <i className="fas fa-filter fa-4x mb-4" style={{ color: 'rgba(255, 153, 0, 0.5)' }}></i>
                    <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>ไม่พบบริการที่ค้นหา</h4>
                    <p className="text-muted mb-4">
                      {selectedType 
                        ? <>ไม่พบบริการประเภท <span className="fw-bold" style={{ color: '#ff9900' }}>{selectedType}</span></>
                        : 'ขณะนี้ยังไม่มีบริการที่เปิดให้บริการ กรุณาติดตามข่าวสารจากทางร้าน'
                      }
                    </p>
                    <button 
                      className="btn"
                      onClick={() => setSelectedType('')}
                      style={{
                        background: 'linear-gradient(45deg, #ff9900, #ff7730)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '25px',
                        padding: '12px 30px',
                        fontWeight: '500',
                        boxShadow: '0 4px 15px rgba(255, 153, 0, 0.3)'
                      }}
                    >
                      <i className="fas fa-list-ul me-2"></i>แสดงทุกประเภท
                    </button>
                  </div>
                </div>
              ) : (
                filteredServices.map((s) => (
                  <div key={s.id} className="col-12 col-sm-6 col-lg-4">
              <div className="card h-100 border-0" style={{ 
                borderRadius: '20px', 
                overflow: 'hidden',
                boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
                background: 'linear-gradient(145deg, #ffffff, #f8f9fa)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)';
              }}>
                {s.imageUrl && (
                  <div style={{ position: 'relative', overflow: 'hidden' }}>
                    <img 
                      src={s.imageUrl} 
                      alt="service" 
                      className="card-img-top" 
                      style={{ 
                        height: 220, 
                        objectFit: 'cover',
                        transition: 'transform 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                      onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '15px',
                      right: '15px',
                      background: 'linear-gradient(45deg, #ff9900, #ff7730)',
                      color: 'white',
                      padding: '8px 12px',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      boxShadow: '0 3px 10px rgba(255, 153, 0, 0.4)'
                    }}>
                      ฿{s.price}
                    </div>
                    {s.type && (
                      <div style={{
                        position: 'absolute',
                        top: '15px',
                        left: '15px',
                        background: 'rgba(44, 62, 80, 0.8)',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        boxShadow: '0 3px 10px rgba(0, 0, 0, 0.2)'
                      }}>
                        <i className="fas fa-spa me-1"></i> {s.type}
                      </div>
                    )}
                  </div>
                )}
                <div className="card-body d-flex flex-column p-4" style={{ background: 'white' }}>
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <h5 className="card-title mb-0" style={{ 
                      color: '#2c3e50', 
                      fontWeight: '700',
                      fontSize: '1.3rem'
                    }}>
                      {s.name}
                    </h5>
                    <div style={{
                      background: 'rgba(255, 153, 0, 0.1)',
                      color: '#ff9900',
                      padding: '4px 8px',
                      borderRadius: '15px',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {s.type ? s.type : 'HOT'}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="d-flex align-items-center mb-3" style={{
                      background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
                      padding: '12px 15px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 153, 0, 0.1)'
                    }}>
                      <div style={{
                        background: 'linear-gradient(45deg, #ff9900, #ff7730)',
                        borderRadius: '50%',
                        padding: '8px',
                        marginRight: '12px'
                      }}>
                        <i className="far fa-clock" style={{ color: 'white', fontSize: '0.9rem' }}></i>
                      </div>
                      <div>
                        <span style={{ color: '#2c3e50', fontWeight: '600' }}>ระยะเวลา</span>
                        <div style={{ color: '#ff9900', fontWeight: '700', fontSize: '1.1rem' }}>
                          {s.duration} นาที
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-auto">
                    <div className="d-grid gap-2">
                      <button 
                        className="btn btn-outline-secondary btn-sm" 
                        data-bs-toggle="modal" 
                        data-bs-target={`#detailModal${s.id}`}
                        style={{ 
                          borderRadius: '25px',
                          padding: '10px 20px',
                          border: '2px solid #e9ecef',
                          fontWeight: '500',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#f8f9fa';
                          e.target.style.borderColor = '#ff9900';
                          e.target.style.color = '#ff9900';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent';
                          e.target.style.borderColor = '#e9ecef';
                          e.target.style.color = '#6c757d';
                        }}
                      >
                        <i className="fas fa-info-circle me-2"></i>ดูรายละเอียด
                      </button>
                      <div className="row g-2">
                        <div className="col-12">
                          <button 
                            className="btn w-100" 
                            onClick={() => openBookingModal(s)}
                            style={{ 
                              background: 'linear-gradient(45deg, #28a745, #20c997)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '25px',
                              fontWeight: '600',
                              padding: '8px 15px',
                              fontSize: '0.9rem',
                              boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)',
                              transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'translateY(-2px)';
                              e.target.style.boxShadow = '0 6px 20px rgba(40, 167, 69, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 4px 15px rgba(40, 167, 69, 0.3)';
                            }}
                          >
                            <i className="fas fa-cart-plus me-1"></i>+ตะกร้า
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Modal for detail */}
              <div className="modal fade" id={`detailModal${s.id}`} tabIndex="-1" aria-labelledby={`detailModalLabel${s.id}`} aria-hidden="true" data-bs-backdrop="false">
              <div className="modal-dialog modal-lg">
              <div className="modal-content" style={{ borderRadius: '15px', border: 'none', background: 'white' }}>
              <div className="modal-header" style={{ background: 'linear-gradient(45deg, #f8f9fa, #e9ecef)', borderBottom: 'none' }}>
                      <h5 className="modal-title fw-bold" id={`detailModalLabel${s.id}`} style={{ color: '#2c3e50' }}>
                        <i className="fas fa-spa me-2" style={{ color: '#ff9900' }}></i>
                        {s.name}
                      </h5>
                      <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div className="modal-body p-4">
                      {s.imageUrl && (
                        <div className="text-center mb-4">
                          <img 
                            src={s.imageUrl} 
                            alt="service" 
                            className="img-fluid rounded" 
                            style={{ maxHeight: 250, objectFit: 'cover', width: '100%' }} 
                          />
                        </div>
                      )}
                      <div className="row">
                        <div className="col-md-6">
                          <div className="d-flex align-items-center mb-3">
                            <i className="far fa-clock me-3" style={{ color: '#ff9900', fontSize: '1.2rem' }}></i>
                            <div>
                              <strong>ระยะเวลา:</strong>
                              <span className="ms-2">{s.duration} นาที</span>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="d-flex align-items-center mb-3">
                            <i className="fas fa-tag me-3" style={{ color: '#ff9900', fontSize: '1.2rem' }}></i>
                            <div>
                              <strong>ราคา:</strong>
                              <span className="ms-2 fw-bold" style={{ color: '#ff9900' }}>฿{s.price}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {s.type && (
                        <div className="mb-3">
                          <div className="d-flex align-items-center">
                            <i className="fas fa-spa me-3" style={{ color: '#ff9900', fontSize: '1.2rem' }}></i>
                            <div>
                              <strong>ประเภท:</strong>
                              <span className="ms-2">{s.type}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      {s.description && (
                        <div className="mt-3">
                          <h6 className="fw-bold mb-2" style={{ color: '#2c3e50' }}>
                            <i className="fas fa-info-circle me-2" style={{ color: '#ff9900' }}></i>
                            คำอธิบาย
                          </h6>
                          <p className="text-muted" style={{ lineHeight: 1.6 }}>{s.description}</p>
                        </div>
                      )}
                    </div>
                    <div className="modal-footer border-0 justify-content-center">
                      <button 
                        type="button" 
                        className="btn me-2" 
                        data-bs-dismiss="modal"
                        style={{ 
                          borderRadius: '20px',
                          padding: '8px 20px',
                          border: '1px solid #dee2e6'
                        }}
                      >
                        ปิด
                      </button>
                      <button 
                        type="button" 
                        className="btn"
                        data-bs-dismiss="modal"
                        onClick={() => setTimeout(() => openBookingModal(s), 300)}
                        style={{ 
                          background: 'linear-gradient(45deg, #ff9900, #ff7730)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '20px',
                          padding: '8px 20px',
                          fontWeight: '500'
                        }}
                      >
                        <i className="fas fa-calendar-plus me-1"></i>เลือกจองบริการ
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
                ))
              )}
            </div>
          </>
        )}
        </div>
      </div>
      
      {/* Footer Section */}
      <div style={{
        background: 'linear-gradient(135deg, #2c3e50 0%, #1a2a38 100%)',
        color: 'white',
        padding: '40px 0',
        marginTop: '60px'
      }}>
        <div className="container text-center">
          <div className="row">
            <div className="col-md-4 mb-3">
              <i className="fas fa-phone fa-2x mb-2" style={{ color: '#ff9900' }}></i>
              <h6>ติดต่อเรา</h6>
              <p className="mb-0" style={{ color: '#fff' }}>096-342-1553</p>
            </div>
            <div className="col-md-4 mb-3">
              <i className="fas fa-map-marker-alt fa-2x mb-2" style={{ color: '#ff9900' }}></i>
              <h6>ที่อยู่</h6>
              <p className="mb-0" style={{ color: '#fff' }}>469/2, 469/4 อาคาร Ashton ถ. อโศก - ดินแดง กรุงเทพฯ 10400</p>
            </div>
            <div className="col-md-4 mb-3">
              <i className="fas fa-clock fa-2x mb-2" style={{ color: '#ff9900' }}></i>
              <h6>เวลาทำการ</h6>
              <p className="mb-0" style={{ color: '#fff' }}>10:00 - 23:00 น.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Cart Button (Shopee Style) */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '15px'
      }}>
        {/* Time Display */}
        <div style={{
          background: 'rgba(44, 62, 80, 0.9)',
          color: 'white',
          padding: '8px 15px',
          borderRadius: '20px',
          fontSize: '0.9rem',
          fontWeight: '600',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <i className="fas fa-clock me-2"></i>
          {currentTime.toLocaleTimeString('th-TH', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
          })}
        </div>

        {/* Cart Button */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn"
            onClick={() => setShowCart(true)}
            style={{
              background: 'linear-gradient(45deg, #ff9900, #ff7730)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '65px',
              height: '65px',
              fontSize: '1.8rem',
              boxShadow: '0 8px 25px rgba(255, 153, 0, 0.4)',
              position: 'relative',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.1) translateY(-2px)';
              e.target.style.boxShadow = '0 12px 30px rgba(255, 153, 0, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1) translateY(0)';
              e.target.style.boxShadow = '0 8px 25px rgba(255, 153, 0, 0.4)';
            }}
          >
            <i className="fas fa-shopping-cart"></i>
            
            {/* Badge */}
            {cartItems.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                background: '#dc3545',
                color: 'white',
                borderRadius: '50%',
                minWidth: '28px',
                height: '28px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '3px solid white',
                boxShadow: '0 2px 8px rgba(220, 53, 69, 0.3)',
                animation: cartItems.length > 0 ? 'pulse 2s infinite' : 'none'
              }}>
                {cartItems.length > 99 ? '99+' : cartItems.length}
              </span>
            )}
          </button>

          {/* Mini Cart Preview */}
          {cartItems.length > 0 && (
            <div style={{
              position: 'absolute',
              bottom: '80px',
              right: '0',
              background: 'white',
              borderRadius: '15px',
              padding: '15px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
              border: '1px solid rgba(255, 153, 0, 0.2)',
              minWidth: '280px',
              maxWidth: '320px',
              opacity: showCart ? 0 : 1,
              transform: showCart ? 'translateY(10px)' : 'translateY(0)',
              transition: 'all 0.3s ease',
              pointerEvents: showCart ? 'none' : 'auto'
            }}>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h6 className="mb-0 fw-bold" style={{ color: '#2c3e50', fontSize: '0.9rem' }}>
                  <i className="fas fa-shopping-cart me-2" style={{ color: '#ff9900' }}></i>
                  ตะกร้าของคุณ
                </h6>
                <span className="badge" style={{ 
                  background: 'linear-gradient(45deg, #ff9900, #ff7730)', 
                  fontSize: '0.7rem' 
                }}>
                  {cartItems.length} รายการ
                </span>
              </div>
              
              <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '10px' }}>
                {cartItems.slice(0, 3).map((item, index) => (
                  <div key={item.id} className="d-flex align-items-center mb-2 p-2" style={{ 
                    background: '#f8f9fa', 
                    borderRadius: '8px',
                    fontSize: '0.8rem'
                  }}>
                    <div style={{
                      background: 'linear-gradient(45deg, #28a745, #20c997)',
                      color: 'white',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      marginRight: '8px'
                    }}>
                      {index + 1}
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-bold" style={{ color: '#2c3e50' }}>{item.service.name}</div>
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                        📅 {new Date(item.date).toLocaleDateString('th-TH')} • ⏰ {item.time} น.
                      </div>
                      {item.addedAt && (
                        <div className="text-muted" style={{ fontSize: '0.6rem' }}>
                          🕒 เพิ่มเมื่อ {item.addedAt.toLocaleTimeString('th-TH', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      )}
                    </div>
                    <div className="fw-bold" style={{ color: '#28a745' }}>
                      ฿{item.service.price}
                    </div>
                  </div>
                ))}
                {cartItems.length > 3 && (
                  <div className="text-center text-muted" style={{ fontSize: '0.8rem' }}>
                    และอีก {cartItems.length - 3} รายการ
                  </div>
                )}
              </div>

              <div className="border-top pt-2">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold">ราคารวม:</span>
                  <span className="fw-bold" style={{ color: '#ff9900', fontSize: '1.1rem' }}>
                    ฿{getTotalPrice()}
                  </span>
                </div>
                <button
                  className="btn w-100"
                  onClick={() => setShowCart(true)}
                  style={{
                    background: 'linear-gradient(45deg, #28a745, #20c997)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    padding: '8px'
                  }}
                >
                  <i className="fas fa-eye me-2"></i>ดูตะกร้า
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal สำหรับจองคิว */}
      {bookingService && (
        <div className="modal show d-block" tabIndex="-1" onClick={() => setBookingService(null)}>
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: '15px', border: 'none' }}>
              <div className="modal-header" style={{ background: 'linear-gradient(45deg, #ff9900, #ff7730)', color: 'white', borderBottom: 'none' }}>
                <h5 className="modal-title fw-bold">
                  <i className="fas fa-calendar-plus me-2"></i>
                  จองบริการ: {bookingService.name}
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setBookingService(null)}
                ></button>
              </div>

              {/* Tabs */}
              <div className="modal-body p-0">
                <div className="row g-0">
                  <div className="col-3" style={{ background: '#f8f9fa', borderRight: '1px solid #dee2e6' }}>
                    <div className="nav flex-column nav-pills p-3" style={{ minHeight: '400px' }}>
                      <button
                        className={`nav-link ${activeTab === 'booking' ? 'active' : ''} mb-2`}
                        onClick={() => setActiveTab('booking')}
                        style={{
                          background: activeTab === 'booking' ? 'linear-gradient(45deg, #ff9900, #ff7730)' : 'transparent',
                          color: activeTab === 'booking' ? 'white' : '#6c757d',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '12px 15px',
                          textAlign: 'left'
                        }}
                      >
                        <i className="fas fa-calendar me-2"></i>
                        เลือกวันเวลา
                      </button>
                      <button
                        className={`nav-link ${activeTab === 'employee' ? 'active' : ''} mb-2`}
                        onClick={() => setActiveTab('employee')}
                        style={{
                          background: activeTab === 'employee' ? 'linear-gradient(45deg, #ff9900, #ff7730)' : 'transparent',
                          color: activeTab === 'employee' ? 'white' : '#6c757d',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '12px 15px',
                          textAlign: 'left'
                        }}
                      >
                        <i className="fas fa-user me-2"></i>
                        เลือกพนักงาน
                      </button>
                      <button
                        className={`nav-link ${activeTab === 'summary' ? 'active' : ''}`}
                        onClick={() => setActiveTab('summary')}
                        style={{
                          background: activeTab === 'summary' ? 'linear-gradient(45deg, #ff9900, #ff7730)' : 'transparent',
                          color: activeTab === 'summary' ? 'white' : '#6c757d',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '12px 15px',
                          textAlign: 'left'
                        }}
                      >
                        <i className="fas fa-check-circle me-2"></i>
                        สรุปการจอง
                      </button>
                    </div>
                  </div>
                  
                  <div className="col-9">
                    <div className="p-4">
                      {/* Tab Content */}
                      {activeTab === 'booking' && (
                        <div>
                          <h6 className="mb-3 fw-bold" style={{ color: '#2c3e50' }}>
                            <i className="fas fa-calendar me-2" style={{ color: '#ff9900' }}></i>
                            เลือกวันที่และเวลา
                          </h6>
                          
                          <div className="mb-3">
                            <label htmlFor="bookingDate" className="form-label fw-bold">
                              <i className="fas fa-calendar me-2" style={{ color: '#ff9900' }}></i>
                              เลือกวันที่
                            </label>
                            <input
                              type="date"
                              className="form-control"
                              id="bookingDate"
                              value={bookingDate}
                              onChange={e => setBookingDate(e.target.value)}
                              style={{ borderRadius: '10px' }}
                              min={generateDateOptions()[0]}
                              max={generateDateOptions()[generateDateOptions().length - 1]}
                            />
                          </div>

                          <div className="mb-3">
                            <label htmlFor="bookingTime" className="form-label fw-bold">
                              <i className="fas fa-clock me-2" style={{ color: '#ff9900' }}></i>
                              เลือกเวลา
                            </label>
                            <input
                              type="time"
                              className="form-control"
                              id="bookingTime"
                              value={bookingTime}
                              onChange={e => setBookingTime(e.target.value)}
                              style={{ borderRadius: '10px' }}
                              min="10:00"  // Changed from 09:00 to 10:00
                              max="23:00"  // Changed from 21:00 to 23:00
                              step="1800" // 30 minutes intervals
                            />
                            <small className="text-muted">
                              <i className="fas fa-info-circle me-1"></i>
                              เวลาให้บริการ 10:00 - 23:00 น. เท่านั้น
                            </small>
                          </div>
                        </div>
                      )}

                      {activeTab === 'employee' && (
                        <div>
                          <h6 className="mb-3 fw-bold" style={{ color: '#2c3e50' }}>
                            <i className="fas fa-user me-2" style={{ color: '#ff9900' }}></i>
                            เลือกพนักงาน
                          </h6>
                          
                          <div className="mb-3">
                            <select 
                              className="form-select" 
                              value={selectedEmployee}
                              onChange={(e) => setSelectedEmployee(e.target.value)}
                              style={{ borderRadius: '10px' }}
                            >
                              <option value="">-- ไม่ระบุพนักงาน --</option>
                              {getAvailableEmployees(bookingDate, bookingTime).map(employee => (
                                <option key={employee.id} value={employee.id}>
                                  {employee.fullname || employee.name || 'ไม่ระบุชื่อ'}
                                </option>
                              ))}
                            </select>
                            <small className="text-muted">
                              <i className="fas fa-info-circle me-1"></i>
                              หากไม่เลือกพนักงาน ทางร้านจะจัดสรรให้อัตโนมัติ
                            </small>
                          </div>
                        </div>
                      )}

                      {activeTab === 'summary' && (
                        <div>
                          <h6 className="mb-3 fw-bold" style={{ color: '#2c3e50' }}>
                            <i className="fas fa-check-circle me-2" style={{ color: '#ff9900' }}></i>
                            สรุปการจอง
                          </h6>
                          
                          <div className="card border-0" style={{ background: '#f8f9fa' }}>
                            <div className="card-body">
                              <div className="row">
                                <div className="col-md-6">
                                  <p><strong>บริการ:</strong> {bookingService.name}</p>
                                  <p><strong>ระยะเวลา:</strong> {bookingService.duration} นาที</p>
                                  <p><strong>ราคา:</strong> <span style={{ color: '#ff9900', fontWeight: 'bold' }}>฿{bookingService.price}</span></p>
                                </div>
                                <div className="col-md-6">
                                  <p><strong>วันที่:</strong> {bookingDate ? new Date(bookingDate).toLocaleDateString('th-TH') : 'ยังไม่เลือก'}</p>
                                  <p><strong>เวลา:</strong> {bookingTime ? `${bookingTime} น.` : 'ยังไม่เลือก'}</p>
                                  <p><strong>พนักงาน:</strong> {selectedEmployee ? (employees.find(emp => emp.id === selectedEmployee)?.fullname || employees.find(emp => emp.id === selectedEmployee)?.name || 'ไม่ระบุชื่อ') : 'ไม่ระบุ'}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="alert alert-info mt-3" style={{ borderRadius: '10px', border: 'none', background: 'rgba(255, 153, 0, 0.1)' }}>
                            <i className="fas fa-info-circle me-2" style={{ color: '#ff9900' }}></i>
                            <small>
                              <strong>หมายเหตุ:</strong> เวลาทำการ 10:00 - 23:00 น. ทุกวัน
                              <br />ทางร้านจะติดต่อยืนยันการจองภายใน 24 ชั่วโมง
                            </small>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer border-0 justify-content-between">
                <button 
                  type="button" 
                  className="btn"
                  onClick={() => setBookingService(null)}
                  style={{ 
                    borderRadius: '20px',
                    padding: '10px 25px',
                    border: '1px solid #dee2e6'
                  }}
                >
                  ยกเลิก
                </button>
                <button 
                  type="button" 
                  className="btn"
                  onClick={() => addToCart(bookingService, bookingDate, bookingTime, selectedEmployee)}
                  disabled={!bookingDate || !bookingTime}
                  style={{ 
                    background: 'linear-gradient(45deg, #28a745, #20c997)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '10px 25px',
                    fontWeight: '500'
                  }}
                >
                  <i className="fas fa-cart-plus me-2"></i>เพิ่มลงตะกร้า
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal ตะกร้าสินค้า */}
      {showCart && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-xl">
            <div className="modal-content" style={{ borderRadius: '15px', border: 'none' }}>
              <div className="modal-header" style={{ background: 'linear-gradient(45deg, #28a745, #20c997)', color: 'white', borderBottom: 'none' }}>
                <h5 className="modal-title fw-bold">
                  <i className="fas fa-shopping-cart me-2"></i>
                  ตะกร้าสินค้า ({cartItems.length} รายการ)
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowCart(false)}
                ></button>
              </div>

              <div className="modal-body p-0">
                <div className="row g-0">
                  <div className="col-8" style={{ borderRight: '1px solid #dee2e6' }}>
                    <div className="p-4">
                      <h6 className="mb-3 fw-bold" style={{ color: '#2c3e50' }}>
                        <i className="fas fa-list me-2" style={{ color: '#28a745' }}></i>
                        รายการที่เลือก
                      </h6>
                      
                      {cartItems.length === 0 ? (
                        <div className="text-center py-5">
                          <i className="fas fa-shopping-cart fa-4x mb-3" style={{ color: '#dee2e6' }}></i>
                          <h5 className="text-muted">ไม่มีรายการในตะกร้า</h5>
                          <p className="text-muted">เลือกบริการที่ต้องการแล้วคลิก "เพิ่มลงตะกร้า"</p>
                        </div>
                      ) : (
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                          {cartItems.map((item, index) => (
                            <div key={item.id} className="card mb-3 border-0" style={{ background: '#f8f9fa' }}>
                              <div className="card-body">
                                <div className="row align-items-center">
                                  <div className="col-1">
                                    <div style={{
                                      background: 'linear-gradient(45deg, #28a745, #20c997)',
                                      color: 'white',
                                      borderRadius: '50%',
                                      width: '30px',
                                      height: '30px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.9rem',
                                      fontWeight: 'bold'
                                    }}>
                                      {index + 1}
                                    </div>
                                  </div>
                                  <div className="col-9">
                                    <h6 className="mb-1 fw-bold">{item.service.name}</h6>
                                    <div className="row">
                                      <div className="col-md-4">
                                        <small className="text-muted">
                                          <i className="fas fa-calendar me-1"></i>
                                          {new Date(item.date).toLocaleDateString('th-TH')}
                                        </small>
                                      </div>
                                      <div className="col-md-3">
                                        <small className="text-muted">
                                          <i className="fas fa-clock me-1"></i>
                                          {item.time} น.
                                        </small>
                                      </div>
                                      <div className="col-md-3">
                                        <small className="text-muted">
                                          <i className="fas fa-stopwatch me-1"></i>
                                          {item.service.duration} นาที
                                        </small>
                                      </div>
                                      <div className="col-md-2">
                                        <small className="fw-bold" style={{ color: '#28a745' }}>
                                          ฿{item.service.price}
                                        </small>
                                      </div>
                                    </div>
                                    {item.employee && (
                                      <small className="text-muted">
                                        <i className="fas fa-user me-1"></i>
                                        พนักงาน: {
                                          (() => {
                                            const emp = employees.find(emp => emp.id === item.employee);
                                            return emp ? (emp.fullname || emp.name || 'ไม่ระบุชื่อ') : 'ไม่ระบุชื่อ';
                                          })()
                                        }
                                      </small>
                                    )}
                                  </div>
                                  <div className="col-2 text-end">
                                    <button
                                      className="btn btn-outline-danger btn-sm"
                                      onClick={() => removeFromCart(item.id)}
                                      style={{ borderRadius: '50%', width: '35px', height: '35px' }}
                                    >
                                      <i className="fas fa-trash"></i>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="col-4" style={{ background: '#f8f9fa' }}>
                    <div className="p-4">
                      <h6 className="mb-3 fw-bold" style={{ color: '#2c3e50' }}>
                        <i className="fas fa-credit-card me-2" style={{ color: '#28a745' }}></i>
                        ชำระเงิน
                      </h6>
                      
                      <div className="card border-0 mb-3" style={{ background: 'white' }}>
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span>จำนวนรายการ:</span>
                            <span className="fw-bold">{cartItems.length} รายการ</span>
                          </div>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span>ราคารวม:</span>
                            <span className="fw-bold" style={{ fontSize: '1.1rem' }}>
                              ฿{getTotalPrice().toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          
                          {/* ส่วนลด (แสดงเมื่อมีการเลือกใช้ส่วนลด) */}
                          {appliedDiscount && (
                            <>
                              <div className="d-flex justify-content-between align-items-center mb-2 text-success">
                                <span>
                                  <i className="fas fa-tags me-1"></i>
                                  ส่วนลด ({getDiscountPercent()}%):
                                </span>
                                <span style={{ color: '#dc3545' }}>
                                  - ฿{parseFloat(getDiscountAmount()).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="border-top border-bottom py-2 my-2">
                                <div className="d-flex justify-content-between align-items-center">
                                  <span className="fw-bold">ราคาสุทธิ:</span>
                                  <span className="fw-bold" style={{ color: '#28a745', fontSize: '1.2rem' }}>
                                    ฿{parseFloat(getFinalPrice()).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                            </>
                          )}
                          
                          <hr className="my-2" />
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="fw-bold">ยอดรวมทั้งสิ้น:</span>
                            <span className="fw-bold" style={{ color: '#28a745', fontSize: '1.2rem' }}>
                              {appliedDiscount && selectedDiscount
                                ? `฿${parseFloat(getFinalPrice()).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
                                : `฿${getTotalPrice().toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
                              }
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="form-label fw-bold">
                          <i className="fas fa-money-check me-2" style={{ color: '#28a745' }}></i>
                          วิธีการชำระเงิน
                        </label>
                        <div className="d-grid gap-2">
                          <button
                            className={`btn ${paymentMethod === 'cash' ? 'btn-success' : 'btn-outline-secondary'}`}
                           
                            onClick={() => setPaymentMethod('cash')}
                            style={{ borderRadius: '10px', textAlign: 'left' }}
                          >
                            <i className="fas fa-money-bill-wave me-2"></i>
                            เงินสด (ชำระที่หน้าร้าน)
                          </button>
                          <button
                            className={`btn ${paymentMethod === 'transfer' ? 'btn-success' : 'btn-outline-secondary'}`}
                            onClick={() => setPaymentMethod('transfer')}
                            style={{ borderRadius: '10px', textAlign: 'left' }}
                          >
                            <i className="fas fa-university me-2"></i>
                            โอนเงิน (พร้อมเพย์/ธนาคาร)
                          </button>
                          <button
                            className={`btn ${paymentMethod === 'credit' ? 'btn-success' : 'btn-outline-secondary'}`}
                            onClick={() => setPaymentMethod('credit')}
                            style={{ borderRadius: '10px', textAlign: 'left' }}
                          >
                            <i className="fas fa-credit-card me-2"></i>
                            บัตรเครดิต/เดบิต
                          </button>
                        </div>
                      </div>
                      
                      {/* ส่วนลด */}
                      <div className="mb-3">
                        <label className="form-label fw-bold">
                          <i className="fas fa-tags me-2" style={{ color: '#FF7D29' }}></i>
                          ส่วนลดที่มี
                        </label>
                        
                        {/* รายการส่วนลด */}
                        <div className="card border-0 mb-2">
                          <div className="card-body p-3" style={{ 
                            background: 'linear-gradient(to right, #FFEEA9, #FFBF78)', 
                            borderRadius: '10px' 
                          }}>
                            {availableDiscounts.length === 0 ? (
                              <div className="text-center py-3">
                                <i className="fas fa-ticket-alt fa-2x mb-2" style={{ color: '#7B4019' }}></i>
                                <p className="mb-0" style={{ color: '#7B4019' }}>คุณยังไม่มีคูปองส่วนลด</p>
                                <small className="text-muted d-block mt-2">
                                  สะสมแต้มเพื่อรับคูปองส่วนลดได้ที่หน้าแดชบอร์ด
                                </small>
                              </div>
                            ) : (
                              <div>
                                <p className="mb-2" style={{ color: '#7B4019', fontWeight: '500' }}>
                                  <i className="fas fa-ticket-alt me-2"></i>
                                  คูปองส่วนลดของคุณ
                                </p>
                                <div className="list-group list-group-flush" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                  {availableDiscounts.map(discount => (
                                    <div
                                      key={discount.id}
                                      className={`list-group-item border-0 mb-2 p-0`}
                                      style={{ 
                                        background: 'transparent',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <div 
                                        className={`position-relative p-3 ${
                                          selectedDiscount?.id === discount.id ? 'active' : ''
                                        }`}
                                        style={{
                                          background: selectedDiscount?.id === discount.id ? 'rgba(255, 125, 41, 0.2)' : 'white',
                                          borderRadius: '10px',
                                          border: selectedDiscount?.id === discount.id ? '2px dashed #FF7D29' : '2px dashed #dee2e6',
                                          transition: 'all 0.3s ease'
                                        }}
                                        onClick={() => {
                                          if (selectedDiscount?.id === discount.id) {
                                            setSelectedDiscount(null);
                                            setAppliedDiscount(false);
                                            setDiscountPercent(0);
                                          } else {
                                            setSelectedDiscount(discount);
                                            setAppliedDiscount(true);
                                            setDiscountPercent(discount.rewardValue);
                                          }
                                        }}
                                      >
                                        {/* Scissors icon */}
                                        <div className="position-absolute" style={{ left: '-10px', top: '50%', transform: 'translateY(-50%)' }}>
                                          <i className="fas fa-circle" style={{ color: '#FF7D29', fontSize: '20px' }}></i>
                                        </div>
                                        <div className="position-absolute" style={{ right: '-10px', top: '50%', transform: 'translateY(-50%)' }}>
                                          <i className="fas fa-circle" style={{ color: '#FF7D29', fontSize: '20px' }}></i>
                                        </div>
                                        
                                        <div className="d-flex justify-content-between align-items-center">
                                          <div>
                                            <div className="fw-bold" style={{ 
                                              color: selectedDiscount?.id === discount.id ? '#FF7D29' : '#2c3e50',
                                              fontSize: '1.1rem' 
                                            }}>
                                              ส่วนลด {discount.rewardValue}%
                                            </div>
                                            <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                                              {discount.rewardName}
                                            </div>
                                            {discount.maxDiscount && (
                                              <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                                                <i className="fas fa-info-circle me-1"></i>
                                                สูงสุด {discount.maxDiscount.toLocaleString()} บาท
                                              </div>
                                            )}
                                          </div>
                                          {selectedDiscount?.id === discount.id && (
                                            <div>
                                              <div className="badge bg-success">
                                                <i className="fas fa-check me-1"></i>
                                                ใช้คูปองนี้
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {selectedDiscount && (
                                  <div className="alert alert-success mt-3 mb-0" style={{ 
                                    borderRadius: '8px',
                                    background: 'rgba(40, 167, 69, 0.1)',
                                    border: '1px solid rgba(40, 167, 69, 0.2)'
                                  }}>
                                    <small>
                                      <i className="fas fa-info-circle me-1"></i>
                                      คุณกำลังใช้คูปองส่วนลด {selectedDiscount.rewardValue}% 
                                      {selectedDiscount.maxDiscount && ` (สูงสุด ${selectedDiscount.maxDiscount.toLocaleString()} บาท)`}
                                    </small>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="alert alert-info" style={{ borderRadius: '10px', border: 'none', background: 'rgba(40, 167, 69, 0.1)' }}>
                        <i className="fas fa-info-circle me-2" style={{ color: '#28a745' }}></i>
                        <small>
                          <strong>หมายเหตุ:</strong> การจองจะมีผลหลังจากยืนยันการชำระเงิน
                        </small>
                      </div>

                      <div className="d-grid gap-2">
                        <button
                          className="btn btn-outline-secondary"
                          onClick={clearCart}
                          disabled={cartItems.length === 0}
                          style={{ borderRadius: '20px' }}
                        >
                          <i className="fas fa-trash me-2"></i>ล้างตะกร้า
                        </button>
                        <button
                          className="btn"
                          onClick={handleMultipleBooking}
                          disabled={cartItems.length === 0 || submitting}
                          style={{ 
                            background: 'linear-gradient(45deg, #28a745, #20c997)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '20px',
                            padding: '12px 25px',
                            fontWeight: '600',
                            fontSize: '1rem'
                          }}
                        >
                          {submitting ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                              กำลังดำเนินการ...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-check me-2"></i>ยืนยันการชำระเงิน
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal แสดงผลการชำระเงินสำเร็จ */}
      {showPaymentSuccess && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: '15px', border: 'none' }}>
              <div className="modal-body text-center p-5">
                <div style={{
                  background: 'linear-gradient(45deg, #28a745, #20c997)',
                  borderRadius: '50%',
                  width: '80px',
                  height: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px'
                }}>
                  <i className="fas fa-check fa-2x" style={{ color: 'white' }}></i>
                </div>
                <h4 className="mb-3" style={{ color: '#2c3e50' }}>การจองสำเร็จ!</h4>
                <p className="mb-3 text-muted">
                  ระบบได้บันทึกการจองของคุณเรียบร้อยแล้ว 
                </p>
                
                <div className="alert alert-warning" style={{ borderRadius: '10px' }}>
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  <strong>โปรดเช็คอินชำระเงินที่หน้าเคาน์เตอร์ก่อนใช้บริการ หากมาสายเกิน 15 นาที ระบบจะยกเลิกการจอง</strong>
                </div>
                <div className="d-grid gap-2">
                  <button
                    className="btn"
                    onClick={() => {
                      setShowPaymentSuccess(false);
                      navigate('/member/dashboard');
                    }}
                    style={{ 
                      background: 'linear-gradient(45deg, #ff9900, #ff7730)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '20px',
                      padding: '12px 25px',
                      fontWeight: '600'
                    }}
                  >
                    <i className="fas fa-home me-2"></i>กลับหน้าหลัก
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => setShowPaymentSuccess(false)}
                    style={{ borderRadius: '20px' }}
                  >
                    ดูบริการเพิ่มเติม
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

export default CustomerServices;