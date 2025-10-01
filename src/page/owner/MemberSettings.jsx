import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../Firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';

function MemberSettings() {
  const [members, setMembers] = useState([]);
  const [name, setName] = useState('');
  const [points, setPoints] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPoints, setEditPoints] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [pointsToAdd, setPointsToAdd] = useState(1);
  const [pointChangeReason, setPointChangeReason] = useState('');
  const [showPointModal, setShowPointModal] = useState(false);
  const [pointAction, setPointAction] = useState('add'); // 'add' or 'subtract'
  const [activeSection, setActiveSection] = useState('list'); // 'list', 'profile'

  const searchRef = useRef(null);

  // ข้อมูลส่วนลดตามระดับแต้ม
  const discountTiers = [
    { points: 100, discount: '10%', color: '#28a745' },
    { points: 300, discount: '15%', color: '#17a2b8' },
    { points: 500, discount: '25%', color: '#fd7e14' },
    { points: 1000, discount: '35%', color: '#dc3545' },
    { points: 2000, discount: '50%', color: '#6f42c1' }
  ];

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      const snap = await getDocs(collection(db, 'artifacts/login-spa-7921d/users'));
      const membersData = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.role === 'member');
      setMembers(membersData);
      setLoading(false);
    };
    fetchMembers();

    // ปิด dropdown เมื่อคลิกนอกพื้นที่
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ฟิลเตอร์สมาชิกตามคำค้นหา
  const filteredMembers = members.filter(m => 
    m.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );


  // ลบสมาชิก
  const handleDelete = async (id) => {
    if (!window.confirm('คุณต้องการลบสมาชิกนี้ใช่หรือไม่?')) return;
    try {
      await deleteDoc(doc(db, 'artifacts/login-spa-7921d/users', id));
      setMembers(members.filter(m => m.id !== id));
      if (selectedMember && selectedMember.id === id) {
        setSelectedMember(null);
        setActiveSection('list');
      }
      alert('ลบสมาชิกเรียบร้อยแล้ว');
    } catch (error) {
      console.error("Error deleting member:", error);
      alert('เกิดข้อผิดพลาด: ' + error.message);
    }
  };

  // เริ่มแก้ไขสมาชิก
  const startEdit = (m) => {
    setEditId(m.id); 
    setEditName(m.name || ''); 
    setEditPoints(m.points || 0);
  };

  // บันทึกการแก้ไข
  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      const updatedMember = { 
        name: editName, 
        points: Number(editPoints) 
      };
      await updateDoc(doc(db, 'artifacts/login-spa-7921d/users', editId), updatedMember);
      setMembers(members.map(m => m.id === editId ? { ...m, ...updatedMember } : m));
      if (selectedMember && selectedMember.id === editId) {
        setSelectedMember({...selectedMember, ...updatedMember});
      }
      setEditId(null); 
      setEditName(''); 
      setEditPoints('');
      alert('แก้ไขข้อมูลเรียบร้อยแล้ว');
    } catch (error) {
      console.error("Error updating member:", error);
      alert('เกิดข้อผิดพลาด: ' + error.message);
    }
  };

  // เปิด Modal เพิ่ม/ลดแต้ม
  const openPointModal = (member, action) => {
    setSelectedMember(member);
    setPointAction(action);
    setPointsToAdd(1);
    setPointChangeReason('');
    setShowPointModal(true);
  };

  // บันทึกการเพิ่ม/ลดแต้ม
  const handleSavePointChange = async () => {
    if (!selectedMember || !pointChangeReason) return;
    try {
      const delta = pointAction === 'add' ? Number(pointsToAdd) : -Number(pointsToAdd);
      const newPoints = Math.max(0, Number(selectedMember.points || 0) + delta);
      // สร้าง Document ID เป็น 'PH' + เลขสุ่ม 6 หลัก
      const pointDocId = `PH${Math.floor(100000 + Math.random() * 900000)}`;
      // เพิ่มประวัติแต้มใน collection PointHistory ด้วย setDoc
      await setDoc(doc(db, 'PointHistory', pointDocId), {
        userId: selectedMember.id,
        point: delta,
        type: pointAction,
        reason: pointChangeReason,
        date: new Date().toISOString()
      });
      // อัพเดตแต้มใน users
      const memberRef = doc(db, 'artifacts/login-spa-7921d/users', selectedMember.id);
      await updateDoc(memberRef, {
        points: newPoints,
        updatedAt: new Date().toISOString()
      });
      // อัพเดต state ในหน้า
      const updatedMembers = members.map(m => 
        m.id === selectedMember.id 
          ? { ...m, points: newPoints } 
          : m
      );
      setMembers(updatedMembers);
      setSelectedMember({...selectedMember, points: newPoints });
      setShowPointModal(false);
      alert(`${pointAction === 'add' ? 'เพิ่ม' : 'ลด'}แต้มเรียบร้อยแล้ว`);
    } catch (error) {
      console.error("Error updating points:", error);
      alert('เกิดข้อผิดพลาด: ' + error.message);
    }
  };

  // เลือกสมาชิกจากการค้นหา
  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setSearchTerm(member.fullname || '');
    setShowResults(false);
    setActiveSection('profile');
  };

  // คำนวณส่วนลดที่ได้รับจากแต้มปัจจุบัน
  const getCurrentDiscount = (points) => {
    const tiers = [...discountTiers].sort((a, b) => b.points - a.points);
    for (const tier of tiers) {
      if (points >= tier.points) {
        return {
          discount: tier.discount,
          color: tier.color
        };
      }
    }
    return { discount: '0%', color: '#6c757d' };
  };

  // คำนวณความก้าวหน้าไปสู่ระดับส่วนลดถัดไป
  const getNextDiscountProgress = (points) => {
    const tiers = [...discountTiers].sort((a, b) => a.points - b.points);
    for (const tier of tiers) {
      if (points < tier.points) {
        const prevTier = tiers[tiers.indexOf(tier) - 1];
        const prevPoints = prevTier ? prevTier.points : 0;
        const progress = ((points - prevPoints) / (tier.points - prevPoints)) * 100;
        
        return {
          nextDiscount: tier.discount,
          nextThreshold: tier.points,
          pointsNeeded: tier.points - points,
          progress: Math.min(Math.max(progress, 0), 100),
          color: tier.color
        };
      }
    }
    
    // ถ้าเกินทุกระดับแล้ว
    const maxTier = tiers[tiers.length - 1];
    return {
      nextDiscount: 'สูงสุดแล้ว',
      nextThreshold: maxTier.points,
      pointsNeeded: 0,
      progress: 100,
      color: maxTier.color
    };
  };

  return (
    <div className="container py-4">
      <div className="card shadow-sm border-0 mb-4" style={{ border: '2px solid #7B4019', borderRadius: '16px' }}>
        <div className="card-header py-3" style={{ background: 'linear-gradient(90deg, #a86a3d 0%, #7B4019 100%)', color: '#fff', borderTopLeftRadius: '14px', borderTopRightRadius: '14px', borderBottom: '2px solid #7B4019' }}>
          <h4 className="mb-0 fw-bold">
            <i className="fas fa-users-cog me-2" style={{ color: '#fff' }}></i>
            ระบบจัดการสมาชิก
          </h4>
        </div>
        <div className="card-body">
          {/* แถบเมนู */}
          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeSection === 'list' ? 'active' : ''}`}
                onClick={() => setActiveSection('list')}
              >
                <i className="fas fa-list me-1"></i> รายชื่อสมาชิก
              </button>
            </li>
            {selectedMember && (
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeSection === 'profile' ? 'active' : ''}`}
                  onClick={() => setActiveSection('profile')}
                >
                  <i className="fas fa-user me-1"></i> {selectedMember.name}
                </button>
              </li>
            )}
          </ul>

          {/* ส่วนค้นหาสมาชิก */}
          <div className="row mb-4">
            <div className="col-md-6 col-lg-4" ref={searchRef}>
              <div className="input-group">
                <span className="input-group-text bg-light">
                  <i className="fas fa-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ค้นหาสมาชิก..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowResults(true);
                  }}
                  onFocus={() => setShowResults(true)}
                />
                {searchTerm && (
                  <button 
                    className="btn btn-outline-secondary" 
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setShowResults(false);
                    }}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
              
              {/* ผลการค้นหา (Dropdown) */}
              {showResults && searchTerm && (
                <div className="position-absolute mt-1 w-100 shadow-sm bg-white rounded border" style={{ zIndex: 1000, maxHeight: '300px', overflowY: 'auto' }}>
                  {filteredMembers.length > 0 ? (
                    <ul className="list-group list-group-flush">
                      {filteredMembers.map(member => (
                        <li 
                          key={member.id} 
                          className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                          onClick={() => handleSelectMember(member)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div>
                            <div className="fw-bold">{member.fullname || member.name}</div>
                            {member.email && <small className="text-muted">{member.email}</small>}
                          </div>
                          <span className="badge bg-primary rounded-pill">
                            {member.points || 0} แต้ม
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-3 text-center text-muted">
                      <i className="fas fa-search me-2"></i>
                      ไม่พบสมาชิกที่ค้นหา
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* แสดงส่วนต่างๆตาม activeSection */}
          {activeSection === 'list' && (
            <>

              {/* รายชื่อสมาชิก */}
              <div className="card shadow-sm" style={{ border: '2px solid #7B4019', borderRadius: '16px' }}>
                <div className="card-header d-flex justify-content-between align-items-center" style={{ background: 'linear-gradient(90deg, #a86a3d 0%, #7B4019 100%)', color: '#fff', borderTopLeftRadius: '14px', borderTopRightRadius: '14px', borderBottom: '2px solid #7B4019' }}>
                  <h5 className="mb-0">
                    <i className="fas fa-users me-2" style={{ color: '#fff' }}></i>
                    รายชื่อสมาชิก
                  </h5>
                  <span className="badge bg-primary">{members.length} คน</span>
                </div>
                <div className="card-body p-0">
                  {loading ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">กำลังโหลด...</span>
                      </div>
                      <p className="mt-2">กำลังโหลดข้อมูล...</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>ชื่อสมาชิก</th>
                            <th>อีเมล</th>
                            <th>แต้มสะสม</th>
                            <th>ส่วนลด</th>
                            <th>จัดการ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.length === 0 && (
                            <tr>
                              <td colSpan="5" className="text-center py-4 text-muted">
                                <i className="fas fa-users-slash me-2"></i>
                                ยังไม่มีข้อมูลสมาชิก
                              </td>
                            </tr>
                          )}
                          
                          {members.map((member) => {
                            const currentDiscount = getCurrentDiscount(member.points || 0);
                            return (
                              <tr key={member.id}>
                                <td>
                                      <div className="d-flex align-items-center">
                                        <div className="me-3 bg-light rounded-circle p-2">
                                          <i className="fas fa-user text-primary"></i>
                                        </div>
                                        <div>
                                          <div className="fw-bold">{member.fullname || member.name}</div>
                                          {member.phone && <small className="text-muted">{member.phone}</small>}
                                        </div>
                                      </div>
                                    </td>
                                <td>{member.email || '-'}</td>
                                <td>
                                  <span className="badge bg-primary">{member.points || 0}</span>
                                </td>
                                <td>
                                  <span 
                                    className="badge" 
                                    style={{ backgroundColor: currentDiscount.color }}
                                  >
                                    {currentDiscount.discount}
                                  </span>
                                </td>
                                <td>
                                  <div className="btn-group btn-group-sm">
                                    <button 
                                      className="btn btn-outline-success" 
                                      onClick={() => openPointModal(member, 'add')}
                                      title="เพิ่มแต้ม"
                                    >
                                      <i className="fas fa-plus"></i>
                                    </button>
                                    <button 
                                      className="btn btn-outline-warning" 
                                      onClick={() => openPointModal(member, 'subtract')}
                                      title="ลดแต้ม"
                                      disabled={!member.points || member.points <= 0}
                                    >
                                      <i className="fas fa-minus"></i>
                                    </button>
                                    <button 
                                      className="btn btn-outline-primary" 
                                      onClick={() => {
                                        setSelectedMember(member);
                                        setActiveSection('profile');
                                      }}
                                      title="ดูรายละเอียด"
                                    >
                                      <i className="fas fa-eye"></i>
                                    </button>
                                    <button 
                                      className="btn btn-outline-secondary" 
                                      onClick={() => startEdit(member)}
                                      title="แก้ไข"
                                    >
                                      <i className="fas fa-edit"></i>
                                    </button>
                                    <button 
                                      className="btn btn-outline-danger" 
                                      onClick={() => handleDelete(member.id)}
                                      title="ลบ"
                                    >
                                      <i className="fas fa-trash"></i>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* หน้าโปรไฟล์สมาชิก */}
          {activeSection === 'profile' && selectedMember && (
            <div className="row">
              <div className="col-md-4">
                <div className="card shadow-sm mb-4" style={{ border: '2px solid #7B4019', borderRadius: '16px' }}>
                  <div className="card-body text-center py-4">
                    <div 
                      className="rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                      style={{ 
                        width: '100px', 
                        height: '100px', 
                        background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)' 
                      }}
                    >
                      <i className="fas fa-user-circle fa-4x text-primary"></i>
                    </div>
                    <h5 className="fw-bold">{selectedMember.fullname || selectedMember.name}</h5>
                    {selectedMember.email && (
                      <p className="text-muted">
                        <i className="fas fa-envelope me-2"></i>
                        {selectedMember.email}
                      </p>
                    )}
                    {selectedMember.phone && (
                      <p className="text-muted">
                        <i className="fas fa-phone me-2"></i>
                        {selectedMember.phone}
                      </p>
                    )}
                    
                    <div className="d-grid gap-2 mt-3">
                      <button 
                        className="btn btn-success" 
                        onClick={() => openPointModal(selectedMember, 'add')}
                      >
                        <i className="fas fa-plus-circle me-2"></i>
                        เพิ่มแต้ม
                      <button 
                        className={`nav-link ${activeSection === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveSection('profile')}
                      >
                        <i className="fas fa-user me-1"></i> {selectedMember.fullname || selectedMember.name}
                      </button>
                        <i className="fas fa-minus-circle me-2"></i>
                        ลดแต้ม
                      </button>
                    </div>
                  </div>
                </div>

                <div className="card shadow-sm" style={{ border: '2px solid #7B4019', borderRadius: '16px' }}>
                  <div className="card-header" style={{ background: 'linear-gradient(90deg, #a86a3d 0%, #7B4019 100%)', color: '#fff', borderTopLeftRadius: '14px', borderTopRightRadius: '14px', borderBottom: '2px solid #7B4019' }}>
                    <h5 className="mb-0">
                      <i className="fas fa-tags me-2" style={{ color: '#fff' }}></i>
                      ส่วนลดตามแต้มสะสม
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="list-group">
                      {discountTiers.map((tier, index) => (
                        <div 
                          key={index} 
                          className={`list-group-item d-flex justify-content-between align-items-center ${
                            (selectedMember.points || 0) >= tier.points ? 'list-group-item-light' : ''
                          }`}
                        >
                          <div>
                            <span 
                              className="badge me-2" 
                              style={{ backgroundColor: tier.color }}
                            >
                              {tier.discount}
                            </span>
                            ส่วนลด
                          </div>
                          <span className="badge bg-secondary">
                            {tier.points} แต้ม
                          </span>
                          {(selectedMember.points || 0) >= tier.points && (
                            <span className="text-success">
                              <i className="fas fa-check-circle"></i>
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="col-md-8">
                <div className="card shadow-sm mb-4" style={{ border: '2px solid #7B4019', borderRadius: '16px' }}>
                  <div className="card-header" style={{ background: 'linear-gradient(90deg, #a86a3d 0%, #7B4019 100%)', color: '#fff', borderTopLeftRadius: '14px', borderTopRightRadius: '14px', borderBottom: '2px solid #7B4019' }}>
                    <h5 className="mb-0">
                      <i className="fas fa-star me-2" style={{ color: '#fff' }}></i>
                      สถานะแต้มสะสม
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h3 className="mb-0 fw-bold">
                        <span 
                          className="badge rounded-pill me-2" 
                          style={{ backgroundColor: getCurrentDiscount(selectedMember.points || 0).color }}
                        >
                          {selectedMember.points || 0}
                        </span>
                        แต้ม
                      </h3>
                      <div>
                        <span 
                          className="badge rounded-pill" 
                          style={{ 
                            backgroundColor: getCurrentDiscount(selectedMember.points || 0).color,
                            fontSize: '1rem',
                            padding: '8px 15px'
                          }}
                        >
                          <i className="fas fa-tag me-1"></i>
                          ส่วนลด {getCurrentDiscount(selectedMember.points || 0).discount}
                        </span>
                      </div>
                    </div>
                    
                    {/* แสดงความก้าวหน้าไปสู่ระดับส่วนลดถัดไป */}
                    {getNextDiscountProgress(selectedMember.points || 0).pointsNeeded > 0 && (
                      <div className="mb-4">
                        <div className="d-flex justify-content-between mb-1">
                          <span>ความก้าวหน้าสู่ส่วนลดถัดไป ({getNextDiscountProgress(selectedMember.points || 0).nextDiscount})</span>
                          <span className="text-muted">
                            อีก {getNextDiscountProgress(selectedMember.points || 0).pointsNeeded} แต้ม
                          </span>
                        </div>
                        <div className="progress" style={{ height: '10px' }}>
                          <div 
                            className="progress-bar" 
                            role="progressbar" 
                            style={{ 
                              width: `${getNextDiscountProgress(selectedMember.points || 0).progress}%`,
                              backgroundColor: getNextDiscountProgress(selectedMember.points || 0).color
                            }} 
                            aria-valuenow={getNextDiscountProgress(selectedMember.points || 0).progress} 
                            aria-valuemin="0" 
                            aria-valuemax="100"
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {/* แสดงคำแนะนำว่าคงเหลือแต้มกี่แต้มจะได้ส่วนลดเท่าไร */}
                    {getNextDiscountProgress(selectedMember.points || 0).pointsNeeded > 0 ? (
                      <div className="alert alert-info">
                        <i className="fas fa-info-circle me-2"></i>
                        หากเพิ่มอีก {getNextDiscountProgress(selectedMember.points || 0).pointsNeeded} แต้ม 
                        จะได้รับส่วนลด {getNextDiscountProgress(selectedMember.points || 0).nextDiscount}
                      </div>
                    ) : (
                      <div className="alert alert-success">
                        <i className="fas fa-trophy me-2"></i>
                        คุณได้รับส่วนลดสูงสุดแล้ว! ขอบคุณที่เป็นลูกค้าประจำของเรา
                      </div>
                    )}
                  </div>
                </div>
                
                {/* ประวัติการเปลี่ยนแปลงแต้ม */}
                <div className="card shadow-sm" style={{ border: '2px solid #7B4019', borderRadius: '16px' }}>
                  <div className="card-header" style={{ background: 'linear-gradient(90deg, #a86a3d 0%, #7B4019 100%)', color: '#fff', borderTopLeftRadius: '14px', borderTopRightRadius: '14px', borderBottom: '2px solid #7B4019' }}>
                    <h5 className="mb-0">
                      <i className="fas fa-history me-2" style={{ color: '#fff' }}></i>
                      ประวัติการเปลี่ยนแปลงแต้ม
                    </h5>
                  </div>
                  <div className="card-body p-0">
                    {/* TODO: ดึงข้อมูล PointHistory จาก Firestore และแสดงในตารางนี้ */}
                    {/* ตัวอย่าง: getDocs(query(collection(db, 'PointHistory'), where('userId', '==', selectedMember.id))) */}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal เพิ่ม/ลดแต้ม */}
      {showPointModal && selectedMember && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header" style={{ 
                background: pointAction === 'add' ? 'linear-gradient(45deg, #28a745, #20c997)' : 'linear-gradient(45deg, #ffc107, #fd7e14)', 
                color: 'white' 
              }}>
                <h5 className="modal-title">
                  <i className={`fas ${pointAction === 'add' ? 'fa-plus-circle' : 'fa-minus-circle'} me-2`}></i>
                  {pointAction === 'add' ? 'เพิ่มแต้ม' : 'ลดแต้ม'}: {selectedMember.name}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowPointModal(false)}
                  style={{ filter: 'invert(1)' }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">แต้มปัจจุบัน</label>
                  <input 
                    type="text" 
                    className="form-control bg-light" 
                    value={selectedMember.points || 0} 
                    disabled 
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    {pointAction === 'add' ? 'จำนวนแต้มที่ต้องการเพิ่ม' : 'จำนวนแต้มที่ต้องการลด'}
                  </label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={pointsToAdd} 
                    onChange={e => setPointsToAdd(Math.max(1, parseInt(e.target.value) || 1))} 
                    min="1" 
                    required 
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    ผลลัพธ์
                  </label>
                  <input 
                    type="text" 
                    className="form-control bg-light fw-bold" 
                    value={`${selectedMember.points || 0} ${pointAction === 'add' ? '+' : '-'} ${pointsToAdd} = ${
                      pointAction === 'add' 
                        ? (selectedMember.points || 0) + parseInt(pointsToAdd)
                        : Math.max(0, (selectedMember.points || 0) - parseInt(pointsToAdd))
                    }`} 
                    disabled 
                  />
                </div>
                <div className="mb-0">
                  <label className="form-label">เหตุผล</label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    placeholder={
                      pointAction === 'add' 
                        ? 'เช่น: ซื้อสินค้า 1,000 บาท, โปรโมชั่นพิเศษ, ฯลฯ' 
                        : 'เช่น: แลกส่วนลด, ใช้สิทธิพิเศษ, ฯลฯ'
                    } 
                    value={pointChangeReason}
                    onChange={e => setPointChangeReason(e.target.value)}
                    required
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowPointModal(false)}
                >
                  ยกเลิก
                </button>
                <button 
                  type="button" 
                  className={`btn ${pointAction === 'add' ? 'btn-success' : 'btn-warning'}`} 
                  onClick={handleSavePointChange}
                  disabled={!pointChangeReason}
                >
                  <i className={`fas ${pointAction === 'add' ? 'fa-plus-circle' : 'fa-minus-circle'} me-2`}></i>
                  {pointAction === 'add' ? 'เพิ่มแต้ม' : 'ลดแต้ม'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MemberSettings;