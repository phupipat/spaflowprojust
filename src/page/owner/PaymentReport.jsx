import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../Firebase';
import '../../styles/SharedStyles.css';

const PaymentReport = () => {
  const [bookings, setBookings] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');

  useEffect(() => {
    // Set default date range to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
    
    fetchBookings(firstDay, lastDay);
  }, []);

  const fetchBookings = async (start, end) => {
    setLoading(true);
    try {
      const startTimestamp = new Date(start);
      const endTimestamp = new Date(end);
      endTimestamp.setHours(23, 59, 59, 999); // Set to end of day

      // ดึงข้อมูลการชำระเงินจาก Payments collection ก่อน
      const paymentsMap = {};
      try {
        const paymentsCol = collection(db, 'Payments');
        const paymentsSnap = await getDocs(paymentsCol);
        
        if (!paymentsSnap.empty) {
          console.log(`Found ${paymentsSnap.size} payment records`);
          paymentsSnap.docs.forEach(doc => {
            const paymentData = doc.data();
            if (paymentData.bookingId) {
              paymentsMap[paymentData.bookingId] = {
                id: doc.id,
                ...paymentData,
                paymentSource: 'Payments'
              };
            }
          });
        }
      } catch (error) {
        console.error("Error fetching payment details:", error);
      }

      // Try with 'bookings' collection first
      let bookingsQuery = query(
        collection(db, 'bookings'),
        where('bookingDate', '>=', startTimestamp),
        where('bookingDate', '<=', endTimestamp)
      );

      let bookingsSnapshot = await getDocs(bookingsQuery);
      
      // If no results, try with 'Bookings' collection (capital B)
      if (bookingsSnapshot.empty) {
        bookingsQuery = query(
          collection(db, 'Bookings')
        );
        bookingsSnapshot = await getDocs(bookingsQuery);
      }

      const bookingsData = [];

      for (const doc of bookingsSnapshot.docs) {
        const booking = { id: doc.id, ...doc.data() };
        
        // ตรวจสอบว่าวันที่การจองอยู่ในช่วงที่กำหนดหรือไม่
        let bookingDate;
        const dateField = booking.bookingDate || booking.date || booking.serviceDate || booking.appointmentDate;
        
        if (dateField) {
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
            bookingDate = null;
          }
        }
        
        // ข้ามถ้าวันที่ไม่อยู่ในช่วงที่กำหนด
        if (bookingDate && (bookingDate < startTimestamp || bookingDate > endTimestamp)) {
          continue;
        }
        
        // นำข้อมูลการชำระเงินมารวมกับข้อมูลการจอง
        const paymentInfo = paymentsMap[booking.id];
        if (paymentInfo) {
          booking.paymentDetails = paymentInfo;
          
          // อัปเดตข้อมูลชำระเงินถ้ามีข้อมูลจาก Payments collection
          booking.paymentStatus = paymentInfo.paymentStatus || booking.paymentStatus;
          booking.paymentMethod = paymentInfo.paymentMethod || booking.paymentMethod;
          booking.totalAmount = paymentInfo.amount || paymentInfo.totalAmount || booking.totalAmount || booking.price;
          booking.paidAt = paymentInfo.paidAt || paymentInfo.paymentDate || booking.paidAt;
        }
        
        // Fetch customer details if needed
        if (booking.customerId || booking.userId) {
          try {
            const customerQuery = query(
              collection(db, 'artifacts/login-spa-7921d/users'),
              where('uid', '==', booking.customerId || booking.userId)
            );
            const customerSnapshot = await getDocs(customerQuery);
            if (!customerSnapshot.empty) {
              booking.customerDetails = customerSnapshot.docs[0].data();
            }
          } catch (error) {
            console.error("Error fetching customer details:", error);
          }
        }

        // Fetch service details if needed
        if (booking.serviceId && (!booking.service || booking.service === '' || booking.service === 'ไม่ระบุ')) {
          try {
            const serviceQuery = query(
              collection(db, 'Services'),
              where('__name__', '==', booking.serviceId)
            );
            const serviceSnapshot = await getDocs(serviceQuery);
            if (!serviceSnapshot.empty) {
              const serviceData = serviceSnapshot.docs[0].data();
              booking.service = serviceData.name || serviceData.serviceName || booking.service;
              booking.duration = serviceData.duration || booking.duration;
            }
          } catch (error) {
            console.error("Error fetching service details:", error);
          }
        }

        // Fetch employee details if needed
        if (booking.employeeId && (!booking.employeeName || booking.employeeName === '' || booking.employeeName === 'ไม่ระบุ')) {
          try {
            const employeeQuery = query(
              collection(db, 'artifacts/login-spa-7921d/users'),
              where('uid', '==', booking.employeeId)
            );
            const employeeSnapshot = await getDocs(employeeQuery);
            if (!employeeSnapshot.empty) {
              const employeeData = employeeSnapshot.docs[0].data();
              if (employeeData.role === 'employee') {
                booking.employeeName = employeeData.fullName || employeeData.displayName || employeeData.name || booking.employeeName;
              }
            }
          } catch (error) {
            console.error("Error fetching employee details:", error);
          }
        }

        // Ensure payment information is properly formatted
        booking.payment = booking.payment || {
          method: booking.paymentStatus === 'ชำระเงินแล้ว' ? 'completed' : 'pending',
          totalAmount: booking.totalAmount || booking.price || 0,
          cash: booking.paymentMethod === 'cash' ? (booking.totalAmount || booking.price || 0) : 0,
          transfer: booking.paymentMethod === 'transfer' ? (booking.totalAmount || booking.price || 0) : 0,
          creditCard: booking.paymentMethod === 'credit' ? (booking.totalAmount || booking.price || 0) : 0
        };

        // Apply additional filters if set
        if (filterCustomer && 
            !(booking.customerDetails?.displayName?.toLowerCase().includes(filterCustomer.toLowerCase()) ||
              booking.userEmail?.toLowerCase().includes(filterCustomer.toLowerCase()) ||
              booking.customerName?.toLowerCase().includes(filterCustomer.toLowerCase()))) {
          continue;
        }
        
        if (filterPaymentStatus && 
            !((filterPaymentStatus === 'completed' && (booking.paymentStatus === 'ชำระเงินแล้ว' || booking.paymentDetails?.paymentStatus === 'ชำระเงินแล้ว')) ||
              (filterPaymentStatus === 'pending' && booking.paymentStatus !== 'ชำระเงินแล้ว' && booking.paymentDetails?.paymentStatus !== 'ชำระเงินแล้ว'))) {
          continue;
        }
        
        if (filterPaymentMethod && 
            !((booking.paymentDetails?.paymentMethod || booking.paymentMethod) === filterPaymentMethod)) {
          continue;
        }

        bookingsData.push(booking);
      }

      setBookings(bookingsData);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateFilter = () => {
    if (startDate && endDate) {
      fetchBookings(startDate, endDate);
    }
  };

  // Reset filters
  const resetFilters = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
    setFilterCustomer('');
    setFilterPaymentStatus('');
    setFilterPaymentMethod('');
    
    fetchBookings(firstDay, lastDay);
  };

  // Set to today only
  const setToday = () => {
    const today = new Date();
    setStartDate(today.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    
    fetchBookings(today, today);
  };

  // Calculate summary totals
  const calculateSummary = () => {
    let summary = {
      totalBookings: bookings.length,
      totalAmount: 0,
      totalCash: 0,
      totalTransfer: 0,
      totalCreditCard: 0,
      completedBookings: 0,
      pendingBookings: 0
    };

    bookings.forEach(booking => {
      // ตรวจสอบข้อมูลราคาจากหลายแหล่ง
      let amount = 0;
      
      // ลำดับการดึงราคา: paymentDetails > booking.totalAmount > booking.price
      if (booking.paymentDetails && (booking.paymentDetails.amount || booking.paymentDetails.totalAmount)) {
        amount = Number(booking.paymentDetails.amount || booking.paymentDetails.totalAmount || 0);
      } else {
        amount = Number(booking.totalAmount || booking.price || 0);
      }
      
      summary.totalAmount += amount;
      
      // ตรวจสอบวิธีการชำระเงิน - ให้ความสำคัญกับข้อมูลจาก Payments collection
      const paymentMethod = booking.paymentDetails?.paymentMethod || booking.paymentMethod || 'cash';
      
      if (paymentMethod === 'cash') {
        summary.totalCash += amount;
      } else if (paymentMethod === 'transfer') {
        summary.totalTransfer += amount;
      } else if (paymentMethod === 'credit') {
        summary.totalCreditCard += amount;
      } else {
        // ถ้าเป็นวิธีอื่นๆ ให้นับเป็นเงินสดเป็นค่าเริ่มต้น
        summary.totalCash += amount;
      }
      
      // ตรวจสอบสถานะการชำระเงิน
      const isPaid = booking.paymentStatus === 'ชำระเงินแล้ว' || 
                     booking.paymentDetails?.paymentStatus === 'ชำระเงินแล้ว' || 
                     booking.payment?.method === 'completed';
      
      if (isPaid) {
        summary.completedBookings++;
      } else {
        summary.pendingBookings++;
      }
    });

    return summary;
  };

  const summary = calculateSummary();

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH');
  };

  // Format time for display
  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  };

  // Calculate duration
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'N/A';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end - start;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} ชั่วโมง ${minutes} นาที`;
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(Number(amount) || 0);
  };

  return (
    <div className="container-fluid p-4 animate-fade-in">
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header text-white" style={{ backgroundColor: '#7B4019' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h4 className="mb-0">
              <i className="fas fa-cash-register me-2"></i>
              รายงานสถานะการชำระเงิน
            </h4>
            <div>
              <button className="btn btn-sm btn-light">
                <i className="fas fa-download me-1"></i> ดาวน์โหลดรายงาน
              </button>
            </div>
          </div>
        </div>
        <div className="card-body">
          {/* ส่วนกรองข้อมูลแบบง่าย */}
          <div className="row mb-4">
            <div className="col-md-3 mb-3">
              <label className="form-label">วันที่เริ่มต้น</label>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="col-md-3 mb-3">
              <label className="form-label">วันที่สิ้นสุด</label>
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="col-md-6 d-flex align-items-end mb-3">
              <button 
                className="btn btn-primary me-2" 
                onClick={handleDateFilter}
              >
                <i className="fas fa-filter me-1"></i>
                กรองข้อมูล
              </button>
              <button 
                className="btn btn-outline-secondary me-2" 
                onClick={resetFilters}
              >
                <i className="fas fa-sync-alt me-1"></i>
                รีเซ็ต
              </button>
              <button 
                className="btn btn-outline-primary" 
                onClick={setToday}
              >
                <i className="fas fa-calendar-day me-1"></i>
                วันนี้
              </button>
            </div>
          </div>

          {/* เพิ่มส่วนกรองข้อมูลละเอียด */}
          <div className="row mb-4">
            <div className="col-md-3 mb-3">
              <label className="form-label">ค้นหาลูกค้า</label>
              <input
                type="text"
                className="form-control"
                placeholder="ชื่อหรืออีเมลลูกค้า"
                value={filterCustomer}
                onChange={(e) => setFilterCustomer(e.target.value)}
              />
            </div>
            <div className="col-md-3 mb-3">
              <label className="form-label">สถานะการชำระเงิน</label>
              <select
                className="form-select"
                value={filterPaymentStatus}
                onChange={(e) => setFilterPaymentStatus(e.target.value)}
              >
                <option value="">ทั้งหมด</option>
                <option value="completed">ชำระแล้ว</option>
                <option value="pending">รอชำระ</option>
              </select>
            </div>
            <div className="col-md-3 mb-3">
              <label className="form-label">ช่องทางการชำระเงิน</label>
              <select
                className="form-select"
                value={filterPaymentMethod}
                onChange={(e) => setFilterPaymentMethod(e.target.value)}
              >
                <option value="">ทั้งหมด</option>
                <option value="cash">เงินสด</option>
                <option value="transfer">โอนเงิน</option>
                <option value="credit">บัตรเครดิต</option>
              </select>
            </div>
            <div className="col-md-3 mb-3 d-flex align-items-end">
              <button 
                className="btn btn-outline-danger w-100" 
                onClick={resetFilters}
              >
                <i className="fas fa-eraser me-1"></i>
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">กำลังโหลด...</span>
              </div>
              <p className="mt-2">กำลังโหลดข้อมูล...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th style={{ minWidth: '120px' }}>
                      <i className="far fa-calendar-alt me-2"></i>
                      วันที่ใช้บริการ
                    </th>
                    <th style={{ minWidth: '100px' }}>
                      <i className="far fa-clock me-2"></i>
                      เวลา
                    </th>
                    <th style={{ minWidth: '120px' }}>
                      <i className="fas fa-hashtag me-2"></i>
                      รหัสการจอง
                    </th>
                    <th style={{ minWidth: '200px' }}>
                      <i className="fas fa-user me-2"></i>
                      ข้อมูลลูกค้า
                    </th>
                    <th style={{ minWidth: '200px' }}>
                      <i className="fas fa-spa me-2"></i>
                      บริการและรายละเอียด
                    </th>
                    <th style={{ minWidth: '120px' }}>
                      <i className="fas fa-money-bill-wave me-2"></i>
                      ยอดเงิน
                    </th>
                    <th style={{ minWidth: '150px' }}>
                      <i className="fas fa-credit-card me-2"></i>
                      ช่องทางชำระเงิน
                    </th>
                    <th style={{ minWidth: '130px' }}>
                      <i className="fas fa-check-circle me-2"></i>
                      สถานะการชำระ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-5">
                        <div className="d-flex flex-column align-items-center justify-content-center">
                          <i className="far fa-file-alt fa-3x text-muted mb-3"></i>
                          <p className="mb-0">ไม่พบข้อมูลการจองในช่วงเวลาที่เลือก</p>
                          <small className="text-muted">ลองปรับเปลี่ยนตัวกรองหรือช่วงเวลาเพื่อดูข้อมูลเพิ่มเติม</small>
                        </div>
                      </td>
                    </tr>
                  ) : (
                      bookings.map((booking) => {
                      // Determine date object
                      let bookingDate;
                      if (booking.bookingDate && typeof booking.bookingDate.toDate === 'function') {
                        bookingDate = booking.bookingDate.toDate();
                      } else if (booking.date && typeof booking.date === 'string') {
                        bookingDate = new Date(booking.date);
                      } else if (booking.date && typeof booking.date.toDate === 'function') {
                        bookingDate = booking.date.toDate();
                      } else {
                        bookingDate = new Date();
                      }

                      // Determine times
                      let startTime;
                      if (booking.startTime && typeof booking.startTime.toDate === 'function') {
                        startTime = booking.startTime.toDate();
                      } else if (booking.time) {
                        startTime = booking.time;
                      }

                      // Determine payment status from either Bookings or Payments collection
                      const isPaid = booking.paymentStatus === 'ชำระเงินแล้ว' || 
                                   booking.paymentDetails?.paymentStatus === 'ชำระเงินแล้ว' || 
                                   booking.payment?.method === 'completed';
                      const paymentStatus = isPaid ? 'completed' : 'pending';
                      
                      // ข้อมูลเพิ่มเติมสำหรับการแสดงผล
                      let paymentSource = booking.paymentDetails ? 'Payments' : 'Bookings';
                      let paymentDate = null;
                      
                      if (booking.paymentDetails?.paidAt) {
                        paymentDate = booking.paymentDetails.paidAt;
                      } else if (booking.paidAt) {
                        paymentDate = booking.paidAt;
                      }

                      // Determine payment method - ให้ความสำคัญกับข้อมูลจาก Payments collection
                      let paymentMethod = 'ไม่ระบุ';
                      let paymentMethodIcon = 'money-bill-wave';
                      let paymentMethodClass = 'bg-secondary-subtle text-secondary';
                      
                      // ลำดับการดึงข้อมูล: Payments.paymentMethod > Bookings.paymentMethod
                      const rawPaymentMethod = booking.paymentDetails?.paymentMethod || booking.paymentMethod;
                      
                      if (rawPaymentMethod === 'cash') {
                        paymentMethod = 'เงินสด';
                        paymentMethodIcon = 'money-bill-wave';
                        paymentMethodClass = 'bg-success-subtle text-success';
                      } else if (rawPaymentMethod === 'transfer') {
                        paymentMethod = 'โอนเงิน';
                        paymentMethodIcon = 'university';
                        paymentMethodClass = 'bg-primary-subtle text-primary';
                      } else if (rawPaymentMethod === 'credit') {
                        paymentMethod = 'บัตรเครดิต';
                        paymentMethodIcon = 'credit-card';
                        paymentMethodClass = 'bg-warning-subtle text-warning';
                      } else if (rawPaymentMethod) {
                        // ถ้ามีค่าแต่ไม่ตรงกับที่กำหนด ให้แสดงค่าดิบ
                        paymentMethod = rawPaymentMethod;
                        paymentMethodClass = 'bg-info-subtle text-info';
                      }

                      // Calculate days ago
                      const today = new Date();
                      const diffTime = Math.abs(today - bookingDate);
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      const daysAgoText = diffDays === 0 ? 'วันนี้' : diffDays === 1 ? 'เมื่อวาน' : `${diffDays} วันก่อน`;
                      
                      // ตรวจสอบราคาจากหลายแหล่ง
                      const bookingAmount = booking.paymentDetails?.amount || 
                                          booking.paymentDetails?.totalAmount || 
                                          booking.totalAmount || 
                                          booking.price || 0;

                      return (
                        <tr key={booking.id}>
                          <td>
                            <div className="fw-bold" style={{ color: '#2c3e50' }}>{formatDate(bookingDate)}</div>
                            <small className="text-muted">
                              <i className="far fa-calendar me-1"></i>
                              {daysAgoText}
                            </small>
                          </td>
                          <td>
                            <div className="fw-bold" style={{ color: '#0d6efd', fontSize: '1.1rem' }}>
                              {typeof startTime === 'string' ? startTime : formatTime(startTime)}
                            </div>
                            <small className="text-muted">
                              <i className="far fa-clock me-1"></i>
                              น.
                            </small>
                          </td>
                          <td>
                            <span className="badge bg-light text-dark">
                              {booking.id.substring(0, 8)}
                            </span>
                            {booking.paymentDetails && (
                              <span className="badge bg-info ms-1" title="มีข้อมูลจาก Payments collection">P</span>
                            )}
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div style={{ 
                                width: '30px', 
                                height: '30px', 
                                borderRadius: '50%', 
                                background: '#e9ecef', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                marginRight: '8px'
                              }}>
                                <i className="fas fa-user text-secondary"></i>
                              </div>
                              <div>
                                <div>
                                  {/* ลำดับการแสดงชื่อลูกค้า: fullName > displayName > userName > userEmail > customerName */}
                                  {booking.customerDetails?.fullName || 
                                   booking.customerDetails?.displayName || 
                                   booking.customerDetails?.userName ||
                                   booking.userName ||
                                   booking.fullName ||
                                   booking.customerDetails?.email || 
                                   booking.userEmail || 
                                   booking.customerName ||
                                   booking.customerEmail ||
                                   `ลูกค้า (${booking.id.substring(0, 6)})`}
                                </div>
                                {/* แสดงอีเมลถ้ามีและไม่ใช่ชื่อหลัก */}
                                {(booking.customerDetails?.email || booking.userEmail || booking.customerEmail) && 
                                 !(booking.customerDetails?.fullName || booking.customerDetails?.displayName || booking.userName || booking.fullName) && (
                                  <small className="text-muted">{booking.customerDetails?.email || booking.userEmail || booking.customerEmail}</small>
                                )}
                                {/* แสดงเบอร์โทรถ้ามี */}
                                {(booking.customerDetails?.phone || booking.customerDetails?.phoneNumber || booking.phone) && (
                                  <small className="text-muted d-block">{booking.customerDetails?.phone || booking.customerDetails?.phoneNumber || booking.phone}</small>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div style={{ 
                                width: '30px', 
                                height: '30px', 
                                borderRadius: '50%', 
                                background: '#fff3e0', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                marginRight: '8px'
                              }}>
                                <i className="fas fa-spa text-warning"></i>
                              </div>
                              <div>
                                <div>
                                  {/* ลำดับการแสดงชื่อบริการ: service > serviceName > แสดงจาก serviceId */}
                                  {booking.service || 
                                   booking.serviceName || 
                                   (booking.serviceId ? `บริการ (${booking.serviceId.substring(0, 8)})` : 'บริการทั่วไป')}
                                </div>
                                {/* แสดงระยะเวลาถ้ามี */}
                                {booking.duration && (
                                  <small className="text-muted d-block">
                                    <i className="far fa-clock me-1"></i>
                                    {booking.duration} นาที
                                  </small>
                                )}
                                {/* แสดงพนักงานถ้ามี */}
                                {booking.employeeName && (
                                  <small className="text-muted d-block">
                                    <i className="fas fa-user-tie me-1"></i>
                                    {booking.employeeName}
                                  </small>
                                )}
                                {/* แสดง serviceId ถ้าไม่มีข้อมูลอื่น */}
                                {!booking.service && !booking.serviceName && booking.serviceId && (
                                  <small className="text-muted d-block">
                                    <i className="fas fa-hashtag me-1"></i>
                                    ID: {booking.serviceId.substring(0, 8)}...
                                  </small>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="fw-bold text-success" style={{ fontSize: '1.1rem' }}>
                              {formatCurrency(bookingAmount)}
                            </div>
                            {booking.paymentDetails && booking.paymentDetails.amount !== booking.price && (
                              <small className="text-muted d-block">
                                <i className="fas fa-database me-1"></i>
                                จาก {paymentSource}
                              </small>
                            )}
                            {booking.discount && (
                              <small className="text-warning d-block">
                                <i className="fas fa-percent me-1"></i>
                                ส่วนลด: {formatCurrency(booking.discount)}
                              </small>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${paymentMethodClass} px-3 py-2`} style={{ fontSize: '0.9rem' }}>
                              <i className={`fas fa-${paymentMethodIcon} me-2`}></i>
                              {paymentMethod}
                            </span>
                            {booking.paymentDetails?.transactionId && (
                              <div className="mt-1">
                                <small className="text-muted">
                                  <i className="fas fa-receipt me-1"></i>
                                  {booking.paymentDetails.transactionId.substring(0, 10)}...
                                </small>
                              </div>
                            )}
                          </td>
                          <td>
                            {paymentStatus === 'completed' ? (
                              <div>
                                <span className="badge bg-success px-3 py-2" style={{ fontSize: '0.9rem' }}>
                                  <i className="fas fa-check-circle me-2"></i>
                                  ชำระเงินแล้ว
                                </span>
                                {paymentDate && (
                                  <div className="mt-1">
                                    <small className="text-muted">
                                      <i className="far fa-calendar-check me-1"></i>
                                      {formatDate(new Date(paymentDate.seconds ? paymentDate.seconds * 1000 : paymentDate))}
                                    </small>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <span className="badge bg-warning text-dark px-3 py-2" style={{ fontSize: '0.9rem' }}>
                                  <i className="fas fa-hourglass-half me-2"></i>
                                  รอชำระเงิน
                                </span>
                                <div className="mt-1">
                                  <small className="text-muted">
                                    <i className="far fa-clock me-1"></i>
                                    ค้างชำระ
                                  </small>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="table-light fw-bold">
                  <tr>
                    <td colSpan="5" className="text-end">รวมทั้งหมด ({summary.totalBookings} รายการ)</td>
                    <td>{formatCurrency(summary.totalAmount)}</td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* สรุปข้อมูลด้านล่าง */}
          <div className="row mt-4">
            <div className="col-12 mb-3">
              <h5 className="mb-3 border-bottom pb-2"><i className="fas fa-chart-pie me-2 text-primary"></i>สรุปการชำระเงิน</h5>
            </div>
            <div className="col-md-8">
              <div className="row">
                <div className="col-md-4 mb-3">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body">
                      <div className="d-flex align-items-center mb-2">
                        <div className="me-3">
                          <div style={{ width: '45px', height: '45px', borderRadius: '10px', background: 'rgba(13, 110, 253, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-university fa-lg text-primary"></i>
                          </div>
                        </div>
                        <div>
                          <h6 className="mb-0 text-muted">โอนเงิน</h6>
                          <div className="h5 mb-0 mt-1">{formatCurrency(summary.totalTransfer)}</div>
                        </div>
                      </div>
                      <div className="progress mt-2" style={{ height: '6px' }}>
                        <div 
                          className="progress-bar bg-primary" 
                          role="progressbar" 
                          style={{ width: `${summary.totalAmount ? (summary.totalTransfer / summary.totalAmount * 100) : 0}%` }}
                          aria-valuenow={summary.totalTransfer} 
                          aria-valuemin="0" 
                          aria-valuemax={summary.totalAmount}>
                        </div>
                      </div>
                      <div className="text-end mt-1">
                        <small className="text-muted">
                          {summary.totalAmount ? Math.round(summary.totalTransfer / summary.totalAmount * 100) : 0}% ของยอดรวม
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-4 mb-3">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body">
                      <div className="d-flex align-items-center mb-2">
                        <div className="me-3">
                          <div style={{ width: '45px', height: '45px', borderRadius: '10px', background: 'rgba(40, 167, 69, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-money-bill-wave fa-lg text-success"></i>
                          </div>
                        </div>
                        <div>
                          <h6 className="mb-0 text-muted">เงินสด</h6>
                          <div className="h5 mb-0 mt-1">{formatCurrency(summary.totalCash)}</div>
                        </div>
                      </div>
                      <div className="progress mt-2" style={{ height: '6px' }}>
                        <div 
                          className="progress-bar bg-success" 
                          role="progressbar" 
                          style={{ width: `${summary.totalAmount ? (summary.totalCash / summary.totalAmount * 100) : 0}%` }}
                          aria-valuenow={summary.totalCash} 
                          aria-valuemin="0" 
                          aria-valuemax={summary.totalAmount}>
                        </div>
                      </div>
                      <div className="text-end mt-1">
                        <small className="text-muted">
                          {summary.totalAmount ? Math.round(summary.totalCash / summary.totalAmount * 100) : 0}% ของยอดรวม
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-4 mb-3">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body">
                      <div className="d-flex align-items-center mb-2">
                        <div className="me-3">
                          <div style={{ width: '45px', height: '45px', borderRadius: '10px', background: 'rgba(255, 193, 7, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="far fa-credit-card fa-lg text-warning"></i>
                          </div>
                        </div>
                        <div>
                          <h6 className="mb-0 text-muted">บัตรเครดิต</h6>
                          <div className="h5 mb-0 mt-1">{formatCurrency(summary.totalCreditCard)}</div>
                        </div>
                      </div>
                      <div className="progress mt-2" style={{ height: '6px' }}>
                        <div 
                          className="progress-bar bg-warning" 
                          role="progressbar" 
                          style={{ width: `${summary.totalAmount ? (summary.totalCreditCard / summary.totalAmount * 100) : 0}%` }}
                          aria-valuenow={summary.totalCreditCard} 
                          aria-valuemin="0" 
                          aria-valuemax={summary.totalAmount}>
                        </div>
                      </div>
                      <div className="text-end mt-1">
                        <small className="text-muted">
                          {summary.totalAmount ? Math.round(summary.totalCreditCard / summary.totalAmount * 100) : 0}% ของยอดรวม
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4 mb-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <h5 className="mb-4 text-center">สรุปสถานะการชำระเงิน</h5>
                  <div className="d-flex justify-content-center">
                    <div style={{ width: '150px', height: '150px', position: 'relative' }}>
                      {/* ใช้แถบสีแทนกราฟวงกลม */}
                      <div style={{ 
                        width: '100%', 
                        height: '100%', 
                        borderRadius: '50%', 
                        background: `conic-gradient(
                          #28a745 0% ${summary.completedBookings / (summary.completedBookings + summary.pendingBookings) * 100}%, 
                          #ffc107 ${summary.completedBookings / (summary.completedBookings + summary.pendingBookings) * 100}% 100%
                        )` 
                      }}></div>
                      {/* วงกลมตรงกลาง */}
                      <div style={{ 
                        position: 'absolute', 
                        top: '50%', 
                        left: '50%', 
                        transform: 'translate(-50%, -50%)',
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        background: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <span className="h3 mb-0">{summary.totalBookings}</span>
                        <small className="text-muted">รายการ</small>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex justify-content-between mt-4">
                    <div className="d-flex align-items-center">
                      <div className="me-2" style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#28a745' }}></div>
                      <span>ชำระแล้ว ({summary.completedBookings})</span>
                    </div>
                    <div className="d-flex align-items-center">
                      <div className="me-2" style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#ffc107' }}></div>
                      <span>รอชำระ ({summary.pendingBookings})</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* ยอดรวมทั้งหมด */}
          <div className="card border-0 shadow-sm bg-gradient text-white mt-3" style={{ background: 'linear-gradient(135deg, #7B4019 0%, #964B1F 100%)' }}>
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <div className="me-3">
                    <i className="fas fa-calculator fa-2x"></i>
                  </div>
                  <div>
                    <h5 className="mb-0">ยอดรวมทั้งหมด</h5>
                    <small>ระหว่างวันที่ {formatDate(new Date(startDate))} - {formatDate(new Date(endDate))}</small>
                  </div>
                </div>
                <div className="h3 mb-0">{formatCurrency(summary.totalAmount)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentReport;

