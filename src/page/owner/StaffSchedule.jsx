import React, { useState, useEffect } from 'react';
import { db } from '../../Firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import '../../styles/SharedStyles.css';
import '../../styles/ScheduleStyles.css';

function StaffSchedule() {
  const [staffs, setStaffs] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [employees, setEmployees] = useState([]);
  const [editShift, setEditShift] = useState({
    id: null,
    name: '',
    position: '',
    schedules: []
  });
  const [newShift, setNewShift] = useState({
    startTime: '10:00',
    endTime: '23:59',
    workDays: [] // เก็บวันที่เลือกทำงาน
  });
  const [newStaff, setNewStaff] = useState({
    userId: '',
    name: '',
    position: 'พนักงานแผนกนวด',
    schedules: []
  });
  const [filter, setFilter] = useState('all');
  const [showWeekView, setShowWeekView] = useState(false); // เปลี่ยนเป็น false เพื่อให้แสดงรายเดือนเป็นค่าเริ่มต้น
  const [showMonthView, setShowMonthView] = useState(true); // เพิ่มมุมมองรายเดือน
  const [selectedDayDetails, setSelectedDayDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('all'); // กรองตามพนักงาน
  
  const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
  const daysShort = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
  const timeSlots = Array.from({ length: 13 }, (_, i) => (i + 8).toString().padStart(2, '0') + ':00');
  const positions = ['พนักงานแผนกนวด', 'พนักงานแผนกสปา', 'พนักงานแผนกออนเซ็น', 'ต้อนรับ', 'ผู้จัดการ', 'แม่บ้าน'];

  // สีสำหรับแต่ละพนักงาน
  const staffColors = [
    '#ff9900', '#28a745', '#17a2b8', '#dc3545', '#0d6efd', 
    '#6c757d', '#fd7e14', '#20c997', '#6f42c1', '#e83e8c',
    '#ffc107', '#198754', '#0dcaf0', '#f8d7da', '#d1ecf1'
  ];
  
  useEffect(() => {
    fetchStaffs();
    fetchEmployees();
  }, []);
  
  const fetchEmployees = async () => {
    try {
      const snap = await getDocs(collection(db, 'artifacts/login-spa-7921d/users'));
      const employeesData = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.role === 'employee' && user.status === 'approved');
      
      // กรองพนักงานที่ยังไม่ได้เพิ่มในตาราง
      const availableEmployees = employeesData.filter(employee => 
        !staffs.some(staff => staff.userId === employee.id)
      );
      
      setEmployees(availableEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };
  
  const fetchStaffs = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, 'Staffs'));
      const staffsData = snap.docs.map(doc => {
        const data = doc.data();
        // Ensure schedules is always an array
        return {
          id: doc.id,
          userId: data.userId || null,
          name: data.name || '',
          email: data.email || '',
          position: data.position || 'พนักงานแผนกนวด',
          schedules: Array.isArray(data.schedules) ? data.schedules : []
        };
      });
      setStaffs(staffsData);
    } catch (error) {
      console.error('Error fetching staff data:', error);
    } finally {
      setLoading(false);
    }
  };

  // เรียกใหม่หลังจากโหลด staffs เพื่อกรองพนักงานที่ยังไม่ได้เพิ่ม
  useEffect(() => {
    if (staffs.length > 0) {
      fetchEmployees();
    }
  }, [staffs]);
  
  const handleAddStaff = async (e) => {
    e.preventDefault();
    
    if (!newStaff.userId) {
      alert('กรุณาเลือกพนักงาน');
      return;
    }

    try {
      const selectedEmployee = employees.find(emp => emp.id === newStaff.userId);
      
      const staffData = {
        userId: newStaff.userId,
        fullname: selectedEmployee.fullname || selectedEmployee.name,
        email: selectedEmployee.email,
        position: newStaff.position,
        schedules: [] // Start with no schedules
      };
      
      const docRef = await addDoc(collection(db, 'Staffs'), staffData);
      
      setStaffs([...staffs, { id: docRef.id, ...staffData }]);
      setShowAddModal(false);
      setNewStaff({
        userId: '',
        name: '',
        position: 'พนักงานแผนกนวด',
        schedules: []
      });
      
      // รีเฟรชรายชื่อพนักงานที่สามารถเลือกได้
      fetchEmployees();
    } catch (error) {
      console.error('Error adding staff:', error);
      alert('เกิดข้อผิดพลาดในการเพิ่มพนักงาน');
    }
  };
  
  const handleDeleteStaff = async (id) => {
    if (!window.confirm('คุณต้องการลบข้อมูลพนักงานนี้หรือไม่?')) return;
    
    try {
      await deleteDoc(doc(db, 'Staffs', id));
      setStaffs(staffs.filter(s => s.id !== id));
      // รีเฟรชรายชื่อพนักงานที่สามารถเลือกได้
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('เกิดข้อผิดพลาดในการลบข้อมูลพนักงาน');
    }
  };
  
  const handleEditStaff = (staff) => {
    setEditShift({
      id: staff.id,
      name: staff.name,
      position: staff.position,
      schedules: [...(staff.schedules || [])]
    });
    setShowEditModal(true);
  };
  
  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'Staffs', editShift.id), {
        name: editShift.name,
        position: editShift.position,
        schedules: editShift.schedules
      });
      
      setStaffs(staffs.map(s => s.id === editShift.id ? {
        ...s,
        name: editShift.name,
        position: editShift.position,
        schedules: editShift.schedules
      } : s));
      
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating staff:', error);
      alert('เกิดข้อผิดพลาดในการอัปเดตข้อมูลพนักงาน');
    }
  };
  
  const addShiftToStaff = () => {
    if (newShift.workDays.length === 0) {
      alert('กรุณาเลือกวันที่ต้องการทำงาน');
      return;
    }

    // เพิ่มตารางงานสำหรับทุกวันที่เลือก
    const newSchedules = newShift.workDays.map(day => ({
      day: day,
      startTime: newShift.startTime,
      endTime: newShift.endTime
    }));

    const updatedSchedules = [...editShift.schedules, ...newSchedules];
    setEditShift({
      ...editShift,
      schedules: updatedSchedules
    });
    
    setNewShift({
      startTime: '10:00',
      endTime: '23:59',
      workDays: []
    });
  };
  
  const removeShiftFromStaff = (index) => {
    const updatedSchedules = editShift.schedules.filter((_, i) => i !== index);
    setEditShift({
      ...editShift,
      schedules: updatedSchedules
    });
  };
  
  // Helper to get staff schedule details for a specific time slot and day
  const getStaffScheduleAt = (staff, day, time) => {
    if (!staff.schedules || !Array.isArray(staff.schedules)) return null;
    
    const schedule = staff.schedules.find(schedule => {
      if (schedule.day !== day) return false;
      
      const startTime = schedule.startTime;
      const endTime = schedule.endTime;
      
      const convertTimeToMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      const currentMinutes = convertTimeToMinutes(time);
      const startMinutes = convertTimeToMinutes(startTime);
      const endMinutes = convertTimeToMinutes(endTime);
      
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    });
    
    return schedule ? {
      ...staff,
      workTime: `${schedule.startTime}-${schedule.endTime}`
    } : null;
  };

  // Helper to get all staff working on a specific day
  const getStaffForDay = (day) => {
    return filteredStaffs.filter(staff => {
      if (!staff.schedules || !Array.isArray(staff.schedules)) return false;
      return staff.schedules.some(schedule => schedule.day === day);
    }).map(staff => {
      const daySchedules = staff.schedules.filter(schedule => schedule.day === day);
      return {
        ...staff,
        daySchedules: daySchedules
      };
    });
  };

  // Show day details modal
  const showDayDetails = (day, date) => {
    const staffForDay = getStaffForDay(day);
    setSelectedDayDetails({
      day,
      date,
      staffList: staffForDay
    });
    setShowDetailsModal(true);
  };
  
  // Filter staff based on selected position
  const filteredStaffs = filter === 'all' 
    ? staffs 
    : staffs.filter(staff => staff.position === filter);


  const getFormattedDate = (date) => {
    return `${date.getDate()} ${['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][date.getMonth()]} ${date.getFullYear() + 543}`;
  };

  // Navigation for month view
  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Generate dates for current month
  const getMonthDates = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the first Monday of the calendar view
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(firstDay.getDate() - daysToSubtract);
    
    const dates = [];
    const currentDateIter = new Date(startDate);
    
    // Generate 6 weeks (42 days) to cover the full month view
    for (let i = 0; i < 42; i++) {
      dates.push(new Date(currentDateIter));
      currentDateIter.setDate(currentDateIter.getDate() + 1);
    }
    
    return dates;
  };

  // Get staff color by index
  const getStaffColor = (staffIndex) => {
    return staffColors[staffIndex % staffColors.length];
  };

  // Navigation for week view
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  // Generate dates for current week
  const getWeekDates = () => {
    const dates = [];
    const startOfWeek = new Date(currentDate);
    // Adjust to Monday
    const dayOfWeek = currentDate.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days, otherwise go back to Monday
    startOfWeek.setDate(currentDate.getDate() - diff);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();
  const monthDates = getMonthDates();
  
  // Helper to get day name in Thai from date
  const getDayName = (date) => {
    const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1; // Convert Sunday=0 to Sunday=6
    return daysShort[dayIndex];
  };

  // Helper to check if date is in current month
  const isCurrentMonth = (date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  // Helper to get staff working on specific date
  const getStaffForDate = (date) => {
    const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1];
    
    let staffForDate = filteredStaffs.filter(staff => {
      if (!staff.schedules || !Array.isArray(staff.schedules)) return false;
      return staff.schedules.some(schedule => schedule.day === dayName);
    }).map(staff => {
      const daySchedules = staff.schedules.filter(schedule => schedule.day === dayName);
      return {
        ...staff,
        daySchedules: daySchedules
      };
    });

    // Apply staff filter if selected
    if (selectedStaffFilter !== 'all') {
      staffForDate = staffForDate.filter(staff => staff.id === selectedStaffFilter);
    }

    return staffForDate;
  };
  
  return (
    <div className="container-fluid animate-fade-in px-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">
          <i className="fas fa-user-clock me-2" style={{ color: '#ff9900' }}></i>
          ตารางเวลาพนักงาน
        </h4>
        <div>
          <button 
            className="btn btn-gradient btn-sm" 
            onClick={() => {
              fetchEmployees();
              setShowAddModal(true);
            }}
          >
            <i className="fas fa-plus me-1"></i> เพิ่มพนักงาน
          </button>
        </div>
      </div>

      {/* Controls for month/week view */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-3">
              <div className="input-group">
                <span className="input-group-text bg-light">
                  <i className="fas fa-filter text-muted"></i>
                </span>
                <select 
                  className="form-select" 
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">ตำแหน่ง: ทั้งหมด</option>
                  {positions.map((pos, idx) => (
                    <option key={idx} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-md-3">
              <div className="input-group">
                <span className="input-group-text bg-light">
                  <i className="fas fa-user text-muted"></i>
                </span>
                <select 
                  className="form-select" 
                  value={selectedStaffFilter}
                  onChange={(e) => setSelectedStaffFilter(e.target.value)}
                >
                  <option value="all">พนักงาน: ทั้งหมด</option>
                  {filteredStaffs.map((staff, idx) => (
                    <option key={staff.id} value={staff.id}>{staff.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-md-3 text-center">
              <div className="btn-group">
                <button 
                  className="btn btn-outline-secondary" 
                  onClick={showMonthView ? goToPreviousMonth : goToPreviousWeek}
                  title={showMonthView ? "เดือนก่อนหน้า" : "สัปดาห์ก่อนหน้า"}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <button 
                  className="btn btn-outline-primary" 
                  onClick={goToToday}
                >
                  วันนี้
                </button>
                <button 
                  className="btn btn-outline-secondary" 
                  onClick={showMonthView ? goToNextMonth : goToNextWeek}
                  title={showMonthView ? "เดือนถัดไป" : "สัปดาห์ถัดไป"}
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
            <div className="col-md-3 text-end">
              <div className="btn-group">
                <button 
                  className={`btn btn-sm ${showMonthView ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => {
                    setShowMonthView(true);
                    setShowWeekView(false);
                  }}
                >
                  <i className="fas fa-calendar me-1"></i> รายเดือน
                </button>
                <button 
                  className={`btn btn-sm ${showWeekView ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => {
                    setShowWeekView(true);
                    setShowMonthView(false);
                  }}
                >
                  <i className="fas fa-calendar-week me-1"></i> รายสัปดาห์
                </button>
                <button 
                  className={`btn btn-sm ${!showWeekView && !showMonthView ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => {
                    setShowWeekView(false);
                    setShowMonthView(false);
                  }}
                >
                  <i className="fas fa-list me-1"></i> รายชื่อ
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">กำลังโหลด...</span>
          </div>
          <p className="mt-3 text-muted">กำลังโหลดข้อมูลพนักงาน...</p>
        </div>
      ) : showMonthView ? (
        // Month Schedule View
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-light">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="fas fa-calendar me-2 text-primary"></i>
                {currentDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })}
              </h5>
              {selectedStaffFilter !== 'all' && (
                <div className="d-flex align-items-center">
                  <span className="badge me-2" style={{ 
                    backgroundColor: getStaffColor(filteredStaffs.findIndex(s => s.id === selectedStaffFilter)),
                    color: 'white'
                  }}>
                    {filteredStaffs.find(s => s.id === selectedStaffFilter)?.name}
                  </span>
                  <small className="text-muted">โหมดแสดงเฉพาะบุคคล</small>
                </div>
              )}
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-bordered month-calendar mb-0">
                <thead className="table-light">
                  <tr>
                    {daysShort.map((day, index) => (
                      <th key={index} className="text-center" style={{ width: '14.28%' }}>
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 6 }, (_, weekIndex) => (
                    <tr key={weekIndex}>
                      {Array.from({ length: 7 }, (_, dayIndex) => {
                        const dateIndex = weekIndex * 7 + dayIndex;
                        const date = monthDates[dateIndex];
                        const staffForDate = getStaffForDate(date);
                        const isToday = date.toDateString() === new Date().toDateString();
                        const isCurrentMonthDate = isCurrentMonth(date);
                        
                        return (
                          <td 
                            key={dayIndex} 
                            className={`calendar-cell position-relative ${!isCurrentMonthDate ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                            style={{ 
                              height: '120px', 
                              verticalAlign: 'top',
                              cursor: staffForDate.length > 0 ? 'pointer' : 'default',
                              opacity: isCurrentMonthDate ? 1 : 0.3
                            }}
                            onClick={() => staffForDate.length > 0 && showDayDetails(getDayName(date), date)}
                          >
                            <div className="h-100 d-flex flex-column p-1">
                              <div className={`date-number mb-1 ${isToday ? 'today-date' : ''}`}>
                                {date.getDate()}
                              </div>
                              
                              <div className="flex-grow-1 overflow-hidden">
                                {staffForDate.length === 0 ? (
                                  isCurrentMonthDate && (
                                    <div className="text-center text-muted mt-2">
                                      <small>ไม่มีงาน</small>
                                    </div>
                                  )
                                ) : (
                                  <div className="staff-entries">
                                    {staffForDate.slice(0, 3).map((staff, staffIndex) => {
                                      const staffColor = selectedStaffFilter !== 'all' 
                                        ? getStaffColor(filteredStaffs.findIndex(s => s.id === selectedStaffFilter))
                                        : getStaffColor(filteredStaffs.findIndex(s => s.id === staff.id));
                                      
                                      return (
                                        <div 
                                          key={staffIndex}
                                          className="staff-entry-month rounded-1 mb-1 p-1"
                                          style={{ 
                                            backgroundColor: `${staffColor}20`,
                                            borderLeft: `3px solid ${staffColor}`,
                                            fontSize: '0.7rem'
                                          }}
                                        >
                                          <div className="fw-bold text-truncate" style={{ color: staffColor }}>
                                            {staff.name}
                                          </div>
                                          <div className="text-muted" style={{ fontSize: '0.6rem' }}>
                                            {staff.daySchedules.length} ช่วง
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {staffForDate.length > 3 && (
                                      <div className="text-muted text-center" style={{ fontSize: '0.65rem' }}>
                                        +{staffForDate.length - 3} คน
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : showWeekView ? (
        // Week Schedule View - Daily Summary
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-bordered schedule-table mb-0">
                <thead className="table-light">
                  <tr>
                    {weekDates.map((date, index) => (
                      <th 
                        key={index} 
                        className={`text-center ${date.toDateString() === new Date().toDateString() ? 'current-day' : ''}`} 
                        style={{ minWidth: '200px' }}
                      >
                        <div className="calendar-day">
                          <div className={`day-name ${date.toDateString() === new Date().toDateString() ? 'today-highlight' : ''}`}>
                            {days[index]}
                          </div>
                          <div className="day-date">
                            {getFormattedDate(date)}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {days.map((day, dayIndex) => {
                      const staffForDay = getStaffForDay(day);
                      const date = weekDates[dayIndex];
                      
                      return (
                        <td 
                          key={dayIndex} 
                          className="position-relative p-3" 
                          style={{ height: '300px', verticalAlign: 'top', cursor: 'pointer' }}
                          onClick={() => showDayDetails(day, date)}
                        >
                          <div className="h-100 d-flex flex-column">
                            <div className="mb-2 text-center">
                              <small className="text-muted fw-bold">
                                {staffForDay.length} คน
                              </small>
                            </div>
                            
                            <div className="flex-grow-1 overflow-auto">
                              {staffForDay.length === 0 ? (
                                <div className="text-center text-muted py-4">
                                  <i className="fas fa-calendar-times fa-2x mb-2"></i>
                                  <div>ไม่มีงาน</div>
                                </div>
                              ) : (
                                <div className="d-flex flex-column gap-2">
                                  {staffForDay.map((staff, staffIndex) => {
                                    // Determine color based on position
                                    let backgroundColor, borderColor, textColor;
                                    switch(staff.position) {
                                      case 'พนักงานแผนกนวด':
                                        backgroundColor = 'rgba(255, 153, 0, 0.15)';
                                        borderColor = '#ff9900';
                                        textColor = '#cc7700';
                                        break;
                                      case 'พนักงานแผนกออนเซ็น':
                                        backgroundColor = 'rgba(40, 167, 69, 0.15)';
                                        borderColor = '#28a745';
                                        textColor = '#1e5e2e';
                                        break;
                                      case 'พนักงานแผนกสปา':
                                        backgroundColor = 'rgba(23, 162, 184, 0.15)';
                                        borderColor = '#17a2b8';
                                        textColor = '#0d5461';
                                        break;
                                      case 'ต้อนรับ':
                                        backgroundColor = 'rgba(220, 53, 69, 0.15)';
                                        borderColor = '#dc3545';
                                        textColor = '#a02a37';
                                        break;
                                      case 'ผู้จัดการ':
                                        backgroundColor = 'rgba(13, 110, 253, 0.15)';
                                        borderColor = '#0d6efd';
                                        textColor = '#084298';
                                        break;
                                      case 'แม่บ้าน':
                                        backgroundColor = 'rgba(108, 117, 125, 0.15)';
                                        borderColor = '#6c757d';
                                        textColor = '#495057';
                                        break;
                                      default:
                                        backgroundColor = 'rgba(108, 117, 125, 0.15)';
                                        borderColor = '#6c757d';
                                        textColor = '#495057';
                                    }
                                    
                                    return (
                                      <div 
                                        key={staffIndex}
                                        className="staff-day-entry rounded-2 p-2"
                                        style={{ 
                                          backgroundColor,
                                          borderLeft: `4px solid ${borderColor}`,
                                          minHeight: '50px'
                                        }}
                                      >
                                        <div className="fw-bold text-truncate mb-1" style={{ color: textColor, fontSize: '0.85rem' }}>
                                          {staff.name}
                                        </div>
                                        <div className="small text-muted mb-1">
                                          {staff.position}
                                        </div>
                                        <div className="small">
                                          <i className="fas fa-clock me-1" style={{ color: borderColor }}></i>
                                          {staff.daySchedules.length} ช่วงเวลา
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            
                            <div className="text-center mt-2">
                              <small className="text-primary">
                                <i className="fas fa-info-circle me-1"></i>
                                คลิกเพื่อดูรายละเอียด
                              </small>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        // List View
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            {filteredStaffs.length === 0 ? (
              <div className="text-center py-5">
                <i className="fas fa-users-slash fa-3x text-muted mb-3"></i>
                <h5>ไม่พบข้อมูลพนักงาน</h5>
                <p className="text-muted">เพิ่มข้อมูลพนักงานเพื่อจัดการตารางเวลาทำงาน</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>ชื่อพนักงาน</th>
                      <th>ตำแหน่ง</th>
                      <th>ตารางงาน</th>
                      <th>การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaffs.map((staff) => (
                      <tr key={staff.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="icon-circle me-2" style={{ 
                              backgroundColor: 'rgba(255, 153, 0, 0.1)',
                              width: '40px',
                              height: '40px'
                            }}>
                              <i className="fas fa-user" style={{ color: '#ff9900' }}></i>
                            </div>
                            <div>
                              <div className="fw-bold">{staff.name}</div>
                              <small className="text-muted">
                                {staff.email && `${staff.email} | `}
                                ID: {staff.id.slice(0, 8)}...
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="position-badge" style={{
                            backgroundColor: staff.position === 'พนักงานแผนกนวด' ? 'rgba(255, 153, 0, 0.15)' :
                                            staff.position === 'นวดอโรม่า' ? 'rgba(40, 167, 69, 0.15)' :
                                            staff.position === 'สปา' ? 'rgba(23, 162, 184, 0.15)' :
                                            staff.position === 'ต้อนรับ' ? 'rgba(220, 53, 69, 0.15)' :
                                            staff.position === 'ผู้จัดการ' ? 'rgba(13, 110, 253, 0.15)' : 'rgba(108, 117, 125, 0.15)',
                            color: staff.position === 'พนักงานแผนกนวด' ? '#ff9900' :
                                  staff.position === 'นวดอโรม่า' ? '#28a745' :
                                  staff.position === 'สปา' ? '#17a2b8' :
                                  staff.position === 'ต้อนรับ' ? '#dc3545' :
                                  staff.position === 'ผู้จัดการ' ? '#0d6efd' : '#6c757d',
                            borderLeft: staff.position === 'พนักงานแผนกนวด' ? '3px solid #ff9900' :
                                       staff.position === 'นวดอโรม่า' ? '3px solid #28a745' :
                                       staff.position === 'สปา' ? '3px solid #17a2b8' :
                                       staff.position === 'ต้อนรับ' ? '3px solid #dc3545' :
                                       staff.position === 'ผู้จัดการ' ? '3px solid #0d6efd' : '3px solid #6c757d'
                          }}>
                            {staff.position === 'พนักงานแผนกนวด' && <i className="fas fa-spa me-1"></i>}
                            {staff.position === 'นวดอโรม่า' && <i className="fas fa-leaf me-1"></i>}
                            {staff.position === 'สปา' && <i className="fas fa-water me-1"></i>}
                            {staff.position === 'ต้อนรับ' && <i className="fas fa-concierge-bell me-1"></i>}
                            {staff.position === 'ผู้จัดการ' && <i className="fas fa-user-tie me-1"></i>}
                            {staff.position === 'อื่นๆ' && <i className="fas fa-question-circle me-1"></i>}
                            {staff.position}
                          </span>
                        </td>
                        <td>
                          {staff.schedules && staff.schedules.length > 0 ? (
                            <div>
                              {staff.schedules.slice(0, 2).map((schedule, idx) => (
                                <div key={idx} className="mb-1">
                                  <span className="badge bg-light text-dark">
                                    {schedule.day} {schedule.startTime} - {schedule.endTime}
                                  </span>
                                </div>
                              ))}
                              {staff.schedules.length > 2 && (
                                <small className="text-muted">
                                  +{staff.schedules.length - 2} วันเพิ่มเติม...
                                </small>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted">ยังไม่มีตารางงาน</span>
                          )}
                        </td>
                        <td>
                          <button 
                            className="btn btn-sm btn-outline-primary me-1" 
                            onClick={() => handleEditStaff(staff)}
                          >
                            <i className="fas fa-calendar-alt me-1"></i>
                            จัดตารางงาน
                          </button>
                          <button 
                            className="btn btn-sm btn-outline-danger" 
                            onClick={() => handleDeleteStaff(staff.id)}
                          >
                            <i className="fas fa-trash-alt me-1"></i>
                            ลบ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-user-plus me-2 text-primary"></i>
                  เพิ่มพนักงาน
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleAddStaff}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">เลือกพนักงาน</label>
                    <select
                      className="form-select"
                      required
                      value={newStaff.userId}
                      onChange={(e) => {
                        const selectedEmployee = employees.find(emp => emp.id === e.target.value);
                        setNewStaff({
                          ...newStaff, 
                          userId: e.target.value,
                          name: selectedEmployee ? (selectedEmployee.fullname || selectedEmployee.name) : ''
                        });
                      }}
                    >
                      <option value="">-- เลือกพนักงาน --</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.fullname || employee.name} ({employee.email})
                        </option>
                      ))}
                    </select>
                    {employees.length === 0 && (
                      <div className="form-text text-warning">
                        <i className="fas fa-exclamation-triangle me-1"></i>
                        ไม่มีพนักงานที่สามารถเพิ่มได้ (พนักงานทั้งหมดได้ถูกเพิ่มในตารางแล้ว หรือยังไม่ได้รับการอนุมัติ)
                      </div>
                    )}
                  </div>
                  <div className="mb-3">
                    <label className="form-label">ตำแหน่ง</label>
                    <select 
                      className="form-select"
                      value={newStaff.position}
                      onChange={(e) => setNewStaff({...newStaff, position: e.target.value})}
                    >
                      {positions.map((pos, idx) => (
                        <option key={idx} value={pos}>{pos}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>ยกเลิก</button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={!newStaff.userId || employees.length === 0}
                  >
                    บันทึก
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Schedule Modal */}
      {showEditModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-calendar-alt me-2 text-primary"></i>
                  จัดตารางงาน: {editShift.name}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
              </div>
              <form onSubmit={handleUpdateStaff}>
                <div className="modal-body">
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">ชื่อพนักงาน</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="ชื่อ-นามสกุล"
                        required
                        value={editShift.name}
                        onChange={(e) => setEditShift({...editShift, name: e.target.value})}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">ตำแหน่ง</label>
                      <select 
                        className="form-select"
                        value={editShift.position}
                        onChange={(e) => setEditShift({...editShift, position: e.target.value})}
                      >
                        {positions.map((pos, idx) => (
                          <option key={idx} value={pos}>{pos}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="card border-0 bg-light mb-4">
                    <div className="card-body">
                      <h6 className="card-title">เพิ่มตารางงานรายสัปดาห์</h6>
                      
                      <div className="mb-3">
                        <label className="form-label">เลือกวันที่ทำงาน</label>
                        <div className="row">
                          {days.map((day, idx) => (
                            <div key={idx} className="col-md-3 col-6 mb-2">
                              <div className="form-check">
                                <input 
                                  className="form-check-input" 
                                  type="checkbox" 
                                  id={`day-${idx}`}
                                  checked={newShift.workDays.includes(day)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewShift({
                                        ...newShift, 
                                        workDays: [...newShift.workDays, day]
                                      });
                                    } else {
                                      setNewShift({
                                        ...newShift, 
                                        workDays: newShift.workDays.filter(d => d !== day)
                                      });
                                    }
                                  }}
                                />
                                <label className="form-check-label" htmlFor={`day-${idx}`}>
                                  {day}
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2">
                          <button 
                            type="button" 
                            className="btn btn-sm btn-outline-primary me-2"
                            onClick={() => setNewShift({...newShift, workDays: [...days]})}
                          >
                            เลือกทั้งหมด
                          </button>
                          <button 
                            type="button" 
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setNewShift({...newShift, workDays: []})}
                          >
                            ล้างการเลือก
                          </button>
                        </div>
                      </div>

                      <div className="row g-3 mb-3">
                        <div className="col-md-5">
                          <label className="form-label">เวลาเริ่มงาน</label>
                          <input 
                            type="time"
                            className="form-control"
                            value={newShift.startTime}
                            onChange={(e) => setNewShift({...newShift, startTime: e.target.value})}
                          />
                        </div>
                        <div className="col-md-5">
                          <label className="form-label">เวลาเลิกงาน</label>
                          <input 
                            type="time"
                            className="form-control"
                            value={newShift.endTime}
                            onChange={(e) => setNewShift({...newShift, endTime: e.target.value})}
                          />
                        </div>
                        <div className="col-md-2 d-flex align-items-end">
                          <button 
                            type="button" 
                            className="btn btn-success w-100"
                            onClick={addShiftToStaff}
                            disabled={newShift.workDays.length === 0}
                          >
                            <i className="fas fa-plus"></i>
                          </button>
                        </div>
                      </div>
                      
                      <div className="alert alert-info small mb-0">
                        <i className="fas fa-info-circle me-1"></i>
                        เลือกวันที่ต้องการทำงานและระบุเวลา จากนั้นกดปุ่มเพิ่มเพื่อสร้างตารางงานสำหรับทุกวันที่เลือก
                      </div>
                    </div>
                  </div>

                  <h6 className="mb-3">ตารางงานที่กำหนด</h6>
                  {editShift.schedules.length === 0 ? (
                    <div className="text-center p-3 bg-light rounded">
                      <p className="text-muted mb-0">ยังไม่มีตารางงานที่กำหนด</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-bordered table-sm">
                        <thead className="table-light">
                          <tr>
                            <th>วัน</th>
                            <th>เวลาเริ่ม</th>
                            <th>เวลาสิ้นสุด</th>
                            <th>การดำเนินการ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editShift.schedules.map((schedule, idx) => (
                            <tr key={idx}>
                              <td>{schedule.day}</td>
                              <td>{schedule.startTime}</td>
                              <td>{schedule.endTime}</td>
                              <td className="text-center">
                                <button 
                                  type="button" 
                                  className="btn btn-sm btn-danger"
                                  onClick={() => removeShiftFromStaff(idx)}
                                >
                                  <i className="fas fa-trash-alt"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>ยกเลิก</button>
                  <button type="submit" className="btn btn-primary">บันทึกการเปลี่ยนแปลง</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Day Details Modal */}
      {showDetailsModal && selectedDayDetails && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-calendar-day me-2 text-primary"></i>
                  รายละเอียดการทำงาน - {selectedDayDetails.day} {getFormattedDate(selectedDayDetails.date)}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowDetailsModal(false)}></button>
              </div>
              <div className="modal-body">
                {selectedDayDetails.staffList.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                    <h5>ไม่มีพนักงานทำงานในวันนี้</h5>
                    <p className="text-muted">ยังไม่มีการจัดตารางงานสำหรับวันนี้</p>
                  </div>
                ) : (
                  <div>
                    <div className="row mb-4">
                      <div className="col-md-6">
                        <div className="d-flex align-items-center">
                          <i className="fas fa-users me-2 text-primary"></i>
                          <span className="fw-bold">จำนวนพนักงาน: {selectedDayDetails.staffList.length} คน</span>
                        </div>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-hover align-middle">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: '25%' }}>ชื่อพนักงาน</th>
                            <th style={{ width: '20%' }}>ตำแหน่ง</th>
                            <th style={{ width: '40%' }}>ช่วงเวลาทำงาน</th>
                            <th style={{ width: '15%' }}>การดำเนินการ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedDayDetails.staffList.map((staff, index) => {
                            const staffColor = selectedStaffFilter !== 'all' 
                              ? getStaffColor(filteredStaffs.findIndex(s => s.id === selectedStaffFilter))
                              : getStaffColor(filteredStaffs.findIndex(s => s.id === staff.id));

                            return (
                              <tr key={index}>
                                <td>
                                  <div className="d-flex align-items-center">
                                    <div 
                                      className="icon-circle me-2 d-flex align-items-center justify-content-center" 
                                      style={{ 
                                        backgroundColor: selectedStaffFilter !== 'all' 
                                          ? `${getStaffColor(filteredStaffs.findIndex(s => s.id === selectedStaffFilter))}20`
                                          : `${getStaffColor(filteredStaffs.findIndex(s => s.id === staff.id))}20`,
                                        width: '35px',
                                        height: '35px',
                                        borderRadius: '50%'
                                      }}
                                    >
                                      <i className="fas fa-user" style={{ 
                                        color: selectedStaffFilter !== 'all' 
                                          ? getStaffColor(filteredStaffs.findIndex(s => s.id === selectedStaffFilter))
                                          : getStaffColor(filteredStaffs.findIndex(s => s.id === staff.id)), 
                                        fontSize: '0.8rem' 
                                      }}></i>
                                    </div>
                                    <div>
                                      <div className="fw-bold">{staff.name}</div>
                                      <small className="text-muted">ID: {staff.id.slice(0, 8)}...</small>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span 
                                    className="badge"
                                    style={{
                                      backgroundColor: selectedStaffFilter !== 'all' 
                                        ? `${getStaffColor(filteredStaffs.findIndex(s => s.id === selectedStaffFilter))}20`
                                        : `${getStaffColor(filteredStaffs.findIndex(s => s.id === staff.id))}20`,
                                      color: selectedStaffFilter !== 'all' 
                                        ? getStaffColor(filteredStaffs.findIndex(s => s.id === selectedStaffFilter))
                                        : getStaffColor(filteredStaffs.findIndex(s => s.id === staff.id)),
                                      border: selectedStaffFilter !== 'all' 
                                        ? `1px solid ${getStaffColor(filteredStaffs.findIndex(s => s.id === selectedStaffFilter))}40`
                                        : `1px solid ${getStaffColor(filteredStaffs.findIndex(s => s.id === staff.id))}40`
                                    }}
                                  >
                                    {staff.position}
                                  </span>
                                </td>
                                <td>
                                  <div className="d-flex flex-column gap-1">
                                    {staff.daySchedules.map((schedule, scheduleIndex) => (
                                      <div key={scheduleIndex} className="d-flex align-items-center">
                                        <i className="fas fa-clock me-2" style={{ 
                                          color: selectedStaffFilter !== 'all' 
                                            ? getStaffColor(filteredStaffs.findIndex(s => s.id === selectedStaffFilter))
                                            : getStaffColor(filteredStaffs.findIndex(s => s.id === staff.id)), 
                                          fontSize: '0.8rem' 
                                        }}></i>
                                        <span className="badge bg-light text-dark">
                                          {schedule.startTime} - {schedule.endTime}
                                        </span>
                                        <small className="text-muted ms-2">
                                          ({Math.round((new Date(`1970-01-01T${schedule.endTime}:00`) - new Date(`1970-01-01T${schedule.startTime}:00`)) / (1000 * 60 * 60))} ชม.)
                                        </small>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                                <td>
                                  <button 
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => {
                                      handleEditStaff(staff);
                                      setShowDetailsModal(false);
                                    }}
                                  >
                                    <i className="fas fa-edit me-1"></i>
                                    แก้ไข
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Time Slots Summary */}
                    <div className="mt-4">
                      <h6 className="mb-3">
                        <i className="fas fa-clock me-2"></i>
                        ตารางเวลาโดยสรุป
                      </h6>
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered">
                          <thead className="table-light">
                            <tr>
                              <th>เวลา</th>
                              {selectedDayDetails.staffList.map((staff, index) => (
                                <th key={index} className="text-center" style={{ minWidth: '120px' }}>
                                  <div className="d-flex flex-column align-items-center">
                                    <div 
                                      className="rounded-circle mb-1" 
                                      style={{
                                        width: '20px',
                                        height: '20px',
                                        backgroundColor: selectedStaffFilter !== 'all' 
                                          ? getStaffColor(filteredStaffs.findIndex(s => s.id === selectedStaffFilter))
                                          : getStaffColor(filteredStaffs.findIndex(s => s.id === staff.id))
                                      }}
                                    ></div>
                                    <small>{staff.name}</small>
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {timeSlots.map((time, timeIndex) => (
                              <tr key={timeIndex}>
                                <th className="bg-light text-center">{time}</th>
                                {selectedDayDetails.staffList.map((staff, staffIndex) => {
                                  const isWorking = staff.daySchedules.some(schedule => {
                                    const convertTimeToMinutes = (timeStr) => {
                                      const [hours, minutes] = timeStr.split(':').map(Number);
                                      return hours * 60 + minutes;
                                    };
                                    
                                    const currentMinutes = convertTimeToMinutes(time);
                                    const startMinutes = convertTimeToMinutes(schedule.startTime);
                                    const endMinutes = convertTimeToMinutes(schedule.endTime);
                                    
                                    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
                                  });

                                  return (
                                    <td key={staffIndex} className="text-center">
                                      {isWorking ? (
                                        <i 
                                          className="fas fa-check-circle" 
                                          style={{ 
                                            color: selectedStaffFilter !== 'all' 
                                              ? getStaffColor(filteredStaffs.findIndex(s => s.id === selectedStaffFilter))
                                              : getStaffColor(filteredStaffs.findIndex(s => s.id === staff.id))
                                          }}
                                        ></i>
                                      ) : (
                                        <i className="fas fa-times-circle text-muted"></i>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDetailsModal(false)}>
                  ปิด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffSchedule;
