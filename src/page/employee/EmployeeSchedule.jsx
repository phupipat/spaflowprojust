import React, { useState, useEffect } from 'react';
import { db } from '../../Firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../styles/SharedStyles.css';

function EmployeeSchedule() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState({
    totalWorkDays: 0,
    totalWorkHours: 0
  });

  const months = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const days = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

  // ฟังก์ชันแปลงชื่อวันภาษาไทยเป็นภาษาอังกฤษ
  const convertThaiDayToEnglish = (thaiDay) => {
    const dayMapping = {
      'จันทร์': 'Monday',
      'อังคาร': 'Tuesday', 
      'พุธ': 'Wednesday',
      'พฤหัสบดี': 'Thursday',
      'ศุกร์': 'Friday',
      'เสาร์': 'Saturday',
      'อาทิตย์': 'Sunday'
    };
    return dayMapping[thaiDay] || thaiDay;
  };

  // ฟังก์ชันแปลงตารางงานจาก Staffs collection เป็นรูปแบบของพนักงาน
  const convertStaffSchedulesToEmployeeFormat = (staffSchedules) => {
    const schedules = [];
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // วนลูปทุกวันในเดือน
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(currentYear, currentMonth, day);
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ...
      
      // แปลง dayOfWeek เป็นชื่อวันภาษาไทย
      const thaiDayName = days[dayOfWeek];
      
      // หาตารางงานสำหรับวันนี้
      const todaySchedules = staffSchedules.filter(schedule => 
        schedule.day === thaiDayName
      );

      if (todaySchedules.length > 0) {
        const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // แปลงช่วงเวลาเป็นกะงาน
        const shifts = todaySchedules.map(schedule => {
          const startTime = schedule.startTime;
          const endTime = schedule.endTime;
          
          // แปลงเวลาเป็นรูปแบบกะงาน
          let shiftName = '';
          const startHour = parseInt(startTime.split(':')[0]);
          
          if (startHour >= 6 && startHour < 12) {
            shiftName = `กะเช้า (${startTime}-${endTime})`;
          } else if (startHour >= 12 && startHour < 18) {
            shiftName = `กะบ่าย (${startTime}-${endTime})`;
          } else {
            shiftName = `กะเย็น (${startTime}-${endTime})`;
          }
          
          return shiftName;
        });

        // กำหนดหมายเหตุตามวัน
        let note = "ตารางงานที่กำหนดโดยเจ้าของร้าน";
        if (thaiDayName === 'เสาร์') {
          note = "วันเสาร์ - ระวังลูกค้าเยอะ";
        } else if (thaiDayName === 'อาทิตย์') {
          note = "วันอาทิตย์ - วันหยุดประจำสัปดาห์";
        }

        schedules.push({
          date: dateString,
          shifts: shifts,
          note: note,
          originalSchedules: todaySchedules // เก็บข้อมูลต้นฉบับไว้
        });
      }
    }

    return schedules;
  };

  useEffect(() => {
    const fetchSchedules = async () => {
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

        // Get schedules from Staffs collection based on userId
        const staffQuery = query(
          collection(db, 'Staffs'),
          where('userId', '==', user.uid)
        );

        const staffSnapshot = await getDocs(staffQuery);
        
        if (!staffSnapshot.empty) {
          const staffData = staffSnapshot.docs[0].data();
          const staffSchedules = staffData.schedules || [];
          
          // Convert staff schedules to employee schedule format
          const convertedSchedules = convertStaffSchedulesToEmployeeFormat(staffSchedules);
          setSchedules(convertedSchedules);
          
          // Calculate monthly statistics
          calculateMonthlyStats(convertedSchedules);
        } else {
          // ถ้าไม่พบข้อมูลในตาราง Staffs ให้ใช้ข้อมูลจำลอง
          const dummyData = generateDummySchedules();
          setSchedules(dummyData);
          calculateMonthlyStats(dummyData);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching schedules:", error);
        // ใช้ข้อมูลจำลองในกรณีที่มีข้อผิดพลาด
        const dummyData = generateDummySchedules();
        setSchedules(dummyData);
        calculateMonthlyStats(dummyData);
        setLoading(false);
      }
    };

    fetchSchedules();
  }, [user, currentMonth, currentYear]);

  // ฟังก์ชันคำนวณสถิติรายเดือน
  const calculateMonthlyStats = (schedules) => {
    const totalWorkDays = schedules.length;
    
    const totalWorkHours = schedules.reduce((total, schedule) => {
      if (schedule.originalSchedules) {
        return total + schedule.originalSchedules.reduce((dayTotal, shift) => {
          return dayTotal + parseFloat(calculateWorkHours(shift));
        }, 0);
      }
      return total;
    }, 0);
    
    setMonthlyStats({
      totalWorkDays,
      totalWorkHours: totalWorkHours.toFixed(1)
    });
  };

  // ฟังก์ชันคำนวณจำนวนชั่วโมงทำงาน
  const calculateWorkHours = (schedule) => {
    if (!schedule || !schedule.startTime || !schedule.endTime) return 0;
    
    const startTime = new Date(`1970-01-01T${schedule.startTime}:00`);
    const endTime = new Date(`1970-01-01T${schedule.endTime}:00`);
    
    const diffMs = endTime - startTime;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return diffHours.toFixed(1);
  };

  // ฟังก์ชันสร้างข้อมูลจำลองสำหรับตารางเวลางาน (สำรอง)
  const generateDummySchedules = () => {
    const today = new Date();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const schedules = [];

    const shifts = ['กะเช้า (9:00-14:00)', 'กะบ่าย (14:00-19:00)', 'กะเย็น (19:00-21:00)'];
    
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i);
      const dayOfWeek = date.getDay(); // 0 = อาทิตย์, 6 = เสาร์
      
      // สร้างเวลาทำงานแบบสุ่มสำหรับแต่ละวัน
      if (dayOfWeek !== 0) { // ไม่ทำงานวันอาทิตย์
        const randomShiftCount = Math.floor(Math.random() * 2) + 1; // 1 หรือ 2 กะต่อวัน
        const dayShifts = [];
        
        const availableShifts = [...shifts];
        for (let j = 0; j < randomShiftCount; j++) {
          const randomShiftIndex = Math.floor(Math.random() * availableShifts.length);
          dayShifts.push(availableShifts[randomShiftIndex]);
          availableShifts.splice(randomShiftIndex, 1);
        }
        
        schedules.push({
          date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
          shifts: dayShifts,
          note: dayOfWeek === 6 ? "วันเสาร์ - พักเบรค 30 นาที" : "พักเบรค 1 ชั่วโมง"
        });
      }
    }
    
    return schedules;
  };

  // ฟังก์ชันเปลี่ยนเดือน
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
    setSelectedDate(null);
  };

  // สร้างปฏิทิน
  const generateCalendar = () => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const calendar = [];
    
    // สร้างวันที่ว่างก่อนวันที่ 1
    let day = 0;
    let week = [];
    
    for (let i = 0; i < firstDay; i++) {
      week.push(<td key={`empty-${i}`} className="text-muted"></td>);
      day++;
    }
    
    // เพิ่มวันที่ในเดือน
    for (let i = 1; i <= daysInMonth; i++) {
      const date = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const hasSchedule = schedules.some(s => s.date === date);
      const isSelected = selectedDate === date;
      
      week.push(
        <td key={i} className={`calendar-day ${hasSchedule ? 'has-schedule' : ''} ${isSelected ? 'selected-day' : ''}`} 
            onClick={() => handleDateClick(date)}>
          <span className="date-number">{i}</span>
          {hasSchedule && <div className="schedule-indicator"></div>}
        </td>
      );
      
      day++;
      
      if (day % 7 === 0 || i === daysInMonth) {
        // เติมช่องว่างที่เหลือในสัปดาห์สุดท้าย
        while (day % 7 !== 0) {
          week.push(<td key={`empty-end-${day}`} className="text-muted"></td>);
          day++;
        }
        
        calendar.push(<tr key={`week-${calendar.length}`}>{week}</tr>);
        week = [];
      }
    }
    
    return calendar;
  };

  // จัดการเมื่อคลิกที่วันที่
  const handleDateClick = (date) => {
    setSelectedDate(date);
    const schedule = schedules.find(s => s.date === date);
    setSelectedSchedule(schedule);
  };

  return (
    <div className="container-fluid animate-fade-in py-4">
      {/* Add FontAwesome CDN */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" 
        integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" 
        crossOrigin="anonymous" referrerPolicy="no-referrer" />
      
      <style>
        {`
          .calendar-container {
            background: white;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            overflow: hidden;
          }
          
          .calendar-header {
            background: linear-gradient(to right, #ff9900, #ff7730);
            color: white;
            padding: 20px;
            text-align: center;
            position: relative;
          }
          
          .month-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            font-size: 1.5rem;
            cursor: pointer;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s;
          }
          
          .month-nav:hover {
            background: rgba(255, 255, 255, 0.2);
          }
          
          .month-prev {
            left: 20px;
          }
          
          .month-next {
            right: 20px;
          }
          
          .calendar-table {
            width: 100%;
            border-collapse: collapse;
          }
          
          .calendar-table th {
            padding: 12px;
            text-align: center;
            font-weight: 600;
            color: #555;
            border-bottom: 1px solid #eee;
          }
          
          .calendar-table td {
            padding: 8px;
            text-align: center;
            height: 60px;
            vertical-align: top;
            position: relative;
            border: 1px solid #f0f0f0;
            cursor: pointer;
            transition: all 0.2s;
          }
          
          .calendar-table td:hover {
            background: #f9f9f9;
          }
          
          .calendar-day {
            position: relative;
          }
          
          .date-number {
            position: absolute;
            top: 5px;
            left: 5px;
            font-size: 0.9rem;
          }
          
          .schedule-indicator {
            width: 8px;
            height: 8px;
            background-color: #ff9900;
            border-radius: 50%;
            position: absolute;
            bottom: 5px;
            left: 50%;
            transform: translateX(-50%);
          }
          
          .has-schedule {
            font-weight: bold;
          }
          
          .selected-day {
            background-color: rgba(255, 153, 0, 0.1) !important;
            border: 2px solid #ff9900 !important;
          }
          
          .schedule-details {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            margin-top: 20px;
          }
          
          .shift-card {
            border-left: 4px solid #ff9900;
            padding: 15px;
            margin-bottom: 15px;
            background: #fff;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
          }

          .day-header {
            text-align: center;
          }

          .schedule-content {
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          .shift-badge {
            margin-bottom: 8px;
          }

          .shift-badge:last-child {
            margin-bottom: 0;
          }

          .no-schedule {
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }

          .weekly-table {
            table-layout: fixed;
          }

          .weekly-table th,
          .weekly-table td {
            width: 14.28%;
            min-height: 120px;
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
                    <i className="fas fa-calendar-alt me-2" style={{ color: '#ff9900' }}></i>
                    ตารางเวลางานรายเดือน
                  </h2>
                  <p className="text-muted mb-0">
                    <i className="fas fa-user me-1"></i>
                    พนักงาน: {userName}
                  </p>
                </div>
                <div className="text-end">
                  <div className="text-muted small">ตารางงานที่เจ้าของร้านกำหนด</div>
                  <div className="fw-bold text-primary">
                    {months[currentMonth]} {currentYear}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Statistics */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <div className="d-flex align-items-center justify-content-center mb-2">
                <div className="bg-primary bg-opacity-10 rounded-circle p-3 me-3">
                  <i className="fas fa-calendar-check fa-lg text-primary"></i>
                </div>
                <div>
                  <h3 className="mb-0 text-primary">{monthlyStats.totalWorkDays}</h3>
                  <small className="text-muted">วันทำงานในเดือนนี้</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <div className="d-flex align-items-center justify-content-center mb-2">
                <div className="bg-success bg-opacity-10 rounded-circle p-3 me-3">
                  <i className="fas fa-clock fa-lg text-success"></i>
                </div>
                <div>
                  <h3 className="mb-0 text-success">{monthlyStats.totalWorkHours}</h3>
                  <small className="text-muted">ชั่วโมงทำงานในเดือนนี้</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="row">
        <div className="col-lg-4">
          {selectedSchedule ? (
            <div className="schedule-details">
              <h4 className="mb-3">
                <i className="fas fa-info-circle me-2" style={{ color: '#ff9900' }}></i>
                รายละเอียดตารางงาน
              </h4>
              <div className="mb-3 pb-3 border-bottom">
                <p className="mb-1 fw-bold">วันที่:</p>
                <p className="text-primary">
                  <i className="fas fa-calendar-day me-2"></i>
                  {new Date(selectedSchedule.date).toLocaleDateString('th-TH', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              
              <div className="mb-3 pb-3 border-bottom">
                <p className="mb-2 fw-bold">กะการทำงาน:</p>
                {selectedSchedule.shifts.length > 0 ? (
                  selectedSchedule.shifts.map((shift, index) => (
                    <div key={index} className="shift-card">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-1">{shift}</h6>
                          <p className="text-muted mb-0">
                            <small>
                              <i className="fas fa-clock me-1"></i> 
                              ระยะเวลา: {selectedSchedule.originalSchedules ? 
                                calculateWorkHours(selectedSchedule.originalSchedules[index]) : 
                                'ไม่ระบุ'} ชั่วโมง
                            </small>
                          </p>
                        </div>
                        <div className="text-center">
                          <span className="badge bg-info">
                            <i className="fas fa-eye me-1"></i>
                            ดูเท่านั้น
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted">ไม่มีกะการทำงาน</p>
                )}
              </div>
              
              <div className="mb-3">
                <p className="mb-2 fw-bold">หมายเหตุ:</p>
                <p className="text-muted">
                  <i className="fas fa-info-circle me-2"></i>
                  {selectedSchedule.note || 'ไม่มีหมายเหตุ'}
                </p>
              </div>

              {/* Additional schedule info */}
              {selectedSchedule.originalSchedules && (
                <div className="mb-3 pb-3 border-bottom">
                  <p className="mb-2 fw-bold">สรุปการทำงาน:</p>
                  <div className="row text-center">
                    <div className="col-6">
                      <div className="border rounded p-2 bg-light">
                        <div className="fw-bold text-primary">
                          {selectedSchedule.originalSchedules.reduce((total, schedule) => 
                            total + parseFloat(calculateWorkHours(schedule)), 0).toFixed(1)}
                        </div>
                        <small className="text-muted">ชั่วโมงรวม</small>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-2 bg-light">
                        <div className="fw-bold text-success">{selectedSchedule.shifts.length}</div>
                        <small className="text-muted">จำนวนกะ</small>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-5 bg-light rounded">
              <i className="fas fa-calendar-plus mb-3" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
              <h5>เลือกวันที่เพื่อดูรายละเอียด</h5>
              <p className="text-muted">เลือกวันที่จากปฏิทินเพื่อดูรายละเอียดตารางงานของคุณ</p>
            </div>
          )}
        </div>

        <div className="col-lg-8">
          <div className="calendar-container mb-4">
            <div className="calendar-header">
              <div className="month-nav month-prev" onClick={() => changeMonth(-1)}>
                <i className="fas fa-chevron-left"></i>
              </div>
              <h3 className="mb-0">
                ปฏิทินตารางงาน - {months[currentMonth]} {currentYear}
              </h3>
              <div className="month-nav month-next" onClick={() => changeMonth(1)}>
                <i className="fas fa-chevron-right"></i>
              </div>
            </div>
            
            {loading ? (
              <div className="text-center p-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">กำลังโหลด...</span>
                </div>
                <p className="mt-3 text-muted">กำลังโหลดข้อมูลตารางงาน...</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="calendar-table">
                  <thead>
                    <tr>
                      {days.map(day => (
                        <th key={day}>{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {generateCalendar()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Information Card */}
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="card-title">
                <i className="fas fa-info-circle me-2 text-info"></i>
                ข้อมูลตารางงาน
              </h6>
              <div className="row">
                <div className="col-md-6">
                  <ul className="list-unstyled mb-0">
                    <li className="mb-2">
                      <i className="fas fa-circle me-2" style={{ color: '#ff9900', fontSize: '0.8rem' }}></i>
                      <small>จุดส้ม = มีตารางงาน</small>
                    </li>
                    <li className="mb-2">
                      <i className="fas fa-calendar-check me-2 text-primary"></i>
                      <small>คลิกวันที่เพื่อดูรายละเอียด</small>
                    </li>
                  </ul>
                </div>
                <div className="col-md-6">
                  <ul className="list-unstyled mb-0">
                    <li className="mb-2">
                      <i className="fas fa-user-tie me-2 text-success"></i>
                      <small>ตารางกำหนดโดยเจ้าของร้าน</small>
                    </li>
                    <li className="mb-2">
                      <i className="fas fa-eye me-2 text-info"></i>
                      <small>สามารถดูข้อมูลเท่านั้น</small>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployeeSchedule;
