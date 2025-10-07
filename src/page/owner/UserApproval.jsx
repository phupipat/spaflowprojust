import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../Firebase';
import '../../../node_modules/bootstrap/dist/css/bootstrap.min.css';
import '../../styles/SharedStyles.css';
import '../../styles/DashboardStyles.css';

// Add custom CSS for animations and new components
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  
  .icon-circle-sm {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
  }
  
  .role-transition {
    transition: all 0.3s ease;
  }
  
  .animate__animated {
    animation-duration: 1s;
    animation-fill-mode: both;
  }
  
  .animate__fadeIn {
    animation-name: fadeIn;
  }
  
  .animate__pulse {
    animation-name: pulse;
    animation-duration: 0.5s;
    animation-iteration-count: 2;
  }
  
  .dropdown-item:hover {
    background-color: rgba(0,0,0,0.05);
    transition: all 0.2s ease;
  }
  
  /* Override default bootstrap table styling */
  .table > :not(caption) > * > * {
    padding: 1rem 1rem;
  }
`;

function UserApproval() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
  const [filter, setFilter] = useState('all'); // 'all', 'member', 'employee'
  const [pendingCount, setPendingCount] = useState(0);
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [roleChanged, setRoleChanged] = useState(null); // Track which user's role was changed for animation

  useEffect(() => {
    fetchPendingUsers();
    
    // Inject custom styles
    const styleElement = document.createElement('style');
    styleElement.innerHTML = styles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
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
  // Debug: log roles to help investigate missing employee role display
  console.debug('Fetched pending users roles:', pendingUsers.map(u => ({ id: u.id, role: u.role })));
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
              <div style="background: linear-gradient(135deg, #eac966ff 0%, #732400ff 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
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
      
      // Set the roleChanged state to trigger animation
      setRoleChanged(userId);
      setTimeout(() => setRoleChanged(null), 3000);
      
      // Show success toast notification instead of alert
      const roleIcon = newRole === 'employee' ? 
        '<i class="fas fa-user-tie" style="color: #0052cc;"></i>' : 
        '<i class="fas fa-user text-success"></i>';
        
      const successElement = document.createElement('div');
      successElement.innerHTML = `
        <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 5000">
          <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header" style="background-color: ${newRole === 'employee' ? '#e6f0ff' : '#e8f5e8'}">
              ${roleIcon}
              <strong class="me-auto ms-2">เปลี่ยนบทบาทสำเร็จ</strong>
              <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"
                onClick="this.closest('.toast').remove()"></button>
            </div>
            <div class="toast-body">
              <div class="d-flex align-items-center">
                <div class="me-3">
                  <span class="badge rounded-pill bg-${newRole === 'employee' ? 'primary' : 'success'}" style="font-size: 1.5rem; padding: 0.5rem;">
                    <i class="fas fa-check"></i>
                  </span>
                </div>
                <div>
                  <p class="mb-0">เปลี่ยนบทบาทของ <strong>${user.fullname || user.name}</strong> เป็น <strong>${newRoleText}</strong> เรียบร้อยแล้ว</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(successElement);
      
      // Remove the toast after 3 seconds
      setTimeout(() => {
        if (successElement.parentNode) {
          document.body.removeChild(successElement);
        }
      }, 3000);
      
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
              <div className="card border-0 shadow-sm dashboard-card" style={{borderRadius: '10px', overflow: 'hidden'}}>
                <div className="card-body d-flex align-items-center p-0">
                  <div className="d-flex align-items-center justify-content-center h-100" 
                    style={{ 
                      backgroundColor: 'rgba(255, 153, 0, 0.1)', 
                      width: '80px',
                      padding: '20px'
                    }}>
                    <div className="icon-circle" style={{ backgroundColor: 'rgba(255, 153, 0, 0.2)', width: '50px', height: '50px' }}>
                      <i className="fas fa-user-clock" style={{ color: '#ff9900', fontSize: '1.2rem' }}></i>
                    </div>
                  </div>
                  <div className="ms-3 p-3">
                    <div className="text-muted small fw-medium">ผู้ใช้รออนุมัติ</div>
                    <div className="fs-3 fw-bold">{pendingUsers.length}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-0 shadow-sm dashboard-card" style={{borderRadius: '10px', overflow: 'hidden'}}>
                <div className="card-body d-flex align-items-center p-0">
                  <div className="d-flex align-items-center justify-content-center h-100" 
                    style={{ 
                      backgroundColor: 'rgba(40, 167, 69, 0.1)', 
                      width: '80px',
                      padding: '20px'
                    }}>
                    <div className="icon-circle" style={{ backgroundColor: 'rgba(40, 167, 69, 0.2)', width: '50px', height: '50px' }}>
                      <i className="fas fa-user" style={{ color: '#28a745', fontSize: '1.2rem' }}></i>
                    </div>
                  </div>
                  <div className="ms-3 p-3">
                    <div className="text-muted small fw-medium">ลูกค้ารออนุมัติ</div>
                    <div className="fs-3 fw-bold">
                      {pendingUsers.filter(u => u.role === 'member' || !u.role).length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card border-0 shadow-sm dashboard-card" style={{borderRadius: '10px', overflow: 'hidden'}}>
                <div className="card-body d-flex align-items-center p-0">
                  <div className="d-flex align-items-center justify-content-center h-100" 
                    style={{ 
                      backgroundColor: 'rgba(0, 82, 204, 0.1)', 
                      width: '80px',
                      padding: '20px'
                    }}>
                    <div className="icon-circle" style={{ backgroundColor: 'rgba(0, 82, 204, 0.2)', width: '50px', height: '50px' }}>
                      <i className="fas fa-user-tie" style={{ color: '#0052cc', fontSize: '1.2rem' }}></i>
                    </div>
                  </div>
                  <div className="ms-3 p-3">
                    <div className="text-muted small fw-medium">พนักงานรออนุมัติ</div>
                    <div className="fs-3 fw-bold">
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
                          <div className="d-flex align-items-center">
                            <i className="fas fa-user-tag me-1 text-muted" style={{fontSize: '0.9rem'}}></i>
                            <span>บทบาท</span> {getSortIcon('role')}
                          </div>
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
                              <div className="flex-shrink-0 position-relative">
                                <div 
                                  className={`icon-circle role-transition ${roleChanged === user.id ? 'animate__animated animate__pulse' : ''}`}
                                  style={{ 
                                    backgroundColor: user.role === 'employee' ? 'rgba(0, 82, 204, 0.15)' : 'rgba(40, 167, 69, 0.1)',
                                    width: '50px',
                                    height: '50px',
                                    border: user.role === 'employee' ? '2px solid rgba(0, 82, 204, 0.3)' : '2px solid rgba(40, 167, 69, 0.2)'
                                  }}
                                >
                                  <i 
                                    className={user.role === 'employee' ? 'fas fa-user-tie' : 'fas fa-user'} 
                                    style={{ 
                                      color: user.role === 'employee' ? '#0052cc' : '#28a745',
                                      fontSize: '1.2rem'
                                    }}
                                  ></i>
                                </div>
                                {/* Role badge indicator */}
                                <div 
                                  className="position-absolute translate-middle badge rounded-pill" 
                                  style={{ 
                                    top: '75%', 
                                    left: '75%', 
                                    backgroundColor: user.role === 'employee' ? '#0052cc' : '#28a745',
                                    border: '2px solid white',
                                    padding: '0.35em 0.6em'
                                  }}
                                >
                                  {user.role === 'employee' ? 
                                    <i className="fas fa-briefcase" style={{fontSize: '0.7rem'}}></i> : 
                                    <i className="fas fa-id-card" style={{fontSize: '0.7rem'}}></i>}
                                </div>
                              </div>
                              <div className="ms-3">
                                <div className="d-flex align-items-center">
                                  <h6 className="mb-0 fw-bold">{user.fullname || user.name}</h6>
                                  {roleChanged === user.id && (
                                    <span className="badge bg-warning ms-2 animate__animated animate__fadeIn">
                                      บทบาทถูกเปลี่ยน
                                    </span>
                                  )}
                                </div>
                                <div className="d-flex align-items-center mt-1">
                                  <i className="fas fa-clock text-muted me-1" style={{fontSize: '0.7rem'}}></i>
                                  <small className="text-muted">
                                    สมัครเมื่อ {user.timestamp ? 
                                      new Date(user.timestamp.seconds * 1000).toLocaleDateString('th-TH', {day: 'numeric', month: 'short', year: 'numeric'}) : 
                                      'ไม่ระบุ'}
                                  </small>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <i className="fas fa-envelope-open text-muted me-2" style={{fontSize: '0.8rem'}}></i>
                              <span className="text-truncate" style={{maxWidth: '200px', display: 'inline-block'}} title={user.email}>
                                {user.email}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              {/* Persistent role badge for visibility/debugging */}
                              <span className={`badge me-2 ${user.role === 'employee' ? 'bg-primary' : user.role === 'member' ? 'bg-success' : 'bg-secondary'}`} style={{textTransform: 'none'}}>
                                {user.role || 'ไม่ระบุ'}
                              </span>
                              <div className="dropdown" style={{ position: 'relative' }}>
                              <button 
                                className={`btn btn-sm d-flex align-items-center justify-content-between`}
                                type="button" 
                                onClick={() => toggleDropdown(user.id)}
                                disabled={updating[user.id]}
                                style={{ 
                                  minWidth: '140px',
                                  padding: '6px 12px',
                                  backgroundColor: user.role === 'employee' ? '#0052cc' : (user.role === 'member' ? '#28a745' : '#e0e0e0'),
                                  color: user.role === 'employee' ? '#fff' : (user.role === 'member' ? '#fff' : '#333'),
                                  borderColor: user.role === 'employee' ? '#004099' : (user.role === 'member' ? '#218838' : '#ccc'),
                                  fontWeight: user.role === 'employee' ? 600 : 500,
                                  boxShadow: updating[user.id] ? 'none' : '0 1px 3px rgba(0,0,0,0.12)'
                                }}
                              >
                                <span className="d-flex align-items-center">
                                  {user.role === 'member' ? (
                                    <>
                                      <i className="fas fa-user me-2" style={{fontSize: '0.9rem'}}></i>
                                      <span>ลูกค้า</span>
                                    </>
                                  ) : user.role === 'employee' ? (
                                    <>
                                      <i className="fas fa-user-tie me-2" style={{fontSize: '0.9rem'}}></i>
                                      <span>พนักงาน</span>
                                    </>
                                  ) : (
                                    <>
                                      <i className="fas fa-question-circle me-2" style={{fontSize: '0.9rem'}}></i>
                                      <span>ไม่ระบุ</span>
                                    </>
                                  )}
                                </span>
                                <i className="fas fa-chevron-down ms-1" style={{fontSize: '0.8rem'}}></i>
                              </button>
                              {openDropdowns[user.id] && (
                                <div 
                                  className="dropdown-menu show shadow-sm" 
                                  style={{ 
                                    position: 'absolute', 
                                    top: '100%', 
                                    left: '0',
                                    zIndex: 1000,
                                    minWidth: '220px',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(0,0,0,0.08)',
                                    animation: 'fadeIn 0.2s ease-in-out'
                                  }}
                                >
                                  <button 
                                    className={`dropdown-item rounded-3 mb-1 ${user.role === 'member' ? 'active' : ''}`}
                                    onClick={() => {
                                      handleChangeRole(user.id, 'member');
                                      setOpenDropdowns(prev => ({ ...prev, [user.id]: false }));
                                    }}
                                    disabled={user.role === 'member' || updating[user.id]}
                                    style={user.role === 'member' ? 
                                      {backgroundColor: '#e8f5e8', padding: '10px 15px'} : 
                                      {padding: '10px 15px'}
                                    }
                                  >
                                    <div className="d-flex align-items-center justify-content-between">
                                      <div className="d-flex align-items-center">
                                        <div className="icon-circle-sm me-2" style={{backgroundColor: 'rgba(40, 167, 69, 0.15)'}}>
                                          <i className="fas fa-user text-success" style={{fontSize: '0.8rem'}}></i>
                                        </div>
                                        <span style={{fontWeight: user.role === 'member' ? '600' : '400'}}>เปลี่ยนเป็นลูกค้า</span>
                                      </div>
                                      {user.role === 'member' && 
                                        <span className="badge bg-success rounded-pill" style={{fontSize: '0.7rem', padding: '0.35em 0.65em'}}>
                                          <i className="fas fa-check"></i>
                                        </span>
                                      }
                                    </div>
                                  </button>
                                  <button 
                                    className={`dropdown-item rounded-3 ${user.role === 'employee' ? 'active' : ''}`} 
                                    onClick={() => {
                                      handleChangeRole(user.id, 'employee');
                                      setOpenDropdowns(prev => ({ ...prev, [user.id]: false }));
                                    }}
                                    disabled={user.role === 'employee' || updating[user.id]}
                                    style={user.role === 'employee' ? 
                                      {backgroundColor: '#e6f0ff', color: '#0052cc', fontWeight: 600, padding: '10px 15px'} : 
                                      {padding: '10px 15px'}
                                    }
                                  >
                                    <div className="d-flex align-items-center justify-content-between">
                                      <div className="d-flex align-items-center">
                                        <div className="icon-circle-sm me-2" style={{backgroundColor: 'rgba(6, 73, 174, 0.15)'}}>
                                          <i className="fas fa-user-tie" style={{color: '#0052cc', fontSize: '0.8rem'}}></i>
                                        </div>
                                        <span style={{fontWeight: user.role === 'employee' ? '600' : '400'}}>เปลี่ยนเป็นพนักงาน</span>
                                      </div>
                                      {user.role === 'employee' && 
                                        <span className="badge rounded-pill" style={{backgroundColor: '#0052cc', fontSize: '0.7rem', padding: '0.35em 0.65em'}}>
                                          <i className="fas fa-check"></i>
                                        </span>
                                      }
                                    </div>
                                  </button>
                                </div>
                              )}
                            </div>
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
