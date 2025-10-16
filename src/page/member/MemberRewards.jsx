import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../Firebase';
import { collection, query, where, getDocs, getDoc, doc, updateDoc, addDoc, increment } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { FaStar, FaGift, FaArrowLeft, FaTicketAlt, FaClock } from 'react-icons/fa';
import '../../styles/SharedStyles.css';
import '../../styles/MemberRewards.css';

function MemberRewards() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [points, setPoints] = useState(0);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [redemptionSuccess, setRedemptionSuccess] = useState(false);
  const [redemptionError, setRedemptionError] = useState("");
  const [userRedemptions, setUserRedemptions] = useState([]);

  // รางวัลจาก Firestore
  const [rewards, setRewards] = useState([]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        // ดึงข้อมูลผู้ใช้จาก /artifacts/login-spa-7921d/users
        const userRef = doc(db, 'artifacts/login-spa-7921d/users', user.uid);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.exists() ? userDoc.data() : null;
        setUserName(userData?.fullname || userData?.name || user.email.split('@')[0]);

        // คำนวณแต้มจาก PointHistory เหมือนกับ DashboardMember
        const phQuery = query(collection(db, 'PointHistory'), where('userId', '==', user.uid));
        const phSnap = await getDocs(phQuery);
        const phList = phSnap.docs.map(doc => doc.data());
        
        // รวมแต้มสะสมจริงจาก PointHistory (แต้มที่ได้รับ - แต้มที่ใช้)
        const totalPoints = phList.reduce((sum, h) => {
          // ประเภท transaction ที่เป็นการเพิ่มแต้ม
          const isEarn = h.type === 'EARN' || h.type === 'earned' || h.type === 'add' || h.type === 'ADD' || h.type === 'REVIEW' || h.type === 'เพิ่มแต้ม';
          // ประเภท transaction ที่เป็นการใช้/แลกแต้ม
          const isUse = h.type === 'USE' || h.type === 'subtract' || h.type === 'SUBTRACT' || h.type === 'redeem' || h.type === 'แลกแต้ม';
          // ใช้ฟิลด์ `points` เท่านั้น
          const value = Number(h.points) || 0;
          if (isEarn) return sum + value;
          if (isUse) return sum - value;
          return sum;
        }, 0);
        setPoints(totalPoints);

        // ดึงรายการโปรโมชั่นจาก Rewards
        const rewardsSnapshot = await getDocs(collection(db, 'Rewards'));
        const rewardsList = rewardsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            description: data.description,
            pointsCost: data.pointsCost,
            type: data.type,
            value: data.value,
            validity: data.validity, // จำนวนเดือนที่มีอายุใช้งาน (เช่น 1 = 1 เดือน, 3 = 3 เดือน)
            validityText: data.validity ? `มีอายุใช้งาน ${data.validity} เดือน` : 'ไม่มีวันหมดอายุ',
            icon: data.type === 'discount'
              ? <FaTicketAlt size={24} className="reward-icon" />
              : <FaGift size={24} className="reward-icon" />
          };
        });
        setRewards(rewardsList);

        // ดึงประวัติการแลกรางวัล
        await fetchUserRedemptions();
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setLoading(false);
      }
    };
    fetchUserData();
  }, [user]);

  const fetchUserRedemptions = async () => {
    if (!user) return;
    try {
      setHistoryLoading(true);
      const redemptionsQuery = query(
        collection(db, 'Redemptions'), 
        where('userId', '==', user.uid)
      );
      const redemptionsSnapshot = await getDocs(redemptionsQuery);
      const redemptions = redemptionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        redeemedAt: doc.data().redeemedAt?.toDate() || new Date()
      }));
      // เรียงลำดับตามวันที่แลกล่าสุด
      redemptions.sort((a, b) => b.redeemedAt - a.redeemedAt);
      setUserRedemptions(redemptions);
    } catch (error) {
      console.error('Error fetching redemption history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSelectReward = (reward) => {
    setSelectedReward(reward);
    setShowConfirmModal(true);
    setRedemptionError("");
  };

  // เพิ่มฟังก์ชันสำหรับบันทึกแต้มหลังรีวิว
  const addReviewPoints = async () => {
    if (!user) return;
    try {
      // เพิ่มแต้ม 5 คะแนนให้ user
      const userRef = doc(db, 'artifacts/login-spa-7921d/users', user.uid);
      await updateDoc(userRef, {
        points: increment(5)
      });
      // เพิ่มประวัติแต้ม
      await addDoc(collection(db, 'PointHistory'), {
        userId: user.uid,
        points: 5,
        type: 'REVIEW',
        reason: 'ได้รับแต้มจากการรีวิวบริการ',
        createdAt: new Date()
      });
      setPoints(prev => prev + 5);
    } catch (error) {
      console.error('Error adding review points:', error);
    }
  };

  const handleRedeemReward = async () => {
    if (!selectedReward) return;

    if (points < selectedReward.pointsCost) {
      setRedemptionError("คะแนนสะสมไม่เพียงพอ");
      return;
    }

    setRedeemLoading(true);
    setRedemptionError("");

    try {
      // 1. ลดคะแนนสะสมใน /artifacts/login-spa-7921d/users
      const userRef = doc(db, 'artifacts/login-spa-7921d/users', user.uid);
      await updateDoc(userRef, {
        points: increment(-selectedReward.pointsCost)
      });

      // 2. บันทึกการแลกรางวัลใน Redemptions
      // คำนวณวันหมดอายุตาม validity ที่กำหนด (จำนวนเดือน)
      const validUntil = new Date();
      if (selectedReward.validity && typeof selectedReward.validity === 'number') {
        // ถ้ามีการกำหนด validity เป็นจำนวนเดือน
        validUntil.setMonth(validUntil.getMonth() + selectedReward.validity);
      } else {
        // กรณีไม่กำหนด validity กำหนดเป็น 100 ปี (ไม่มีวันหมดอายุ)
        validUntil.setFullYear(validUntil.getFullYear() + 100);
      }

      const redemptionData = {
        userId: user.uid,
        rewardId: selectedReward.id,
        rewardName: selectedReward.name,
        rewardType: selectedReward.type,
        rewardValue: selectedReward.value,
        pointsUsed: selectedReward.pointsCost,
        redeemedAt: new Date(),
        validUntil: validUntil,
        status: 'active',
        used: false
      };
      const redemptionRef = await addDoc(collection(db, 'Redemptions'), redemptionData);

      // 3. เพิ่มประวัติการใช้แต้มใน PointHistory
      await addDoc(collection(db, 'PointHistory'), {
        userId: user.uid,
        points: selectedReward.pointsCost,
        type: 'USE',
        reason: `แลกรางวัล: ${selectedReward.name}`,
        createdAt: new Date(),
        rewardId: selectedReward.id
      });

      // อัพเดตสถานะการแลกรางวัล
      setPoints(prev => prev - selectedReward.pointsCost);
      setRedemptionSuccess(true);
      
      // ดึงข้อมูลประวัติการแลกรางวัลล่าสุด
      await fetchUserRedemptions();

      // ปิดโมดัล
      setTimeout(() => {
        setShowConfirmModal(false);
        setRedemptionSuccess(false);
        setSelectedReward(null);
      }, 3000);
    } catch (error) {
      console.error('Error redeeming reward:', error);
      setRedemptionError("เกิดข้อผิดพลาดในการแลกรางวัล กรุณาลองอีกครั้ง");
    }

    setRedeemLoading(false);
  };


  // ฟังก์ชันแปลงวันที่ (timestamp/Date/Firestore) เป็น string ไทย
  const formatDate = (date) => {
    if (!date) return '-';
    let d = date;
    if (typeof d?.toDate === 'function') d = d.toDate();
    else if (typeof d === 'string' || typeof d === 'number') d = new Date(d);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // ฟังก์ชันคำนวณสถานะรางวัล
  const getRedemptionStatus = (redemption) => {
    const now = new Date();
    let validUntil = redemption.validUntil;
    if (typeof validUntil?.toDate === 'function') validUntil = validUntil.toDate();
    else if (typeof validUntil === 'string' || typeof validUntil === 'number') validUntil = new Date(validUntil);
    if (redemption.used) return { label: 'ใช้งานแล้ว', color: 'secondary' };
    if (validUntil && now > validUntil) return { label: 'หมดอายุ', color: 'danger' };
    return { label: 'ใช้งานได้', color: 'success' };
  };

  if (loading) {
    return (
      <div className="page-container text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">กำลังโหลด...</span>
        </div>
        <p className="mt-3">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="rewards-container container py-4">
      {/* Header */}
      <div className="rewards-header mb-4" style={{ position: 'relative' }}>
        <div className="d-flex align-items-center" style={{ width: '100%' }}>
          <button 
            className="btn me-3 d-flex align-items-center justify-content-center"
            onClick={() => navigate('/member/DashboardMember')}
            style={{ 
              width: '45px', 
              height: '45px', 
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(5px)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white'
            }}
          >
            <FaArrowLeft />
          </button>
          <div>
            <h2 className="mb-0" style={{ color: 'white', fontWeight: '600' }}>แลกรางวัล</h2>
            <p className="mb-0" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
              เลือกรางวัลที่คุณต้องการ
            </p>
          </div>
          <div style={{ flexGrow: 1 }} />
          {/* แต้มสะสมของฉัน - ขวาสุดใน rewards-header */}
          <div className="points-display" style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.15)',
            padding: '10px 18px',
            borderRadius: '50px',
            boxShadow: '0 2px 8px rgba(123,64,25,0.08)',
            border: '1px solid rgba(255,255,255,0.18)',
            position: 'absolute',
            top: 20,
            right: 30,
            zIndex: 2
          }}>
            <FaStar className="points-icon" />
            <span className="points-count">{points}</span>
            <span className="points-label">แต้มสะสมของฉัน</span>
          </div>
        </div>
      </div>
      
      {/* ส่วนแสดงรางวัลที่สามารถแลกได้ */}
      <div className="rewards-section mb-5">
        <h4 className="section-title mb-3">รางวัลที่สามารถแลกได้</h4>
        
        {rewards.length === 0 ? (
          <div className="card border-0 shadow-sm p-5 text-center">
            <div className="py-4">
              <FaGift size={48} className="text-muted mb-3" />
              <h4 className="mb-3">ยังไม่มีรางวัลที่สามารถแลกได้</h4>
              <p className="text-muted">ทางร้านยังไม่ได้เพิ่มรางวัลสำหรับแลกแต้ม กรุณาติดตามอีกครั้งในภายหลัง</p>
            </div>
          </div>
        ) : (
          <div className="row g-4">
            {rewards.map(reward => (
            <div key={reward.id} className="col-md-4">
              <div 
                className="reward-card h-100" 
                onClick={() => points >= reward.pointsCost && handleSelectReward(reward)}
                style={{
                  background: 'white',
                  borderRadius: '20px',
                  boxShadow: '0 10px 20px rgba(0,0,0,0.05)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  transition: 'all 0.3s ease',
                  cursor: points >= reward.pointsCost ? 'pointer' : 'default',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div className="card-body p-4">
                  <div className="position-relative mb-4" style={{ 
                    background: 'linear-gradient(135deg, #f6f8fa, #f1f4f6)',
                    borderRadius: '15px',
                    padding: '20px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '2rem', color: '#3498db', marginBottom: '10px' }}>
                      {reward.icon}
                    </div>
                    <h5 className="card-title mb-0" style={{ 
                      color: '#2c3e50',
                      fontSize: '1.2rem',
                      fontWeight: '600'
                    }}>{reward.name}</h5>
                  </div>
                  
                  <p className="card-text mb-2" style={{ 
                    color: '#666',
                    fontSize: '0.9rem',
                    minHeight: '60px'
                  }}>{reward.description}</p>
                  
                  <div className="validity-info mb-3" style={{
                    background: 'rgba(52, 152, 219, 0.1)', 
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.85rem'
                  }}>
                    <FaClock style={{ color: '#3498db', marginRight: '8px' }} />
                    <span style={{ color: '#2980b9' }}>{reward.validityText}</span>
                  </div>
                  
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="reward-points d-flex align-items-center" style={{
                      background: '#f8f9fa',
                      padding: '8px 15px',
                      borderRadius: '12px'
                    }}>
                      <FaStar style={{ color: '#ffd700', marginRight: '8px' }} />
                      <span style={{ fontWeight: '600', color: '#2c3e50' }}>{reward.pointsCost} แต้ม</span>
                    </div>
                    {points < reward.pointsCost && (
                      <small className="text-danger" style={{ fontWeight: '500' }}>
                        ขาดอีก {reward.pointsCost - points} แต้ม
                      </small>
                    )}
                  </div>

                  {points < reward.pointsCost && (
                    <div className="progress" style={{ 
                      height: '8px',
                      backgroundColor: '#f1f4f6',
                      borderRadius: '4px',
                      marginBottom: '15px'
                    }}>
                      <div 
                        className="progress-bar" 
                        style={{ 
                          width: `${Math.min(100, (points / reward.pointsCost) * 100)}%`,
                          background: 'linear-gradient(to right, #3498db, #2980b9)',
                          borderRadius: '4px',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  )}

                  <button 
                    className="btn w-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (points >= reward.pointsCost) handleSelectReward(reward);
                    }}
                    disabled={points < reward.pointsCost}
                    style={{
                      background: points >= reward.pointsCost ? 'linear-gradient(135deg, #7B4019)' : '#f1f4f6',
                      color: points >= reward.pointsCost ? 'white' : '#999',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '12px',
                      fontWeight: '600',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {points >= reward.pointsCost ? 'แลกรางวัล' : 'แต้มไม่พอ'}
                  </button>
                </div>
              </div>
            </div>
            ))}
          </div>
        )}
      </div>      {/* ส่วนแสดงประวัติการแลกรางวัล */}
      <div className="redemption-history">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="section-title mb-0">ประวัติการแลกรางวัล</h4>
          <div className="d-flex align-items-center">
            {historyLoading ? (
              <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                <span className="visually-hidden">กำลังโหลด...</span>
              </div>
            ) : (
              <button 
                className="btn btn-sm btn-outline-primary" 
                onClick={fetchUserRedemptions}
                disabled={historyLoading}
              >
                <i className="fas fa-sync-alt me-1"></i> รีเฟรช
              </button>
            )}
          </div>
        </div>
        
        {userRedemptions.length === 0 ? (
          <div className="text-center py-4 bg-light rounded">
            <FaGift size={48} className="text-muted mb-3" />
            <p className="text-muted">ยังไม่มีประวัติการแลกรางวัล</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead className="table-light">
                <tr>
                  <th>รางวัล</th>
                  <th>คะแนนที่ใช้</th>
                  <th>วันที่แลก</th>
                  <th>วันหมดอายุ</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {userRedemptions.map(redemption => {
                  const status = getRedemptionStatus(redemption);
                  return (
                    <tr key={redemption.id}>
                      <td>{redemption.rewardName}</td>
                      <td>{redemption.pointsUsed} แต้ม</td>
                      <td>{formatDate(redemption.redeemedAt)}</td>
                      <td>{formatDate(redemption.validUntil)}</td>
                      <td>
                        <span className={`badge bg-${status.color}`}>{status.label}</span>
                        {status.label === 'ใช้งานได้' && (
                          <small className="d-block text-muted mt-1">
                            <FaClock className="me-1" size={12} />
                            {redemption.validUntil ? `หมดอายุ: ${formatDate(redemption.validUntil)}` : 'ไม่มีวันหมดอายุ'}
                          </small>
                        )}
                        {status.label === 'หมดอายุ' && (
                          <small className="d-block text-danger mt-1">
                            <FaClock className="me-1" size={12} />
                            หมดอายุแล้ว
                          </small>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* โมดัลยืนยันการแลกรางวัล */}
      {showConfirmModal && selectedReward && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050
        }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{
              borderRadius: '20px',
              border: 'none',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              background: '#fff' // สีขาวทึบ
            }}>
            {redemptionSuccess ? (
                <div className="modal-body text-center p-5">
                  <div className="success-icon mb-4" style={{
                    background: 'linear-gradient(135deg, #2ecc71, #27ae60)',
                    borderRadius: '50%',
                    width: '100px',
                    height: '100px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    boxShadow: '0 10px 20px rgba(46, 204, 113, 0.3)'
                  }}>
                    <i className="fas fa-check text-white" style={{ fontSize: '3rem' }}></i>
                  </div>
                  <h3 className="mb-3" style={{ color: '#2c3e50', fontWeight: '600' }}>แลกรางวัลสำเร็จ!</h3>
                  <p className="text-muted mb-4">คุณได้แลก "{selectedReward.name}" เรียบร้อยแล้ว</p>
                  <div className="points-summary p-3 mb-4" style={{
                    background: '#f8f9fa',
                    borderRadius: '15px'
                  }}>
                    <h5 className="mb-3" style={{ color: '#2c3e50' }}>คะแนนคงเหลือ</h5>
                    <div className="d-flex align-items-center justify-content-center">
                      <FaStar style={{ color: '#ffd700', fontSize: '1.5rem', marginRight: '10px' }} />
                      <span style={{ fontSize: '2rem', fontWeight: '700', color: '#2c3e50' }}>{points}</span>
                      <span style={{ marginLeft: '5px', color: '#666' }}>แต้ม</span>
                    </div>
                  </div>
                  <p className="text-muted mb-4">
                    <i className="fas fa-info-circle me-2"></i>
                    คุณสามารถดูรางวัลของคุณได้ที่ประวัติการแลกรางวัล
                  </p>
                </div>
              ) : (
                <>
                  <div className="modal-header" style={{
                    background: 'linear-gradient(135deg,  #FF7D29, #7B4019)',
                    border: 'none',
                    padding: '20px'
                  }}>
                    <h5 className="modal-title" style={{ color: 'white', fontWeight: '600' }}>
                      <i className="fas fa-gift me-2"></i>
                      ยืนยันการแลกรางวัล
                    </h5>
                    <button 
                      type="button" 
                      className="btn-close btn-close-white"
                      onClick={() => {
                        if (!redeemLoading) setShowConfirmModal(false);
                      }}
                      disabled={redeemLoading}
                    ></button>
                  </div>
                  
                  <div className="modal-body p-4">
                    <div className="reward-preview p-3 mb-4" style={{
                      background: '#f8f9fa',
                      borderRadius: '15px',
                      border: '1px solid rgba(0,0,0,0.05)'
                    }}>
                      <div className="d-flex align-items-center mb-3">
                        {selectedReward.icon}
                        <div className="ms-3">
                          <h4 style={{ 
                            color: '#2c3e50',
                            fontWeight: '600',
                            fontSize: '1.25rem',
                            marginBottom: '5px'
                          }}>{selectedReward.name}</h4>
                          <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                            {selectedReward.description}
                          </p>
                          <div className="mt-2" style={{ fontSize: '0.85rem', color: '#3498db' }}>
                            <FaClock style={{ marginRight: '5px' }} />
                            {selectedReward.validityText}
                          </div>
                        </div>
                      </div>
                      <div className="d-flex align-items-center" style={{
                        background: 'white',
                        padding: '10px 15px',
                        borderRadius: '10px'
                      }}>
                        <FaStar style={{ color: '#ffd700', marginRight: '10px' }} />
                        <span style={{ fontWeight: '600', color: '#2c3e50' }}>
                          {selectedReward.pointsCost} แต้ม
                        </span>
                      </div>
                    </div>
                    
                    <div className="points-calculation p-3" style={{
                      background: '#f8f9fa',
                      borderRadius: '15px',
                      border: '1px solid rgba(0,0,0,0.05)'
                    }}>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <span style={{ color: '#666' }}>แต้มสะสมของคุณ</span>
                        <span style={{ color: '#2c3e50', fontWeight: '600' }}>{points} แต้ม</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <span style={{ color: '#666' }}>แต้มที่ใช้</span>
                        <span style={{ color: '#e74c3c', fontWeight: '600' }}>-{selectedReward.pointsCost} แต้ม</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center pt-2" style={{
                        borderTop: '1px dashed #dee2e6'
                      }}>
                        <span style={{ color: '#2c3e50', fontWeight: '600' }}>คงเหลือ</span>
                        <span style={{ 
                          color: '#27ae60',
                          fontWeight: '700',
                          fontSize: '1.2rem'
                        }}>{points - selectedReward.pointsCost} แต้ม</span>
                      </div>
                    </div>
                    
                    {redemptionError && (
                      <div className="alert alert-danger mt-3 mb-0" style={{
                        borderRadius: '10px',
                        border: 'none',
                        background: 'rgba(231, 76, 60, 0.1)',
                        color: '#e74c3c'
                      }}>
                        <i className="fas fa-exclamation-circle me-2"></i>
                        {redemptionError}
                      </div>
                    )}
                  </div>
                  
                  <div className="modal-footer" style={{
                    border: 'none',
                    padding: '20px',
                    background: '#f8f9fa'
                  }}>
                    <button 
                      type="button" 
                      className="btn btn-light"
                      onClick={() => setShowConfirmModal(false)}
                      disabled={redeemLoading}
                      style={{
                        borderRadius: '12px',
                        padding: '10px 20px',
                        fontWeight: '500'
                      }}
                    >
                      ยกเลิก
                    </button>
                    <button 
                      type="button" 
                      className="btn"
                      onClick={handleRedeemReward}
                      disabled={redeemLoading || points < selectedReward.pointsCost}
                      style={{
                        background: 'linear-gradient(135deg, #7B4019)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '10px 25px',
                        fontWeight: '600'
                      }}
                    >
                      {redeemLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          กำลังดำเนินการ...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-check me-2"></i>
                          ยืนยันการแลก
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MemberRewards;
