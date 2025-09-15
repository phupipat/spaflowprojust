import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../Firebase';
import '../../../node_modules/bootstrap/dist/css/bootstrap.min.css';
import '../../styles/SharedStyles.css';
import '../../styles/DashboardStyles.css';

function UserApproval() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
  const [filter, setFilter] = useState('all'); // 'all', 'member', 'employee'
  const [pendingCount, setPendingCount] = useState(0);
  const [openDropdowns, setOpenDropdowns] = useState({});

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown')) {
        setOpenDropdowns({});
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const fetchPendingUsers = async () => {
    setLoading(true);
    try {
      const snapArtifacts = await getDocs(collection(db, 'artifacts/login-spa-7921d/users'));
      const pendingUsers = snapArtifacts.docs
        .map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp || new Date() }))
        .filter(user => user.status === 'pending');
      
      setPendingUsers(pendingUsers);
      setPendingCount(pendingUsers.length);
    } catch (err) {
      console.error('Error fetching pending users:', err);
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getUserDocRef = (user) => {
    return doc(db, 'artifacts/login-spa-7921d/users', user.id);
  };

  const handleApprove = async (userId) => {
    setUpdating(u => ({ ...u, [userId]: true }));
    try {
      const user = pendingUsers.find(u => u.id === userId);
      if (!user) throw new Error('ไม่พบข้อมูลผู้ใช้');

      // 1. อัปเดตสถานะผู้ใช้เป็น 'approved' และกำหนด role ตามเดิม
      await updateDoc(getUserDocRef(user), { 
        status: 'approved',
        role: user.role
      });

      // 2. สร้างเอกสารใน collection 'mail' เพื่อให้ Firebase Extension ส่งอีเมล
      if (user.email) {
        // สร้างเทมเพลตอีเมลที่เหมาะสมตามบทบาทของผู้ใช้
        const isEmployee = user.role === 'employee';
        const loginLink = 'https://spa-flow.web.app/login'; // ลิงค์เข้าสู่ระบบ (ปรับตาม URL จริงของโปรเจค)

        // สร้างหัวเรื่องอีเมลตามบทบาทของผู้ใช้
        const emailSubject = isEmployee 
          ? 'SpaFlow: บัญชีพนักงานของคุณได้รับการอนุมัติแล้ว ✅' 
          : 'SpaFlow: บัญชีสมาชิกของคุณได้รับการอนุมัติแล้ว ✅';

        // สร้างเนื้อหาอีเมลที่เหมาะสมกับแต่ละบทบาท
        const emailContent = isEmployee
          ? `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #3a7bd5 0%, #00d2ff 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">🎉 ยินดีต้อนรับสู่ทีมงาน SpaFlow!</h1>
              </div>
              <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-bottom: 20px;">สวัสดีคุณ ${user.fullname || user.name || 'พนักงานใหม่'},</h2>
                <p style="color: #555; font-size: 16px;">เรามีความยินดีที่จะแจ้งให้ทราบว่า <strong>บัญชีพนักงาน</strong> ของคุณสำหรับ <strong>SpaFlow</strong> ได้รับการอนุมัติเรียบร้อยแล้ว!</p>
                
                <div style="background: #e8f0ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3a7bd5;">
                  <p style="margin-top: 0; color: #333; font-weight: bold;">✓ คุณสามารถเข้าสู่ระบบได้แล้วตอนนี้</p>
                  <p style="margin-bottom: 10px; color: #444;">เข้าสู่ระบบด้วยอีเมลและรหัสผ่านที่คุณได้ลงทะเบียนไว้:</p>
                  <div style="text-align: center; margin: 15px 0;">
                    <a href="${loginLink}" style="background-color: #3a7bd5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">เข้าสู่ระบบตอนนี้</a>
                  </div>
                </div>

                <div style="background: #f0f5fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 0; color: #333; font-weight: bold;">⚡ ในระบบพนักงาน คุณสามารถ:</p>
                  <ul style="color: #444; margin: 10px 0;">
                    <li>ดูตารางงานประจำวันของคุณ</li>
                    <li>ตรวจสอบข้อมูลการจองที่ได้รับมอบหมาย</li>
                    <li>จัดการโปรไฟล์ส่วนตัว</li>
                    <li>รับการแจ้งเตือนเมื่อมีการจองใหม่</li>
                  </ul>
                </div>
                
                <p style="color: #555;">หากคุณมีคำถามหรือต้องการความช่วยเหลือในการใช้งานระบบ โปรดติดต่อผู้จัดการของคุณได้โดยตรง</p>
                <p style="color: #555; font-weight: bold;">เราดีใจที่ได้คุณมาร่วมเป็นส่วนหนึ่งของทีม และหวังว่าจะได้ร่วมงานกันอย่างราบรื่น!</p>
                
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
                <p style="color: #777; font-size: 14px;">ขอแสดงความนับถือ,<br><strong>ทีมงาน SpaFlow</strong></p>
              </div>
            </div>
          `
          : `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">🎉 ยินดีต้อนรับสู่ SpaFlow!</h1>
              </div>
              <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-bottom: 20px;">สวัสดีคุณ ${user.fullname || user.name || 'สมาชิกใหม่'},</h2>
                <p style="color: #555; font-size: 16px;">เรามีความยินดีที่จะแจ้งให้ทราบว่า <strong>บัญชีสมาชิก</strong> ของคุณสำหรับ <strong>SpaFlow</strong> ได้รับการอนุมัติเรียบร้อยแล้ว!</p>
                
                <div style="background: #f7e8ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #764ba2;">
                  <p style="margin-top: 0; color: #333; font-weight: bold;">✓ คุณสามารถเข้าสู่ระบบได้แล้วตอนนี้</p>
                  <p style="margin-bottom: 10px; color: #444;">เข้าสู่ระบบด้วยอีเมลและรหัสผ่านที่คุณได้ลงทะเบียนไว้:</p>
                  <div style="text-align: center; margin: 15px 0;">
                    <a href="${loginLink}" style="background-color: #764ba2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">เข้าสู่ระบบตอนนี้</a>
                  </div>
                </div>

                <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 0; color: #2d5a2d; font-weight: bold;">✅ ในฐานะสมาชิกของเรา คุณสามารถ:</p>
                  <ul style="color: #2d5a2d; margin: 10px 0;">
                    <li>จองบริการสปาออนไลน์ได้ทันที</li>
                    <li>รับสิทธิพิเศษและส่วนลดสำหรับสมาชิก</li>
                    <li>ดูประวัติการจองและสะสมแต้ม</li>
                    <li>จัดการโปรไฟล์ส่วนตัว</li>
                  </ul>
                </div>
                
                <p style="color: #555;">ขอขอบคุณที่เลือกใช้บริการกับเรา เราหวังว่าคุณจะได้รับประสบการณ์ที่ดีที่สุดจากบริการสปาของเรา</p>
                <p style="color: #555; font-style: italic;">พบกับโปรโมชั่นพิเศษสำหรับสมาชิกใหม่! จองบริการครั้งแรกรับส่วนลด 10% ภายใน 7 วัน</p>
                
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
                <p style="color: #777; font-size: 14px;">ขอแสดงความนับถือ,<br><strong>ทีมงาน SpaFlow</strong></p>
              </div>
            </div>
          `;

        // ส่งอีเมลผ่าน Firebase Extensions
        await addDoc(collection(db, 'mail'), {
          to: user.email,
          message: {
            subject: emailSubject,
            html: emailContent,
          },
          // ข้อมูลสำหรับ tracking
          delivery: {
            startTime: new Date(),
            state: 'PENDING'
          }
        });
      }

      // 3. อัปเดต state ในหน้าเว็บ
      setPendingUsers(users => users.filter(u => u.id !== userId));
      
      // แสดงข้อความแจ้งเตือนที่ดูมืออาชีพขึ้น
      const roleText = user.role === 'employee' ? 'พนักงาน' : 'สมาชิก';
      const successMessage = `✅ อนุมัติ${roleText} ${user.fullname || user.name} เรียบร้อยแล้ว\n📧 ส่งอีเมลแจ้งเตือนพร้อมลิงค์เข้าสู่ระบบไปยัง ${user.email} แล้ว`;
      alert(successMessage);

    } catch (err) {
      console.error('Error in handleApprove:', err);
      alert('❌ เกิดข้อผิดพลาด: ' + err.message);
    }
    setUpdating(u => ({ ...u, [userId]: false }));
  };

  const handleReject = async (userId) => {
    if (!window.confirm('คุณต้องการปฏิเสธคำขอนี้ใช่หรือไม่?')) {
      return;
    }
    
    setUpdating(u => ({ ...u, [userId]: true }));
    try {
      const user = pendingUsers.find(u => u.id === userId);
      if (!user) throw new Error('ไม่พบข้อมูลผู้ใช้');

      // อัปเดตสถานะผู้ใช้เป็น 'rejected'
      await updateDoc(getUserDocRef(user), { status: 'rejected' });

      // ส่งอีเมลแจ้งเตือนการปฏิเสธ
      if (user.email) {
        await addDoc(collection(db, 'mail'), {
          to: user.email,
          message: {
            subject: 'SpaFlow: คำขอสมัครสมาชิกของคุณถูกปฏิเสธ',
            html: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #6d6d6d 0%, #3d3d3d 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="margin: 0; font-size: 24px;">ขอขอบคุณสำหรับความสนใจในบริการของเรา</h1>
                </div>
                <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
                  <h2 style="color: #333; margin-bottom: 20px;">เรียนคุณ ${user.fullname || user.name || 'ผู้สมัคร'},</h2>
                  <p style="color: #555; font-size: 16px;">เราขอขอบคุณสำหรับความสนใจที่มีต่อ <strong>SpaFlow</strong></p>
                  
                  <div style="background: #f9f2f2; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #d86161;">
                    <p style="margin: 0; color: #333;">ขออภัย เราต้องแจ้งให้ทราบว่า คำขอสมัครสมาชิกของคุณไม่ได้รับการอนุมัติในครั้งนี้</p>
                  </div>
                  
                  <p style="color: #555;">หากคุณมีข้อสงสัยหรือต้องการข้อมูลเพิ่มเติม โปรดติดต่อเราได้โดยตรงที่อีเมล support@spaflow.com หรือโทร 02-XXX-XXXX</p>
                  <p style="color: #555;">ขอบคุณสำหรับความสนใจ และเราหวังว่าจะได้มีโอกาสให้บริการคุณในอนาคต</p>
                  
                  <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
                  <p style="color: #777; font-size: 14px;">ขอแสดงความนับถือ,<br><strong>ทีมงาน SpaFlow</strong></p>
                </div>
              </div>
            `,
          },
          delivery: {
            startTime: new Date(),
            state: 'PENDING'
          }
        });
      }

      // อัปเดต state ในหน้าเว็บ
      setPendingUsers(users => users.filter(u => u.id !== userId));
      
      const roleText = user.role === 'employee' ? 'พนักงาน' : 'สมาชิก';
      alert(`❌ ปฏิเสธคำขอสมัคร${roleText}จาก ${user.fullname || user.name} เรียบร้อยแล้ว\n📧 ส่งอีเมลแจ้งเตือนไปยัง ${user.email} แล้ว`);
    } catch (err) {
      console.error('Error in handleReject:', err);
      alert('❌ เกิดข้อผิดพลาด: ' + err.message);
    }
    setUpdating(u => ({ ...u, [userId]: false }));
  };

  const handleChangeRole = async (userId, newRole) => {
    const user = pendingUsers.find(u => u.id === userId);
    if (!user) return;

    const currentRoleText = user.role === 'employee' ? 'พนักงาน' : 'ลูกค้า';
    const newRoleText = newRole === 'employee' ? 'พนักงาน' : 'ลูกค้า';
    
    if (!window.confirm(`คุณต้องการเปลี่ยนบทบาทของ ${user.fullname || user.name} จาก ${currentRoleText} เป็น ${newRoleText} ใช่หรือไม่?`)) {
      return;
    }
    
    setUpdating(u => ({ ...u, [userId]: true }));
    try {
      // อัปเดตบทบาทและ ID ตามบทบาทในฐานข้อมูล
      let updateData = { role: newRole };
      if (newRole === 'member') {
        updateData.memberId = user.id;
        updateData.employeeId = null;
      } else if (newRole === 'employee') {
        updateData.employeeId = user.id;
        updateData.memberId = null;
      }
      await updateDoc(getUserDocRef(user), updateData);

      // อัปเดต state ในหน้าเว็บ
      setPendingUsers(users => 
        users.map(u => 
          u.id === userId ? { ...u, role: newRole, ...updateData } : u
        )
      );
      
      alert(`✅ เปลี่ยนบทบาทของ ${user.fullname || user.name} เป็น ${newRoleText} เรียบร้อยแล้ว`);
    } catch (err) {
      console.error('Error in handleChangeRole:', err);
      alert('❌ เกิดข้อผิดพลาดในการเปลี่ยนบทบาท: ' + err.message);
    }
    setUpdating(u => ({ ...u, [userId]: false }));
  };

  const toggleDropdown = (userId) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnName) => {
    if (sortConfig.key !== columnName) return <i className="fas fa-sort text-muted ms-1"></i>;
    return sortConfig.direction === 'asc' 
      ? <i className="fas fa-sort-up ms-1 text-primary"></i> 
      : <i className="fas fa-sort-down ms-1 text-primary"></i>;
  };

  const filteredAndSortedUsers = pendingUsers
    .filter(user => {
      // Apply role filter
      if (filter !== 'all' && user.role !== filter) return false;
      
      // Apply search filter
      if (searchTerm.trim() === '') return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        (user.name && user.name.toLowerCase().includes(searchLower)) ||
        (user.fullname && user.fullname.toLowerCase().includes(searchLower)) ||
        (user.email && user.email.toLowerCase().includes(searchLower))
      );
    })
    .sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

  return (
    <div className="container-fluid px-4 animate-fade-in">
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4 className="mb-0" style={{ color: '#333' }}>
              <i className="fas fa-user-check me-2" style={{ color: '#ff9900' }}></i>
              อนุมัติผู้ใช้
            </h4>
            <button 
              className="btn btn-sm btn-outline-primary" 
              onClick={fetchPendingUsers}
              disabled={loading}
            >
              <i className="fas fa-sync-alt me-1"></i> รีเฟรช
            </button>
          </div>
          
          {/* Stats Card */}
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="card border-0 shadow-sm dashboard-card">
                <div className="card-body d-flex align-items-center">
                  <div className="icon-circle" style={{ backgroundColor: 'rgba(255, 153, 0, 0.1)' }}>
                    <i className="fas fa-user-clock" style={{ color: '#ffffffff' }}></i>
                  </div>
                  <div className="ms-3">
                    <div className="text-muted small">ผู้ใช้รออนุมัติ</div>
                    <div className="fs-4 fw-bold">{pendingUsers.length}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-0 shadow-sm dashboard-card">
                <div className="card-body d-flex align-items-center">
                  <div className="icon-circle" style={{ backgroundColor: 'rgba(40, 167, 69, 0.1)' }}>
                    <i className="fas fa-user" style={{ color: '#ffffffff' }}></i>
                  </div>
                  <div className="ms-3">
                    <div className="text-muted small">ลูกค้ารออนุมัติ</div>
                    <div className="fs-4 fw-bold">
                      {pendingUsers.filter(u => u.role === 'member' || !u.role).length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-0 shadow-sm dashboard-card">
                <div className="card-body d-flex align-items-center">
                  <div className="icon-circle" style={{ backgroundColor: 'rgba(0, 123, 255, 0.1)' }}>
                    <i className="fas fa-user-tie" style={{ color: '#f5f5f5ff' }}></i>
                  </div>
                  <div className="ms-3">
                    <div className="text-muted small">พนักงานรออนุมัติ</div>
                    <div className="fs-4 fw-bold">
                      {pendingUsers.filter(u => u.role === 'employee').length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="row g-3 align-items-center mb-3">
                <div className="col-md-6">
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0">
                      <i className="fas fa-search text-muted"></i>
                    </span>
                    <input 
                      type="text" 
                      className="form-control border-start-0 ps-0" 
                      placeholder="ค้นหาตามชื่อหรืออีเมล..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <select 
                    className="form-select" 
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">ทั้งหมด</option>
                    <option value="member">เฉพาะลูกค้า</option>
                    <option value="employee">เฉพาะพนักงาน</option>
                  </select>
                </div>
                <div className="col-md-2 text-end">
                  <span className="badge bg-primary rounded-pill p-2">
                    {filteredAndSortedUsers.length} รายการ
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">กำลังโหลด...</span>
                  </div>
                  <p className="text-muted mt-3">กำลังโหลดข้อมูลผู้ใช้...</p>
                </div>
              ) : filteredAndSortedUsers.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-check-circle fa-4x text-success mb-3"></i>
                  <h5>ไม่มีผู้ใช้ที่รออนุมัติในขณะนี้</h5>
                  <p className="text-muted">คำขอทั้งหมดได้รับการดำเนินการแล้ว</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th onClick={() => requestSort('name')} style={{cursor: 'pointer'}}>
                          ชื่อผู้ใช้ {getSortIcon('name')}
                        </th>
                        <th onClick={() => requestSort('email')} style={{cursor: 'pointer'}}>
                          อีเมล {getSortIcon('email')}
                        </th>
                        <th onClick={() => requestSort('role')} style={{cursor: 'pointer'}}>
                          บทบาท {getSortIcon('role')}
                        </th>
                        <th onClick={() => requestSort('timestamp')} style={{cursor: 'pointer'}}>
                          วันที่สมัคร {getSortIcon('timestamp')}
                        </th>
                        <th onClick={() => requestSort('memberId')} style={{cursor: 'pointer'}}>
                          รหัสสมาชิก {getSortIcon('memberId')}
                        </th>
                        <th onClick={() => requestSort('position')} style={{cursor: 'pointer'}}>
                          ตำแหน่ง {getSortIcon('position')}
                        </th>
                        <th className="text-center">การดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedUsers.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="flex-shrink-0">
                                <div 
                                  className="icon-circle" 
                                  style={{ 
                                    backgroundColor: user.role === 'employee' ? 'rgba(0, 123, 255, 0.1)' : 'rgba(40, 167, 69, 0.1)',
                                    width: '45px',
                                    height: '45px'
                                  }}
                                >
                                  <i 
                                    className={user.role === 'employee' ? 'fas fa-user-tie' : 'fas fa-user'} 
                                    style={{ color: user.role === 'employee' ? '#0d6efd' : '#28a745' }}
                                  ></i>
                                </div>
                              </div>
                              <div className="ms-3">
                                <h6 className="mb-0">{user.fullname || user.name}</h6>
                                <small className="text-muted">สมัครเมื่อ {user.timestamp ? new Date(user.timestamp.seconds * 1000).toLocaleDateString('th-TH') : 'ไม่ระบุ'}</small>
                              </div>
                            </div>
                          </td>
                          <td>{user.email}</td>
                          <td>
                            <div className="dropdown" style={{ position: 'relative' }}>
                              <button 
                                className={`btn btn-sm ${user.role === 'employee' ? 'btn-primary' : 'btn-success'}`}
                                type="button" 
                                onClick={() => toggleDropdown(user.id)}
                                disabled={updating[user.id]}
                                style={{ minWidth: '120px' }}
                              >
                                {user.role === 'member' ? (
                                  <>
                                    <i className="fas fa-user me-1"></i>
                                    ลูกค้า
                                  </>
                                ) : user.role === 'employee' ? (
                                  <>
                                    <i className="fas fa-user-tie me-1"></i>
                                    พนักงาน
                                  </>
                                ) : (
                                  <>
                                    <i className="fas fa-question me-1"></i>
                                    ไม่ระบุ
                                  </>
                                )}
                                <i className="fas fa-chevron-down ms-1"></i>
                              </button>
                              {openDropdowns[user.id] && (
                                <div 
                                  className="dropdown-menu show" 
                                  style={{ 
                                    position: 'absolute', 
                                    top: '100%', 
                                    left: '0',
                                    zIndex: 1000,
                                    minWidth: '200px'
                                  }}
                                >
                                  <button 
                                    className="dropdown-item" 
                                    onClick={() => {
                                      handleChangeRole(user.id, 'member');
                                      setOpenDropdowns(prev => ({ ...prev, [user.id]: false }));
                                    }}
                                    disabled={user.role === 'member' || updating[user.id]}
                                  >
                                    <i className="fas fa-user me-2 text-success"></i>
                                    เปลี่ยนเป็นลูกค้า
                                  </button>
                                  <button 
                                    className="dropdown-item" 
                                    onClick={() => {
                                      handleChangeRole(user.id, 'employee');
                                      setOpenDropdowns(prev => ({ ...prev, [user.id]: false }));
                                    }}
                                    disabled={user.role === 'employee' || updating[user.id]}
                                  >
                                    <i className="fas fa-user-tie me-2 text-primary"></i>
                                    เปลี่ยนเป็นพนักงาน
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            {user.timestamp ? 
                              new Date(user.timestamp.seconds * 1000).toLocaleDateString('th-TH', {
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit'
                              }) : 
                              'ไม่ระบุ'
                            }
                          </td>
                          <td>
                            {user.role === 'employee'
                              ? user.employeeId || user.id // แสดง employeeId หรือ Document ID ถ้ายังไม่มี
                              : user.memberId || user.id   // แสดง memberId หรือ Document ID ถ้ายังไม่มี
                            }
                          </td>
                          <td>{user.position || '-'}</td>
                          <td>
                            <div className="d-flex justify-content-center gap-2">
                              <button 
                                className="btn btn-sm btn-success" 
                                onClick={() => handleApprove(user.id)}
                                disabled={updating[user.id]}
                              >
                                <i className="fas fa-check me-1"></i> อนุมัติ
                              </button>
                              <button 
                                className="btn btn-sm btn-danger" 
                                onClick={() => handleReject(user.id)}
                                disabled={updating[user.id]}
                              >
                                <i className="fas fa-times me-1"></i> ปฏิเสธ
                              </button>
                              <button 
                                className="btn btn-sm btn-outline-dark"
                                onClick={() => window.open(`/profile/${user.id}`, '_blank')}
                                disabled={updating[user.id]}
                              >
                                <i className="fas fa-id-card me-1"></i> โปรไฟล์
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserApproval;
