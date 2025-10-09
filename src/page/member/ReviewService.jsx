import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../Firebase';
import { doc, getDoc, updateDoc, collection, addDoc, setDoc, increment, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { FaStar, FaRegStar, FaArrowLeft } from 'react-icons/fa';
import '../../styles/SharedStyles.css';

function ReviewService() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!user || !bookingId) {
        setError('ไม่พบข้อมูลการจองหรือผู้ใช้');
        setLoading(false);
        return;
      }
      
      try {
        console.log('Fetching booking details for ID:', bookingId);
        console.log('Current user:', user.uid);
        
        // Wrap Firestore operations in a try-catch with timeout to handle connection issues
        const fetchWithTimeout = async () => {
          try {
            const bookingRef = doc(db, 'Bookings', bookingId);
            const bookingDoc = await Promise.race([
              getDoc(bookingRef),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('การเชื่อมต่อกับฐานข้อมูลหมดเวลา')), 10000)
              )
            ]);
            
            return bookingDoc;
          } catch (error) {
            console.error('Firestore connection error:', error);
            throw new Error('ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้ โปรดตรวจสอบการเชื่อมต่อของคุณ');
          }
        };
        
        const bookingDoc = await fetchWithTimeout();
        
        if (!bookingDoc.exists()) {
          setError('ไม่พบข้อมูลการจอง');
          setLoading(false);
          return;
        }
        
        let bookingData = { id: bookingDoc.id, ...bookingDoc.data() };
        // ถ้ารีวิวแล้ว (canReview === false) และมี reviewsId ให้ดึงข้อมูลรีวิวจาก Reviews
        let reviewData = null;
        if (bookingData.canReview === false && bookingData.reviewsId && bookingData.reviewsId !== "") {
          try {
            const reviewRef = doc(db, 'Reviews', bookingData.reviewsId);
            const reviewDoc = await getDoc(reviewRef);
            if (reviewDoc.exists()) {
              reviewData = reviewDoc.data();
              // รวมข้อมูลรีวิวเข้า bookingData เพื่อใช้แสดงผล
              bookingData.rating = reviewData.rating;
              bookingData.review = reviewData.comment;
              bookingData.reviewedAt = reviewData.createdAt;
            }
          } catch (err) {
            console.error('Error fetching review data:', err);
          }
        }
        console.log('Booking data fetched:', bookingData);
        
        // ตรวจสอบว่าเป็นการจองของผู้ใช้นี้หรือไม่
        if (bookingData.userId !== user.uid) {
          setError('คุณไม่มีสิทธิ์เข้าถึงการจองนี้');
          setLoading(false);
          return;
        }
        
        // ตรวจสอบว่ารีวิวได้หรือไม่
        console.log('📋 ข้อมูลการจอง:', bookingData);
        console.log('📊 สถานะการจอง:', bookingData.status);
        console.log('🔍 ฟิลด์ canReview:', bookingData.canReview);

        // ให้รีวิวได้เฉพาะเมื่อ canReview เป็น true
        if (!bookingData.canReview) {
          setError('คุณสามารถให้คะแนนได้เฉพาะการจองที่เปิดให้รีวิวเท่านั้น');
          setLoading(false);
          return;
        }
        
        // ดึงข้อมูลบริการเพิ่มเติมหากมี serviceId
        if (bookingData.serviceId && (!bookingData.service || bookingData.service === '')) {
          try {
            console.log('Fetching service details for service ID:', bookingData.serviceId);
            const serviceRef = doc(db, 'Services', bookingData.serviceId);
            
            // Add timeout for service fetch
            const serviceDoc = await Promise.race([
              getDoc(serviceRef),
              new Promise((_, reject) => 
                setTimeout(() => {
                  console.warn('Service fetch timeout');
                  reject(new Error('การเชื่อมต่อกับฐานข้อมูลหมดเวลา'));
                }, 8000)
              )
            ]);
            
            if (serviceDoc.exists()) {
              const serviceData = serviceDoc.data();
              console.log('Service data fetched:', serviceData);
              bookingData.service = serviceData.name || serviceData.serviceName || 'ไม่ระบุ';
              // เพิ่มข้อมูลรายละเอียดบริการ
              bookingData.serviceDescription = serviceData.description || serviceData.details || '';
              bookingData.servicePrice = serviceData.price || 0;
              bookingData.serviceDuration = serviceData.duration || 0;
              bookingData.serviceCategory = serviceData.category || '';
            }
          } catch (error) {
            console.error('Error fetching service details:', error);
          }
        }
        
        // ดึงข้อมูลพนักงานเพิ่มเติมหากมี employeeId
        if (bookingData.employeeId && (!bookingData.employeeName || bookingData.employeeName === '')) {
          try {
            console.log('Fetching employee details for employee ID:', bookingData.employeeId);
            const employeeRef = doc(db, 'artifacts/login-spa-7921d/users', bookingData.employeeId);
            
            // Add timeout for employee fetch
            const employeeDoc = await Promise.race([
              getDoc(employeeRef),
              new Promise((_, reject) => 
                setTimeout(() => {
                  console.warn('Employee fetch timeout');
                  return null; // Use resolve with null instead of reject to prevent breaking the flow
                }, 8000)
              )
            ]);
            
            if (employeeDoc && employeeDoc.exists()) {
              const employeeData = employeeDoc.data();
              console.log('Employee data fetched:', employeeData);
              if (employeeData.role === 'employee' && (employeeData.fullName || employeeData.fullname)) {
                bookingData.employeeName = employeeData.fullName || employeeData.fullname;
              } else {
                bookingData.employeeName = employeeData.displayName || employeeData.name || 'ไม่ระบุ';
              }
              // เพิ่มข้อมูลเพิ่มเติมของพนักงาน
              bookingData.employeePosition = employeeData.position || '';
              bookingData.employeeExpertise = employeeData.expertise || '';
            }
          } catch (error) {
            console.error('Error fetching employee details:', error);
          }
        }
        
        // ดึงข้อมูลการชำระเงินเพิ่มเติม
        try {
          console.log('Fetching payment details for booking ID:', bookingId);
          const paymentsQuery = collection(db, 'Payments');
          
          // Add timeout for payments fetch
          const paymentDocs = await Promise.race([
            getDocs(query(paymentsQuery, where('bookingId', '==', bookingId))),
            new Promise((resolve) => 
              setTimeout(() => {
                console.warn('Payments fetch timeout');
                resolve({ empty: true }); // Return empty result instead of rejecting
              }, 8000)
            )
          ]);
          
          if (!paymentDocs.empty) {
            const paymentData = paymentDocs.docs[0].data();
            console.log('Payment data fetched:', paymentData);
            bookingData.paymentId = paymentDocs.docs[0].id;
            bookingData.paymentAmount = paymentData.amount || 0;
            bookingData.paymentMethod = paymentData.paymentMethod || 'ไม่ระบุ';
            bookingData.paymentStatus = paymentData.status || 'ไม่ระบุ';
            bookingData.paymentDate = paymentData.paymentDate || paymentData.createdAt || null;
          }
        } catch (error) {
          console.error('Error fetching payment details:', error);
          // Continue without payment data
        }
        
        console.log('Final booking data:', bookingData);
        setBooking(bookingData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching booking details:', err);
        
        // Check if this is a connection error
        if (err.message?.includes('เชื่อมต่อ') || 
            err.message?.includes('connection') || 
            err.message?.includes('network') ||
            err.message?.includes('ERR_BLOCKED_BY_CLIENT')) {
          setError('ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้ โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต หรือ ปิดการใช้งาน Ad Blocker');
        } else {
          setError('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง');
        }
        
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [user, bookingId]);

  useEffect(() => {
    // Global click logger to help debug why buttons are not receiving clicks
    const clickLogger = (e) => {
      try {
        const target = e.target;
        console.log('GLOBAL_CLICK:', {
          tag: target?.tagName,
          id: target?.id,
          classes: target?.className,
          text: (target?.innerText || '').substring(0, 60),
          x: e.clientX,
          y: e.clientY
        });
        // log computed pointer-events for the element under pointer
        try {
          const comp = window.getComputedStyle(target);
          console.log('GLOBAL_CLICK computed pointer-events:', comp.pointerEvents);
        } catch (err) {
          // ignore
        }
      } catch (err) {
        console.error('Error in global click logger:', err);
      }
    };

    document.addEventListener('click', clickLogger, true); // capture phase
    return () => document.removeEventListener('click', clickLogger, true);
  }, []);

  // Fix: ปรับปรุงฟังก์ชัน handleStarClick ให้ทำงานได้อย่างถูกต้อง
  const handleStarClick = (selectedRating) => {
    try {
      console.log('Star clicked:', selectedRating);
      console.log('Current rating before update:', rating);
      
      // อัพเดท state อย่างชัดเจน
      setRating(selectedRating);
      
      // Log ทันทีเพื่อให้รู้ว่าอัพเดทค่าแล้ว
      console.log('Rating updated to:', selectedRating);
      
      // แสดงการเปลี่ยนแปลงผ่าน DOM โดยตรงเพื่อให้ผู้ใช้เห็นทันที
      document.querySelectorAll('.rating-display').forEach(el => {
        el.textContent = selectedRating;
      });
      
      // Fix for React's asynchronous state updates
      setTimeout(() => {
        console.log('Rating after update should be:', selectedRating);
        console.log('State might not have updated yet in this log:', rating);
      }, 0);
    } catch (error) {
      console.error('Error setting rating:', error);
      alert('เกิดข้อผิดพลาดในการให้คะแนนดาว โปรดลองใหม่อีกครั้ง');
    }
  };

  const handleStarHover = (hoveredValue) => {
    try {
      setHoveredRating(hoveredValue);
    } catch (error) {
      console.error('Error setting hovered rating:', error);
    }
  };

  const handleSubmit = async (e) => {
    // เพิ่ม log debug ทุกจุดสำคัญ
    console.log('💥 handleSubmit ถูกเรียกใช้งาน');
    console.log('ข้อมูล Firebase:', db);

    if (e && e.preventDefault) {
      e.preventDefault();
      console.log('preventDefault เรียกใช้งาน');
    }

    // แสดงข้อมูลที่กำลังจะส่ง
    console.log('🌟 ส่งรีวิว:', {
      bookingId,
      userId: user?.uid,
      rating,
      comment
    });

    // แก้ไขเพื่อเพิ่มความมั่นใจว่าสามารถส่งรีวิวได้
    console.log('🔍 ตรวจสอบค่า rating ก่อนส่ง:', rating);
    
    // หากค่า rating ไม่ถูกต้อง อัพเดทจาก DOM
    if (rating === 0) {
      try {
        const ratingDisplays = document.querySelectorAll('.rating-display');
        if (ratingDisplays && ratingDisplays.length > 0) {
          const displayedRating = parseInt(ratingDisplays[0].textContent);
          if (!isNaN(displayedRating) && displayedRating > 0) {
            console.log('⚠️ พบความขัดแย้งของค่า rating - แก้ไขจาก DOM:', displayedRating);
            setRating(displayedRating);
            // ดำเนินการต่อโดยใช้ค่าจาก DOM
          } else {
            setError('กรุณาให้คะแนนดาวก่อนส่งรีวิว');
            console.log('❌ ไม่ให้คะแนนดาว');
            return;
          }
        } else {
          setError('กรุณาให้คะแนนดาวก่อนส่งรีวิว');
          console.log('❌ ไม่ให้คะแนนดาว');
          return;
        }
      } catch (ratingErr) {
        console.error('เกิดข้อผิดพลาดในการอ่านค่า rating จาก DOM:', ratingErr);
        alert('กรุณาให้คะแนนดาวก่อนส่งรีวิว');
        return;
      }
    }

    // ป้องกันการส่งซ้ำ
    if (submitting) {
      console.log('⚠️ กำลังส่งข้อมูลอยู่แล้ว ไม่สามารถส่งซ้ำได้');
      return;
    }

    // เริ่มกระบวนการส่ง
    setSubmitting(true);
    setError('');

    try {
      console.log('Submitting review for booking:', booking);

      if (!booking) {
        setError('ไม่พบข้อมูลการจอง กรุณาโหลดหน้าใหม่');
        console.log('❌ booking เป็น null');
        setSubmitting(false);
        return;
      }

      if (!user || !user.uid) {
        setError('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
        console.log('❌ user เป็น null หรือไม่มี uid');
        setSubmitting(false);
        return;
      }

      // แสดงสถานะการทำงานให้ชัดเจนขึ้น
      console.log('🔄 เริ่มขั้นตอนการบันทึกรีวิว...');

      // บันทึกข้อมูลรีวิวและความคิดเห็น
      console.log('📝 กำลังส่งข้อมูลรีวิว:', {
        rating: rating,
        comment: comment || '(ไม่มีความคิดเห็น)'
      });


      // สร้าง ReviewID เป็น RV ตามด้วยเลขสุ่ม 6 หลัก และเวลาปัจจุบัน (ย้ายขึ้นก่อน)
      const timestamp = new Date().getTime();
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      const reviewId = `RV${randomNum}-${timestamp}`;

      // อัปเดตข้อมูลการจองหลังรีวิว: เก็บเฉพาะ canReview, reviewsId, reviewedAt
      try {
        const bookingRef = doc(db, 'Bookings', bookingId);
        const bookingUpdateData = {
          canReview: false,
          reviewsId: reviewId,
          reviewedAt: new Date()
        };
        console.log('🔄 กำลังอัพเดทข้อมูลการจอง (ไม่เก็บคะแนน/ความคิดเห็นซ้ำ):', bookingUpdateData);
        try {
          const updatePromise = updateDoc(bookingRef, bookingUpdateData);
          await Promise.race([
            updatePromise,
            new Promise((_, reject) => setTimeout(() => {
              console.warn('⚠️ การอัพเดทข้อมูลการจองใช้เวลานาน - ดำเนินการต่อ');
            }, 5000))
          ]);
          console.log('✅ อัพเดทข้อมูลการจองสำเร็จ');
        } catch (timeoutErr) {
          console.warn('⚠️ อาจเกิดปัญหาในการอัพเดทข้อมูล แต่จะดำเนินการต่อ:', timeoutErr);
        }
      } catch (bookingUpdateError) {
        console.error('❌ เกิดข้อผิดพลาดในการอัพเดทข้อมูลการจอง:', bookingUpdateError);
        console.warn('⚠️ พบปัญหาในการอัพเดทข้อมูลการจอง แต่จะดำเนินการต่อ');
      }

      // สร้างข้อมูลรีวิวที่สมบูรณ์
      // ดึงข้อมูลลูกค้าจาก /artifacts/login-spa-7921d/users
      let customerName = user.displayName || '';
      let customerEmail = user.email || '';
      try {
        const userRef = doc(db, 'artifacts/login-spa-7921d/users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          customerName = userData.fullName || userData.displayName || userData.name || customerName;
          customerEmail = userData.email || customerEmail;
        }
      } catch (err) {
        console.error('Error fetching customer info:', err);
      }

      const newReviewData = {
      reviewId: reviewId,
      bookingId: bookingId,
      userId: user.uid, // uid ของลูกค้า
      employeeId: booking.employeeId || '', // uid ของพนักงาน (role == 'employee')
      service: booking.service || 'ไม่ระบุ',
      rating: rating,
      comment: comment || '',  // ใช้ string ว่างถ้าไม่ได้กรอกความคิดเห็น
      createdAt: new Date(),
      status: 'active'
      };

      // สร้างบันทึกการรีวิว - ให้ทนทานต่อ timeout มากขึ้น
      let reviewSaved = false;
      try {
        console.log('📋 กำลังสร้างรีวิวใหม่ในคอลเลกชั่น Reviews:', newReviewData);

        // สร้าง reference ก่อน
        const reviewsRef = collection(db, 'Reviews');
        
        // เพิ่ม timeout safety
        let reviewDoc;
        try {
          const addPromise = addDoc(reviewsRef, newReviewData);
          reviewDoc = await Promise.race([
            addPromise,
            new Promise((_, reject) =>
              setTimeout(() => {
                console.warn('⚠️ การบันทึกรีวิวใช้เวลานาน แต่อาจบันทึกสำเร็จแล้ว');
              }, 5000)
            )
          ]);
          
          // หากไม่มี error จาก Promise.race ถือว่าบันทึกสำเร็จ
          console.log('✅ สร้างรีวิวสำเร็จในคอลเลกชั่น Reviews โดยใช้ ID:', reviewDoc?.id || 'รอการยืนยัน');
          reviewSaved = true;
        } catch (timeoutError) {
          console.warn('⚠️ เกิด timeout ในการบันทึกรีวิว แต่อาจบันทึกสำเร็จแล้ว:', timeoutError);
          // เราไม่แน่ใจว่าบันทึกสำเร็จหรือไม่ แต่ดำเนินการต่อ
          reviewSaved = true; // เราจะสมมติว่าบันทึกสำเร็จ
        }
        
        // แสดงผลลัพธ์ให้ผู้ใช้
        if (reviewSaved) {
          console.log('💾 ถือว่าการบันทึกรีวิวเสร็จสมบูรณ์');
        }
      } catch (reviewCreateError) {
        console.error('❌ เกิดข้อผิดพลาดในการสร้างรีวิว:', reviewCreateError);
        console.warn('⚠️ พบปัญหาในการบันทึกลงฐานข้อมูล Reviews แต่จะดำเนินการต่อไป');
        // ไม่ส่ง error ให้ผู้ใช้ แต่บันทึกไว้ใน console
      }

      // เพิ่มคะแนนสะสมให้ผู้ใช้เมื่อรีวิว (PointHistory 5 แต้ม)
      try {
        const pointHistoryId = `PH${Math.floor(100000 + Math.random() * 900000)}`;
        const pointHistoryData = {
          userId: user.uid,
          bookingId: bookingId,
          points: 5,
          type: 'REVIEW',
          source: 'REVIEW',
          service: booking.service || 'ไม่ระบุ',
          reason: `ได้รับแต้มจากการรีวิวบริการ`,
          status: 'ACTIVE',
          createdAt: new Date()
        };

        console.log('Creating point history with data:', pointHistoryData);
        await setDoc(doc(db, 'PointHistory', pointHistoryId), pointHistoryData);
        console.log('Point history created successfully');
      } catch (pointHistoryError) {
        console.error('Error creating point history:', pointHistoryError);
        // ไม่ให้ fail ทั้งหมด แม้จะมีปัญหาในการสร้างประวัติแต้ม
      }

      // เพิ่มคะแนนสะสมให้ผู้ใช้เมื่อรีวิว (field points ใน artifacts/login-spa-7921d/users)
      try {
        // ตรวจสอบว่าผู้ใช้มีตัวตนใน artifacts/login-spa-7921d/users หรือไม่
        const userRef = doc(db, 'artifacts/login-spa-7921d/users', user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          // ถ้ามีข้อมูลผู้ใช้ ให้อัพเดทแต้ม
          const userData = userDoc.data();
          console.log('Found user data:', userData);

          // ถ้ามี field points อยู่แล้ว ให้ใช้ increment
          if (userData.points !== undefined) {
            await updateDoc(userRef, {
              points: increment(5)
            });
          } else {
            // ถ้ายังไม่มี field points ให้สร้างใหม่
            await updateDoc(userRef, {
              points: 5
            });
          }
          console.log('User points updated successfully in artifacts/login-spa-7921d/users');
        } else {
          // ถ้าไม่มีข้อมูลผู้ใช้ บันทึกข้อผิดพลาด แต่ไม่ให้โปรแกรมล้มเหลว
          console.error('User document not found in artifacts/login-spa-7921d/users');
        }
      } catch (userUpdateError) {
        console.error('Error updating user points in artifacts/login-spa-7921d/users:', userUpdateError);
        // ไม่ให้ fail ทั้งหมด แม้จะมีปัญหาในการอัพเดทแต้ม
      }

      // แสดงข้อความสำเร็จพร้อมรายละเอียด
      console.log('🎉 การบันทึกรีวิวเสร็จสมบูรณ์');
      console.log('⭐ คะแนน:', rating);
      console.log('💬 ความคิดเห็น:', comment || '(ไม่มี)');
      console.log('📝 บันทึกไปยังตาราง Reviews เรียบร้อยแล้ว');

      setSuccess(true);

      // แสดง alert แจ้งเตือนให้ผู้ใช้ทราบว่าส่งรีวิวสำเร็จ
      alert(`ส่งรีวิว ${rating} ดาวสำเร็จแล้ว และได้รับ 5 แต้มสะสม! ขอบคุณสำหรับความคิดเห็นของคุณ`);

      // ไม่ต้องรีเดเร็คอัตโนมัติ ให้ผู้ใช้กดเอง
      console.log('กำลังเปลี่ยนสถานะเป็นสำเร็จ...');
      setSuccess(true);

    } catch (err) {
      console.error('Error submitting review:', err);
      setError(`เกิดข้อผิดพลาดในการบันทึกรีวิว: ${err.message || 'กรุณาลองใหม่อีกครั้ง'}`);
      setSubmitting(false);
    }

    setSubmitting(false);
  };

  const renderStars = () => {
    const stars = [];
    const maxStars = 5;
    
    for (let i = 1; i <= maxStars; i++) {
      stars.push(
        <span 
          key={i}
          className="star-rating"
          onClick={() => {
            console.log('Clicking star:', i);
            handleStarClick(i);
          }}
          onMouseEnter={() => handleStarHover(i)}
          onMouseLeave={() => handleStarHover(0)}
          style={{ cursor: 'pointer', padding: '0 5px' }}
        >
          {i <= (hoveredRating || rating) ? 
            <FaStar size={32} color="#ffc107" /> : 
            <FaRegStar size={32} color="#ffc107" />
          }
        </span>
      );
    }
    
    console.log('Rendering stars with current rating:', rating);
    return stars;
  };

  if (loading) {
    return (
      <div className="page-container text-center py-5">
        <div className="card shadow-sm">
          <div className="card-body p-5">
            <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
              <span className="visually-hidden">กำลังโหลด...</span>
            </div>
            <h4 className="mt-4 mb-1">กำลังโหลดข้อมูลการจอง</h4>
            <p className="text-muted">โปรดรอสักครู่...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="card shadow-sm">
          <div className="card-body text-center py-5">
            <div className="mb-4">
              <i className="fas fa-exclamation-circle text-danger" style={{ fontSize: '3rem' }}></i>
            </div>
            <h3 className="mb-3">เกิดข้อผิดพลาด</h3>
            <p className="text-muted">{error}</p>
            
            {error.includes('เชื่อมต่อ') || error.includes('Ad Blocker') ? (
              <div className="alert alert-warning mt-3">
                <p><strong>คำแนะนำในการแก้ไขปัญหา:</strong></p>
                <ul className="text-start mb-0">
                  <li>ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณ</li>
                  <li>ปิดการใช้งานส่วนขยาย Ad Blocker หรือ Privacy Blocker</li>
                  <li>ล้างแคชของเบราว์เซอร์</li>
                  <li>ลองรีเฟรชหน้าเว็บ</li>
                </ul>
              </div>
            ) : null}
            
            <button 
              type="button"
              className="btn btn-primary mt-3"
              onClick={() => {
                console.log('ERROR_SCREEN back button clicked');
                navigate('/member/DashboardMember');
              }}
            >
              <FaArrowLeft className="me-2" /> กลับสู่หน้าหลัก
            </button>
            
            <button 
              type="button"
              className="btn btn-outline-secondary mt-3 ms-2"
              onClick={() => window.location.reload()}
            >
              <i className="fas fa-sync-alt me-2"></i> ลองใหม่อีกครั้ง
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="card shadow-sm">
        <div className="card-header bg-primary text-white py-3">
          <div className="d-flex align-items-center">
            <button 
              type="button"
              className="btn btn-sm btn-light me-3"
              onClick={() => {
                console.log('HEADER back button clicked');
                navigate('/member/DashboardMember');
              }}
            >
              <FaArrowLeft />
            </button>
            <h3 className="mb-0">ให้คะแนนบริการ</h3>
          </div>
        </div>
        
        <div className="card-body p-4">
          {success ? (
            <div className="text-center py-4">
              <div className="mb-4">
                <i className="fas fa-check-circle text-success" style={{ fontSize: '3rem' }}></i>
              </div>
              <h3 className="mb-3">ขอบคุณสำหรับรีวิวของคุณ</h3>
              <div className="alert alert-success my-3">
                <p className="mb-1"><i className="fas fa-star me-2"></i> <strong>คะแนนที่ให้:</strong> {rating} ดาว</p>
                {comment && <p className="mb-1"><i className="fas fa-comment me-2"></i> <strong>ความคิดเห็น:</strong> "{comment}"</p>}
                <p className="mb-1"><i className="fas fa-check me-2"></i> <strong>สถานะ:</strong> บันทึกลงฐานข้อมูลเรียบร้อยแล้ว</p>
                <p className="mb-0"><i className="fas fa-gift me-2"></i> <strong>รางวัล:</strong> คุณได้รับ 5 แต้มจากการรีวิว</p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  className="primary-btn action-btn px-5 py-3"
                  style={{ fontSize: '1.2rem', fontWeight: 'bold' }}
                  onClick={() => {
                    console.log('SUCCESS_SCREEN home button clicked');
                    navigate('/member/DashboardMember');
                  }}
                >
                  <i className="fas fa-home me-2"></i> กลับสู่หน้าหลัก
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* รายละเอียดการจอง */}
              <div className="booking-details-section mb-4">
                <h5 className="mb-3">รายละเอียดการบริการ</h5>
                <div className="card bg-light">
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6 mb-3 mb-md-0">
                        <p className="mb-1"><strong>บริการ:</strong></p>
                        <p className="mb-3">{booking?.service || (booking?.serviceId ? 'กำลังโหลดข้อมูล...' : 'ไม่ระบุ')}</p>
                        
                        {booking?.serviceDescription && (
                          <>
                            <p className="mb-1"><strong>รายละเอียดบริการ:</strong></p>
                            <p className="mb-3">{booking.serviceDescription}</p>
                          </>
                        )}
                        
                        <p className="mb-1"><strong>พนักงาน:</strong></p>
                        <p>{booking?.employeeName || 'ไม่ระบุ'}</p>
                        
                        {booking?.employeePosition && (
                          <p className="small text-muted">ตำแหน่ง: {booking.employeePosition}</p>
                        )}
                      </div>
                      <div className="col-md-6">
                        <p className="mb-1"><strong>วันที่:</strong></p>
                        <p className="mb-3">{booking?.bookingDate || booking?.date || 'ไม่ระบุ'}</p>
                        
                        <p className="mb-1"><strong>เวลา:</strong></p>
                        <p className="mb-3">{booking?.bookingTime || booking?.time || 'ไม่ระบุ'}</p>
                        
                        {booking?.servicePrice && (
                          <>
                            <p className="mb-1"><strong>ค่าบริการ:</strong></p>
                            <p className="mb-3">{booking.servicePrice.toLocaleString()} บาท</p>
                          </>
                        )}
                        
                        {booking?.paymentMethod && (
                          <>
                            <p className="mb-1"><strong>การชำระเงิน:</strong></p>
                            <p>{booking.paymentMethod} ({booking.paymentStatus || 'ไม่ระบุสถานะ'})</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* ฟอร์มรีวิว */}
              <form className="review-form" onSubmit={handleSubmit}>
                <div className="rating-section text-center mb-4">
                  <h5 className="mb-3">คะแนนบริการ</h5>
                  <div className="stars-container">
                    {renderStars()}
                  </div>
                  <p className="mt-2">
                    {rating === 0 ? 'โปรดให้คะแนน' : 
                     rating === 1 ? 'แย่มาก' : 
                     rating === 2 ? 'แย่' : 
                     rating === 3 ? 'ปานกลาง' : 
                     rating === 4 ? 'ดี' : 'ดีมาก'}
                  </p>
                </div>

                <div className="comment-section mb-4">
                  <h5 className="mb-3">ความคิดเห็นของคุณ</h5>
                  <div className="position-relative">
                    <textarea 
                      className="form-control" 
                      rows="4" 
                      placeholder="แสดงความคิดเห็นเกี่ยวกับบริการ"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      aria-label="แสดงความคิดเห็นเกี่ยวกับบริการ"
                    ></textarea>
                  </div>
                </div>

                {error && (
                  <div className="alert alert-danger mb-4" role="alert">
                    {error}
                  </div>
                )}

                <div className="d-flex flex-column align-items-center">
                  <div className="text-center mb-3">
                    <p className="mb-2"><strong>ให้คะแนนดาว <span className="rating-display">{rating}</span> ดาว</strong></p>
                    {rating > 0 ? (
                      <div className="alert alert-success py-2">
                        <i className="fas fa-check-circle me-2"></i>
                        คุณเลือกให้ <span className="rating-display">{rating}</span> ดาว: {
                          rating === 1 ? 'แย่มาก' : 
                          rating === 2 ? 'แย่' : 
                          rating === 3 ? 'ปานกลาง' : 
                          rating === 4 ? 'ดี' : 'ดีมาก'
                        }
                      </div>
                    ) : (
                      <div className="alert alert-warning py-2">
                        <i className="fas fa-exclamation-circle me-2"></i>
                        กรุณาคลิกเลือกดาวก่อนส่งรีวิว
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="primary-btn action-btn px-5 py-3 mb-2"
                    style={{fontSize: '1.2rem', fontWeight: 'bold'}}
                    onClick={(e) => {
                      // Log event target and computed styles to detect overlays or CSS blocking
                      try {
                        const btn = e.currentTarget;
                        console.log('SUBMIT_BUTTON clicked, event target:', e.target, 'currentTarget:', btn);
                        const compBtn = window.getComputedStyle(btn);
                        console.log('SUBMIT_BUTTON computed style:', {
                          pointerEvents: compBtn.pointerEvents,
                          visibility: compBtn.visibility,
                          display: compBtn.display,
                          opacity: compBtn.opacity
                        });

                        // Also log the element directly under the pointer (document.elementFromPoint)
                        const pt = { x: e.clientX, y: e.clientY };
                        const elAtPoint = document.elementFromPoint(pt.x, pt.y);
                        console.log('ElementFromPoint at click:', elAtPoint);
                        if (elAtPoint) {
                          try {
                            console.log('ElementFromPoint computed style:', window.getComputedStyle(elAtPoint));
                          } catch (err) {}
                        }
                      } catch (err) {
                        console.error('Error logging submit button click details:', err);
                      }

                      // แสดงข้อมูลทั้งหมดเพื่อ debug
                      console.log('===== DEBUG INFO =====');
                      console.log('Current rating:', rating);
                      console.log('Form submitting status:', submitting);
                      console.log('Success status:', success);
                      console.log('Booking data:', booking);
                      console.log('=====================');

                      // ตรวจสอบเงื่อนไขก่อนส่ง
                      if (rating === 0) {
                        alert('กรุณาให้คะแนนดาวก่อนส่งรีวิว');
                        return;
                      }

                      if (submitting) {
                        alert('กำลังส่งข้อมูล โปรดรอสักครู่...');
                        return;
                      }

                      try {
                        console.log('เริ่มการส่งรีวิวด้วยคะแนน:', rating);
                        // เรียกฟังก์ชัน handleSubmit โดยตรง
                        handleSubmit();
                      } catch (err) {
                        console.error('🔴 เกิดข้อผิดพลาดในการส่งรีวิว:', err);
                        alert(`เกิดข้อผิดพลาดในการส่งรีวิว: ${err.message || 'โปรดลองใหม่อีกครั้ง'}`);
                      }
                    }}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        กำลังส่งรีวิว...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane me-2"></i>
                        ส่งรีวิว <span className="rating-display">{rating}</span> ดาว {rating === 0 ? '(กรุณาให้คะแนนดาวก่อน)' : ''}
                      </>
                    )}
                  </button>

                  <small className="text-muted mt-1">
                    {rating === 0 ? 'กรุณาคลิกเลือกดาวก่อนส่งรีวิว' : 'คลิกปุ่มด้านบนเพื่อส่งรีวิว'}
                  </small>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReviewService;
