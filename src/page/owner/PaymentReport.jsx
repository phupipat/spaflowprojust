import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../Firebase';
import '../../styles/SharedStyles.css';
import * as XLSX from 'xlsx';

const PaymentReport = () => {
  const [bookings, setBookings] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
  // กำหนดช่วงวันที่เริ่มต้นเป็นเดือนปัจจุบัน
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

  // ดึงข้อมูลการชำระเงินจาก collection Payments ก่อน
      const paymentsMap = {};
      try {
        const paymentsCol = collection(db, 'Payments');
        const paymentsSnap = await getDocs(paymentsCol);
        
        if (!paymentsSnap.empty) {
          console.log(`Found ${paymentsSnap.size} payment records`);
          paymentsSnap.docs.forEach(doc => {
            const paymentData = doc.data();
            console.log('Payment record:', JSON.stringify({
              id: doc.id,
              bookingId: paymentData.bookingId,
              bookingIds: paymentData.bookingIds,
              paymentMethod: paymentData.paymentMethod,
              amount: paymentData.amount || paymentData.totalAmount,
              paymentStatus: paymentData.paymentStatus
            }, null, 2));
            
            const paymentInfo = {
              id: doc.id,
              ...paymentData,
              paymentSource: 'Payments'
            };
            
            // รองรับทั้ง bookingId (string) และ bookingIds (array)
            if (paymentData.bookingId) {
              paymentsMap[paymentData.bookingId] = paymentInfo;
            }
            
            // รองรับ bookingIds (array) - แม็ปแต่ละ bookingId ในอาร์เรย์
            if (Array.isArray(paymentData.bookingIds) && paymentData.bookingIds.length > 0) {
              paymentData.bookingIds.forEach(bid => {
                if (bid) {
                  paymentsMap[bid] = paymentInfo;
                }
              });
            }
          });
          
          console.log('Final paymentsMap keys:', Object.keys(paymentsMap));
          console.log('Sample paymentsMap values:');
          Object.keys(paymentsMap).slice(0, 3).forEach(key => {
            console.log(`  ${key}:`, JSON.stringify({
              paymentMethod: paymentsMap[key].paymentMethod,
              paymentStatus: paymentsMap[key].paymentStatus,
              totalAmount: paymentsMap[key].totalAmount || paymentsMap[key].amount,
              bookingIds: paymentsMap[key].bookingIds,
              bookingId: paymentsMap[key].bookingId
            }, null, 2));
          });
        }
      } catch (error) {
        console.error("Error fetching payment details:", error);
      }

  // ลองดึงข้อมูลจาก collection 'bookings' ก่อน
      let bookingsQuery = query(
        collection(db, 'bookings'),
        where('bookingDate', '>=', startTimestamp),
        where('bookingDate', '<=', endTimestamp)
      );

      let bookingsSnapshot = await getDocs(bookingsQuery);
      
  // ถ้าไม่พบข้อมูล ลองดึงจาก collection 'Bookings' (B ใหญ่)
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
          
          // อัปเดตข้อมูลชำระเงินถ้ามีข้อมูลจาก collection Payments
          booking.paymentStatus = paymentInfo.paymentStatus || booking.paymentStatus;
          booking.paymentMethod = paymentInfo.paymentMethod || booking.paymentMethod;
          booking.totalAmount = paymentInfo.amount || paymentInfo.totalAmount || booking.totalAmount || booking.price;
          booking.paidAt = paymentInfo.paidAt || paymentInfo.paymentDate || booking.paidAt;
          
          // Debug: แสดงข้อมูลการแม็ป (สำหรับ 3 รายการแรก)
          if (bookingsData.length < 3) {
            console.log('PaymentReport booking mapping:', JSON.stringify({
              bookingId: booking.id,
              originalPaymentMethod: booking.paymentMethod,
              paymentsPaymentMethod: paymentInfo.paymentMethod,
              finalPaymentMethod: booking.paymentDetails?.paymentMethod,
              paymentSource: 'Payments',
              paymentStatus: paymentInfo.paymentStatus,
              amount: paymentInfo.amount || paymentInfo.totalAmount
            }, null, 2));
          }
        } else {
          // Debug: แสดงกรณีที่ไม่พบข้อมูลใน Payments
          if (bookingsData.length < 3) {
            console.log('PaymentReport booking without payment mapping:', JSON.stringify({
              bookingId: booking.id,
              bookingPaymentMethod: booking.paymentMethod,
              paymentSource: 'Bookings only',
              totalAmount: booking.totalAmount || booking.price,
              paymentStatus: booking.paymentStatus
            }, null, 2));
          }
        }
        
  // ดึงข้อมูลลูกค้า ถ้าจำเป็น
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

  // ดึงข้อมูลบริการ ถ้าจำเป็น
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

  // ดึงข้อมูลพนักงาน ถ้าจำเป็น
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

  // ตรวจสอบให้แน่ใจว่าข้อมูลการชำระเงินถูกจัดรูปแบบถูกต้อง
        booking.payment = booking.payment || {
          method: booking.paymentStatus === 'ชำระเงินแล้ว' ? 'completed' : 'pending',
          totalAmount: booking.totalAmount || booking.price || 0,
          cash: booking.paymentMethod === 'cash' ? (booking.totalAmount || booking.price || 0) : 0,
          transfer: booking.paymentMethod === 'transfer' ? (booking.totalAmount || booking.price || 0) : 0,
          creditCard: booking.paymentMethod === 'credit' ? (booking.totalAmount || booking.price || 0) : 0
        };

  // ใช้ตัวกรองเพิ่มเติมถ้ามีการตั้งค่า
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

  // คำนวณยอดรวมสรุป
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
      
  // ตรวจสอบวิธีการชำระเงิน - ให้ความสำคัญกับข้อมูลจาก collection Payments
      const rawPaymentMethod = booking.paymentDetails?.paymentMethod || booking.paymentMethod || '';
      
  // แปลง payment method ให้อยู่ในรูปแบบเดียวกับ DashboardOwner
      let normalizedPaymentMethod = 'cash'; // default fallback
      if (rawPaymentMethod) {
        const methodLower = rawPaymentMethod.toString().toLowerCase();
        if (methodLower.includes('credit') || methodLower.includes('card') || methodLower.includes('visa') || methodLower.includes('master')) {
          normalizedPaymentMethod = 'credit';
        } else if (methodLower.includes('transfer') || methodLower.includes('bank') || methodLower.includes('promptpay') || methodLower.includes('qr') || methodLower.includes('banking')) {
          normalizedPaymentMethod = 'transfer';
        } else if (methodLower.includes('cash') || methodLower === 'cash') {
          normalizedPaymentMethod = 'cash';
        } else if (['credit', 'transfer', 'cash'].includes(methodLower)) {
          normalizedPaymentMethod = methodLower;
        } else {
          // ถ้าไม่รู้จัก ให้เก็บไว้เป็น other แต่ยังนับเป็น cash ใน summary เดิม (เพื่อไม่ให้ UI เสีย)
          console.log('Unknown payment method in PaymentReport summary:', rawPaymentMethod, 'for booking', booking.id);
          normalizedPaymentMethod = 'cash'; // fallback
        }
      }
      
  // Debug: แสดงการแม็ป payment method (สำหรับ 5 รายการแรก)
      if (bookings.indexOf(booking) < 5) {
        console.log('PaymentReport summary mapping booking', booking.id, ':', JSON.stringify({
          bookingId: booking.id,
          rawMethod: rawPaymentMethod,
          normalized: normalizedPaymentMethod,
          source: booking.paymentDetails ? 'Payments' : 'Bookings',
          amount: amount,
          paymentDetailsExists: !!booking.paymentDetails,
          paymentDetailsMethod: booking.paymentDetails?.paymentMethod
        }, null, 2));
      }
      
      if (normalizedPaymentMethod === 'cash') {
        summary.totalCash += amount;
      } else if (normalizedPaymentMethod === 'transfer') {
        summary.totalTransfer += amount;
      } else if (normalizedPaymentMethod === 'credit') {
        summary.totalCreditCard += amount;
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

  // ฟังก์ชันแปลงวันที่สำหรับแสดงผล
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH');
  };

  // ฟังก์ชันแปลงเวลาเพื่อแสดงผล
  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  };

  // ฟังก์ชันคำนวณระยะเวลา
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'N/A';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end - start;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} ชั่วโมง ${minutes} นาที`;
  };

  // ฟังก์ชันแปลงจำนวนเงินเป็นรูปแบบสกุลเงิน
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(Number(amount) || 0);
  };

  // ฟังก์ชันส่งออกรายงานการชำระเงินเป็น Excel
  const exportPaymentReportToExcel = () => {
    try {
      setExporting(true);
      
  // เตรียมข้อมูลสำหรับรายงานการชำระเงิน
      const paymentReportData = bookings.map(booking => {
        // ตรวจสอบและแปลงวันที่ (รองรับ bookingDate เป็น string หรือ Timestamp)
        let bookingDate = null;
        if (booking.bookingDate) {
          if (typeof booking.bookingDate.toDate === 'function') {
            bookingDate = booking.bookingDate.toDate();
          } else if (typeof booking.bookingDate === 'string') {
            bookingDate = new Date(booking.bookingDate);
          }
        } else if (booking.date) {
          if (typeof booking.date.toDate === 'function') {
            bookingDate = booking.date.toDate();
          } else if (typeof booking.date === 'string') {
            bookingDate = new Date(booking.date);
          }
        } else if (booking.serviceDate) {
          if (typeof booking.serviceDate.toDate === 'function') {
            bookingDate = booking.serviceDate.toDate();
          } else if (typeof booking.serviceDate === 'string') {
            bookingDate = new Date(booking.serviceDate);
          }
        } else if (booking.appointmentDate) {
          if (typeof booking.appointmentDate.toDate === 'function') {
            bookingDate = booking.appointmentDate.toDate();
          } else if (typeof booking.appointmentDate === 'string') {
            bookingDate = new Date(booking.appointmentDate);
          }
        }

  // ตรวจสอบและแปลงเวลาเริ่มต้น
        let startTime;
        if (booking.startTime && typeof booking.startTime.toDate === 'function') {
          startTime = booking.startTime.toDate();
        } else if (booking.bookingTime && typeof booking.bookingTime.toDate === 'function') {
          startTime = booking.bookingTime.toDate();
        } else if (booking.time) {
          startTime = booking.time;
        } else if (booking.bookingTime && typeof booking.bookingTime === 'string') {
          startTime = booking.bookingTime;
        } else if (booking.appointmentTime) {
          startTime = booking.appointmentTime;
        } else if (booking.serviceTime) {
          startTime = booking.serviceTime;
        }

  // ข้อมูลเพิ่มเติมสำหรับการแสดงผล
        let paymentSource = booking.paymentDetails ? 'Payments' : 'Bookings';
        let paymentDate = null;
        
        if (booking.paymentDetails?.paidAt) {
          paymentDate = booking.paymentDetails.paidAt;
        } else if (booking.paidAt) {
          paymentDate = booking.paidAt;
        }

  // ตรวจสอบสถานะการชำระเงิน
        const isPaid = booking.paymentStatus === 'ชำระเงินแล้ว' || 
                       booking.paymentDetails?.paymentStatus === 'ชำระเงินแล้ว' || 
                       booking.payment?.method === 'completed';
        const paymentStatusText = isPaid ? 'ชำระเงินแล้ว' : 'รอชำระเงิน';

  // ตรวจสอบวิธีการชำระเงิน
        const rawPaymentMethod = booking.paymentDetails?.paymentMethod || booking.paymentMethod || '';
        let paymentMethodText = 'ไม่ระบุ';
        
  // แปลงวิธีการชำระเงินให้เป็นข้อความภาษาไทย
        if (rawPaymentMethod) {
          const methodLower = rawPaymentMethod.toString().toLowerCase();
          if (methodLower.includes('credit') || methodLower.includes('card') || methodLower === 'credit') {
            paymentMethodText = 'บัตรเครดิต';
          } else if (methodLower.includes('transfer') || methodLower.includes('bank') || methodLower.includes('promptpay') || methodLower === 'transfer') {
            paymentMethodText = 'โอนเงิน';
          } else if (methodLower.includes('cash') || methodLower === 'cash') {
            paymentMethodText = 'เงินสด';
          } else {
            paymentMethodText = rawPaymentMethod;
          }
        }

  // ตรวจสอบข้อมูลลูกค้า
        const customerName = booking.customerDetails?.fullName
          || booking.customerDetails?.displayName
          || booking.customerDetails?.name
          || booking.fullName
          || booking.displayName
          || booking.name
          || booking.customerDetails?.email
          || booking.userEmail
          || booking.customerEmail
          || `ลูกค้า (${booking.id.substring(0, 6)})`;
        
        const customerEmail = booking.customerDetails?.email || booking.userEmail || booking.customerEmail || '-';
        const customerPhone = booking.customerDetails?.phone || booking.customerDetails?.phoneNumber || booking.phone || '-';
        
  // ตรวจสอบข้อมูลบริการ
        const serviceName = booking.service || booking.serviceName || 'บริการทั่วไป';
        
  // ตรวจสอบราคา
        const bookingAmount = booking.paymentDetails?.amount || 
                             booking.paymentDetails?.totalAmount || 
                             booking.totalAmount || 
                             booking.price || 0;
                             
  // ข้อมูลใบเสร็จ
        const receiptInfo = booking.paymentDetails?.transactionId || booking.transactionId || '-';

  // ข้อมูลวันที่ชำระเงิน
        let formattedPaymentDate = '-';
        if (paymentDate) {
          try {
            let paidDate;
            if (paymentDate.seconds) {
              paidDate = new Date(paymentDate.seconds * 1000);
            } else if (typeof paymentDate === 'string') {
              paidDate = new Date(paymentDate);
            } else {
              paidDate = new Date(paymentDate);
            }
            formattedPaymentDate = paidDate.toLocaleDateString('th-TH');
          } catch (e) {
            console.error('Error formatting payment date:', e);
            formattedPaymentDate = '-';
          }
        }

        return {
          'วันที่ใช้บริการ': bookingDate.toLocaleDateString('th-TH'),
          'เวลา': typeof startTime === 'string' ? startTime : (startTime ? new Date(startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'),
          'รหัสการจอง': booking.id,
          'ชื่อลูกค้า': customerName,
          'อีเมล': customerEmail,
          'โทรศัพท์': customerPhone,
          'บริการ': serviceName,
          'จำนวนเงิน': Number(bookingAmount),
          'ช่องทางชำระเงิน': paymentMethodText,
          'สถานะการชำระ': paymentStatusText,
          'เลขที่ใบเสร็จ': receiptInfo,
          'วันที่ชำระเงิน': formattedPaymentDate,
          'แหล่งข้อมูล': paymentSource
        };
      });

  // สร้างข้อมูลสรุป
      const summary = calculateSummary();
      const summaryData = [
        { 'สรุปข้อมูล': 'รายงานการชำระเงิน', 'จำนวน': '', 'มูลค่า': '' },
        { 'สรุปข้อมูล': `ระหว่างวันที่ ${formatDate(new Date(startDate))} - ${formatDate(new Date(endDate))}`, 'จำนวน': '', 'มูลค่า': '' },
        { 'สรุปข้อมูล': '', 'จำนวน': '', 'มูลค่า': '' },
        { 'สรุปข้อมูล': 'จำนวนรายการทั้งหมด', 'จำนวน': summary.totalBookings, 'มูลค่า': summary.totalAmount },
        { 'สรุปข้อมูล': 'ชำระเงินแล้ว', 'จำนวน': summary.completedBookings, 'มูลค่า': '' },
        { 'สรุปข้อมูล': 'รอชำระเงิน', 'จำนวน': summary.pendingBookings, 'มูลค่า': '' },
        { 'สรุปข้อมูล': '', 'จำนวน': '', 'มูลค่า': '' },
        { 'สรุปข้อมูล': 'แยกตามวิธีการชำระเงิน', 'จำนวน': '', 'มูลค่า': '' },
        { 'สรุปข้อมูล': 'เงินสด', 'จำนวน': '', 'มูลค่า': summary.totalCash },
        { 'สรุปข้อมูล': 'โอนเงิน', 'จำนวน': '', 'มูลค่า': summary.totalTransfer },
        { 'สรุปข้อมูล': 'บัตรเครดิต', 'จำนวน': '', 'มูลค่า': summary.totalCreditCard },
      ];

  // สร้าง Workbook
      const wb = XLSX.utils.book_new();
      
  // สร้าง Worksheet สำหรับข้อมูลการชำระเงิน
      const ws = XLSX.utils.json_to_sheet(paymentReportData);
      
  // กำหนดความกว้างของคอลัมน์
      const wscols = [
        { wch: 15 }, // วันที่ใช้บริการ
        { wch: 10 }, // เวลา
        { wch: 25 }, // รหัสการจอง
        { wch: 20 }, // ชื่อลูกค้า
        { wch: 25 }, // อีเมล
        { wch: 15 }, // โทรศัพท์
        { wch: 20 }, // บริการ
        { wch: 12 }, // จำนวนเงิน
        { wch: 15 }, // ช่องทางชำระเงิน
        { wch: 15 }, // สถานะการชำระ
        { wch: 25 }, // เลขที่ใบเสร็จ
        { wch: 15 }, // วันที่ชำระเงิน
        { wch: 10 }  // แหล่งข้อมูล
      ];
      ws['!cols'] = wscols;
      
  // เพิ่ม Worksheet ลงใน Workbook
      XLSX.utils.book_append_sheet(wb, ws, "รายงานการชำระเงิน");
      
  // สร้าง Worksheet สำหรับข้อมูลสรุป
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      
  // กำหนดความกว้างของคอลัมน์สำหรับหน้าสรุป
      const wsSummaryCols = [
        { wch: 30 }, // สรุปข้อมูล
        { wch: 15 }, // จำนวน
        { wch: 15 }  // มูลค่า
      ];
      wsSummary['!cols'] = wsSummaryCols;
      
  // เพิ่ม Worksheet สรุปลงใน Workbook
      XLSX.utils.book_append_sheet(wb, wsSummary, "สรุปข้อมูล");
      
  // กำหนดชื่อไฟล์
      const fileName = `รายงานการชำระเงิน_${startDate}_ถึง_${endDate}.xlsx`;
      
  // สร้างไฟล์ Excel และดาวน์โหลด
      XLSX.writeFile(wb, fileName);
      
      console.log(`Successfully exported payment report to ${fileName}`);
      
    } catch (error) {
      console.error("Error exporting payment report to Excel:", error);
      alert("เกิดข้อผิดพลาดในการส่งออกรายงาน โปรดลองอีกครั้ง");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container-fluid p-4 animate-fade-in">
      <div className="card shadow-sm border-0 mb-4" style={{ border: '2px solid #7B4019', borderRadius: '16px' }}>
        <div className="card-header text-white" style={{ background: 'linear-gradient(90deg, #a86a3d 0%, #7B4019 100%)', color: '#fff', borderTopLeftRadius: '14px', borderTopRightRadius: '14px', borderBottom: '2px solid #7B4019' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h4 className="mb-0">
              <i className="fas fa-cash-register me-2"></i>
              รายงานสถานะการชำระเงิน
            </h4>
            <div>
              <button 
                className="btn btn-sm btn-light" 
                onClick={exportPaymentReportToExcel}
                disabled={exporting || loading || bookings.length === 0}
              >
                {exporting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                    กำลังส่งออกข้อมูล...
                  </>
                ) : (
                  <>
                    <i className="fas fa-download me-1"></i> ดาวน์โหลดรายงาน
                  </>
                )}
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
                className="btn btn-brown me-2" 
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
                className="btn btn-outline-secondary" 
                onClick={setToday}
              >
                <i className="fas fa-calendar-day me-1"></i>
                วันนี้
              </button>
            </div>
          </div>

          {/* ส่วนกรองข้อมูลละเอียด */}
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
                      // Determine date object (รองรับ bookingDate เป็น string หรือ Timestamp)
                      let bookingDate = null;
                      if (booking.bookingDate) {
                        if (typeof booking.bookingDate.toDate === 'function') {
                          bookingDate = booking.bookingDate.toDate();
                        } else if (typeof booking.bookingDate === 'string') {
                          bookingDate = new Date(booking.bookingDate);
                        }
                      } else if (booking.date) {
                        if (typeof booking.date.toDate === 'function') {
                          bookingDate = booking.date.toDate();
                        } else if (typeof booking.date === 'string') {
                          bookingDate = new Date(booking.date);
                        }
                      } else if (booking.serviceDate) {
                        if (typeof booking.serviceDate.toDate === 'function') {
                          bookingDate = booking.serviceDate.toDate();
                        } else if (typeof booking.serviceDate === 'string') {
                          bookingDate = new Date(booking.serviceDate);
                        }
                      } else if (booking.appointmentDate) {
                        if (typeof booking.appointmentDate.toDate === 'function') {
                          bookingDate = booking.appointmentDate.toDate();
                        } else if (typeof booking.appointmentDate === 'string') {
                          bookingDate = new Date(booking.appointmentDate);
                        }
                      }

                      // Determine times - รองรับหลายฟิลด์
                      let startTime;
                      if (booking.startTime && typeof booking.startTime.toDate === 'function') {
                        startTime = booking.startTime.toDate();
                      } else if (booking.bookingTime && typeof booking.bookingTime.toDate === 'function') {
                        startTime = booking.bookingTime.toDate();
                      } else if (booking.time) {
                        startTime = booking.time;
                      } else if (booking.bookingTime && typeof booking.bookingTime === 'string') {
                        startTime = booking.bookingTime;
                      } else if (booking.appointmentTime) {
                        startTime = booking.appointmentTime;
                      } else if (booking.serviceTime) {
                        startTime = booking.serviceTime;
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
                      
                      // Normalize payment method เหมือนในส่วน calculateSummary
                      if (rawPaymentMethod) {
                        const methodLower = rawPaymentMethod.toString().toLowerCase();
                        if (methodLower.includes('credit') || methodLower.includes('card') || methodLower.includes('visa') || methodLower.includes('master')) {
                          paymentMethod = 'บัตรเครดิต';
                          paymentMethodIcon = 'credit-card';
                          paymentMethodClass = 'bg-warning-subtle text-warning';
                        } else if (methodLower.includes('transfer') || methodLower.includes('bank') || methodLower.includes('promptpay') || methodLower.includes('qr') || methodLower.includes('banking')) {
                          paymentMethod = 'โอนเงิน';
                          paymentMethodIcon = 'university';
                          paymentMethodClass = 'bg-primary-subtle text-primary';
                        } else if (methodLower.includes('cash') || methodLower === 'cash') {
                          paymentMethod = 'เงินสด';
                          paymentMethodIcon = 'money-bill-wave';
                          paymentMethodClass = 'bg-success-subtle text-success';
                        } else if (['credit', 'transfer', 'cash'].includes(methodLower)) {
                          if (methodLower === 'credit') {
                            paymentMethod = 'บัตรเครดิต';
                            paymentMethodIcon = 'credit-card';
                            paymentMethodClass = 'bg-warning-subtle text-warning';
                          } else if (methodLower === 'transfer') {
                            paymentMethod = 'โอนเงิน';
                            paymentMethodIcon = 'university';
                            paymentMethodClass = 'bg-primary-subtle text-primary';
                          } else if (methodLower === 'cash') {
                            paymentMethod = 'เงินสด';
                            paymentMethodIcon = 'money-bill-wave';
                            paymentMethodClass = 'bg-success-subtle text-success';
                          }
                        } else {
                          // ถ้ามีค่าแต่ไม่ตรงกับที่กำหนด ให้แสดงค่าดิบ
                          paymentMethod = rawPaymentMethod;
                          paymentMethodClass = 'bg-info-subtle text-info';
                          console.log('Unknown payment method in table display:', rawPaymentMethod, 'for booking', booking.id);
                        }
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
                            <div className="fw-bold" style={{ color: '#2c3e50' }}>
                              {bookingDate ? formatDate(bookingDate) : '-'}
                            </div>
                            <small className="text-muted">
                              <i className="far fa-calendar me-1"></i>
                              {bookingDate ? daysAgoText : ''}
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
                                  {/* แสดงชื่อเต็มลูกค้า ถ้าไม่มีให้ fallback เป็น email */}
                                  {booking.customerDetails?.fullName
                                    || booking.customerDetails?.displayName
                                    || booking.customerDetails?.name
                                    || booking.fullName
                                    || booking.displayName
                                    || booking.name
                                    || booking.customerDetails?.email
                                    || booking.userEmail
                                    || booking.customerEmail
                                    || `ลูกค้า (${booking.id.substring(0, 6)})`}
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

          {/* ส่วนสรุปข้อมูลด้านล่าง */}
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
          
          {/* ส่วนยอดรวมทั้งหมด */}
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
          
          {/* ส่วนคำอธิบายการดาวน์โหลดรายงาน */}
          {bookings.length > 0 && (
            <div className="alert alert-info mt-3">
              <div className="d-flex">
                <div className="me-3">
                  <i className="fas fa-info-circle fa-2x"></i>
                </div>
                <div>
                  <h5 className="alert-heading">ข้อมูลการดาวน์โหลดรายงาน</h5>
                  <p className="mb-0">
                    คลิกปุ่ม "ดาวน์โหลดรายงาน" ที่ด้านบนของหน้านี้เพื่อบันทึกข้อมูลการชำระเงินในรูปแบบไฟล์ Excel (.xlsx)
                    ไฟล์รายงานจะประกอบด้วย 2 ชีท ได้แก่:
                  </p>
                  <ul className="mb-0 mt-2">
                    <li>รายงานการชำระเงิน: ข้อมูลรายละเอียดทั้งหมดของการชำระเงินแต่ละรายการ</li>
                    <li>สรุปข้อมูล: ภาพรวมจำนวนและมูลค่าการชำระเงินแยกตามวิธีการชำระ</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentReport;

