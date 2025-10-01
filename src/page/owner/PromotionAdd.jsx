  import React, { useState, useEffect } from 'react';
  import { db } from '../../Firebase';
  import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';

// Custom CSS for the component
const cardStyles = {
  promotionCard: {
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    cursor: 'pointer',
  },
  cardHover: {
    transform: 'translateY(-5px)',
    boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
  },
  discountHeader: {
    background: 'linear-gradient(90deg, #b97b3e 0%, #7B4019 100%)',
    borderBottom: '2px solid #7B4019',
    color: '#fff'
  },
  freeServiceHeader: {
    background: 'linear-gradient(90deg, #b97b3e 0%, #7B4019 100%)',
    borderBottom: '2px solid #7B4019',
    color: '#fff'
  },
  pointsBadge: {
    fontSize: '0.85rem',
    padding: '0.4rem 0.6rem'
  }
};

function PromotionAdd() {
  // State สำหรับแก้ไขคูปอง
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ name: '', description: '', pointsCost: 0, type: 'discount', value: '', validity: 30 });

  // ฟังก์ชันเริ่มแก้ไขคูปอง
  const startEdit = (promotion) => {
    setEditId(promotion.id || promotion.uid);
    setEditData({
      name: promotion.name,
      description: promotion.description,
      pointsCost: promotion.pointsCost,
      type: promotion.type,
      value: promotion.value,
      validity: promotion.validity
    });
    setShowAddForm(true);
  };

  // ฟังก์ชันบันทึกการแก้ไขคูปอง
  const handleEdit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { updateDoc, doc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'Rewards', editId), {
        name: editData.name,
        description: editData.description,
        pointsCost: Number(editData.pointsCost),
        type: editData.type,
        value: editData.value,
        validity: Number(editData.validity)
      });
      setSuccess('แก้ไขโปรโมชั่นสำเร็จ');
      setEditId(null);
      setEditData({ name: '', description: '', pointsCost: 0, type: 'discount', value: '', validity: 30 });
      fetchPromotions();
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการแก้ไข');
    }
    setLoading(false);
  };

  // ฟังก์ชันลบคูปอง
  const handleDelete = async (id) => {
    if (!window.confirm('ต้องการลบโปรโมชั่นนี้ใช่หรือไม่?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'Rewards', id));
      setSuccess('ลบโปรโมชั่นสำเร็จ');
      fetchPromotions();
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการลบ');
    }
    setLoading(false);
  };
  const [showAddForm, setShowAddForm] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pointsCost, setPointsCost] = useState(0);
  const [type, setType] = useState('discount');
  const [value, setValue] = useState('');
  const [validity, setValidity] = useState(30);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [promotions, setPromotions] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [filter, setFilter] = useState('all');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      const rewardId = `Rew${randomNum}`;
      const { setDoc, doc } = await import('firebase/firestore');
      await setDoc(doc(db, 'Rewards', rewardId), {
        uid: rewardId,
        name,
        description,
        pointsCost: Number(pointsCost),
        type,
        value,
        validity: Number(validity),
        createdAt: new Date()
      });
      setSuccess('เพิ่มโปรโมชั่นสำเร็จ');
      setName('');
      setDescription('');
      setPointsCost(0);
      setType('discount');
      setValue('');
      setValidity(30);
      // Fetch updated promotions
      fetchPromotions();
    } catch (err) {
      setError('เกิดข้อผิดพลาด');
    }
    setLoading(false);
  };

  const fetchPromotions = async () => {
    setFetchLoading(true);
    try {
      const promotionsQuery = query(collection(db, 'Rewards'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(promotionsQuery);
      const promotionsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPromotions(promotionsList);
    } catch (err) {
      console.error('Error fetching promotions:', err);
    }
    setFetchLoading(false);
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>เพิ่มโปรโมชั่นใหม่</h2>
        <button
          type="button"
          className="btn btn-lg btn-brown d-flex align-items-center px-4 py-2"
          style={{ background: '#7c4d1e', color: '#fff', borderRadius: '8px', fontWeight: 'bold', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <i className={`fas ${showAddForm ? 'fa-minus' : 'fa-plus'} me-2`}></i> {showAddForm ? 'ปิดฟอร์มเพิ่มโปรโมชั่น' : 'เพิ่มโปรโมชั่นใหม่'}
        </button>
      </div>
      <div className={`collapse ${showAddForm ? 'show' : ''}`} id="addPromotionForm">
        <form onSubmit={editId ? handleEdit : handleSubmit}>
          <div className="mb-3">
            <label>ชื่อโปรโมชั่น</label>
            <input type="text" className="form-control" value={editId ? editData.name : name} onChange={e => editId ? setEditData({ ...editData, name: e.target.value }) : setName(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label>รายละเอียด</label>
            <input type="text" className="form-control" value={editId ? editData.description : description} onChange={e => editId ? setEditData({ ...editData, description: e.target.value }) : setDescription(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label>คะแนนที่ใช้</label>
            <input type="number" className="form-control" value={editId ? editData.pointsCost : pointsCost} onChange={e => editId ? setEditData({ ...editData, pointsCost: e.target.value }) : setPointsCost(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label>ประเภท</label>
            <select className="form-control" value={editId ? editData.type : type} onChange={e => editId ? setEditData({ ...editData, type: e.target.value }) : setType(e.target.value)}>
              <option value="discount">ส่วนลด</option>
              <option value="freeService">บริการฟรี</option>
            </select>
          </div>
          <div className="mb-3">
            <label>มูลค่า (เช่น 10% หรือ "นวด 30 นาที")</label>
            <input type="text" className="form-control" value={editId ? editData.value : value} onChange={e => editId ? setEditData({ ...editData, value: e.target.value }) : setValue(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label>วันหมดอายุ (วัน)</label>
            <input type="number" className="form-control" value={editId ? editData.validity : validity} onChange={e => editId ? setEditData({ ...editData, validity: e.target.value }) : setValidity(e.target.value)} required />
          </div>
          <div className="d-flex justify-content-end gap-2">
            {editId && <button type="button" className="btn btn-secondary" onClick={() => { setEditId(null); setEditData({ name: '', description: '', pointsCost: 0, type: 'discount', value: '', validity: 30 }); }}>ยกเลิก</button>}
            <button type="submit" className={`btn ${editId ? 'btn-warning' : 'btn-primary'}`} disabled={loading}>
              <i className={`fas ${editId ? 'fa-save' : 'fa-plus'} me-2`}></i>
              {loading ? 'กำลังบันทึก...' : editId ? 'บันทึกการแก้ไข' : 'เพิ่มโปรโมชั่น'}
            </button>
          </div>
          {success && <div className="alert alert-success mt-3">{success}</div>}
          {error && <div className="alert alert-danger mt-3">{error}</div>}
        </form>
      </div>

      <div className="mt-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h3>โปรโมชั่นที่มีอยู่</h3>
            {!fetchLoading && promotions.length > 0 && (
              <span className="text-muted">ทั้งหมด {promotions.length} รายการ</span>
            )}
          </div>
          <button 
            className="btn btn-outline-primary" 
            onClick={fetchPromotions} 
            disabled={fetchLoading}
          >
            <i className="fas fa-sync-alt me-2"></i>
            {fetchLoading ? 'กำลังโหลด...' : 'รีเฟรช'}
          </button>
        </div>
        
        {!fetchLoading && promotions.length > 0 && (
          <div className="mb-3">
            <div className="btn-group" role="group" aria-label="Filter promotions">
              <button 
                type="button" 
                className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilter('all')}
              >
                ทั้งหมด
              </button>
              <button 
                type="button" 
                className={`btn ${filter === 'discount' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilter('discount')}
              >
                <i className="fas fa-percent me-1"></i> ส่วนลด
              </button>
              <button 
                type="button" 
                className={`btn ${filter === 'freeService' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilter('freeService')}
              >
                <i className="fas fa-gift me-1"></i> บริการฟรี
              </button>
            </div>
          </div>
        )}
        
        {fetchLoading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : promotions.length === 0 ? (
          <div className="card border-0 shadow-sm p-5 text-center">
            <div className="py-4">
              <i className="fas fa-gift fa-4x mb-3" style={{ color: '#6c757d' }}></i>
              <h4>ยังไม่มีโปรโมชั่น</h4>
              <p className="text-muted">คุณสามารถเพิ่มโปรโมชั่นใหม่ได้โดยใช้แบบฟอร์มด้านบน</p>
            </div>
          </div>
        ) : (
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 mt-2">
            {promotions
              .filter(promo => filter === 'all' || promo.type === filter)
              .map(promotion => (
              <div className="col" key={promotion.id || promotion.uid}>
                <div 
                  className="card h-100 shadow-sm" 
                  style={{
                    ...cardStyles.promotionCard,
                    ...(hoveredCardId === (promotion.id || promotion.uid) ? cardStyles.cardHover : {})
                  }}
                  onMouseEnter={() => setHoveredCardId(promotion.id || promotion.uid)}
                  onMouseLeave={() => setHoveredCardId(null)}
                >
                  <div className="card-header" style={promotion.type === 'discount' ? cardStyles.discountHeader : cardStyles.freeServiceHeader}>
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="card-title mb-0">{promotion.name}</h5>
                      <span className="badge bg-primary rounded-pill" style={cardStyles.pointsBadge}>
                        {promotion.pointsCost} แต้ม
                      </span>
                    </div>
                  </div>
                  <div className="card-body">
                    <p className="card-text">{promotion.description}</p>
                    <div className="d-flex justify-content-between flex-wrap mt-2">
                      <div className="mb-2">
                        <span className="badge bg-light text-dark p-2 me-1">
                          <i className={`fas ${promotion.type === 'discount' ? 'fa-percent' : 'fa-gift'} me-1`}></i>
                          {promotion.type === 'discount' ? 'ส่วนลด' : 'บริการฟรี'}
                        </span>
                      </div>
                      <div className="mb-2">
                        <span className="badge bg-info text-dark p-2">
                          <i className="fas fa-tag me-1"></i>
                          {promotion.value}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="badge bg-secondary p-2">
                        <i className="fas fa-calendar-alt me-1"></i>
                        อายุการใช้งาน: {promotion.validity} วัน
                      </span>
                    </div>
                  </div>
                  <div className="card-footer text-muted d-flex justify-content-between align-items-center">
                    <small>
                      <i className="fas fa-clock me-1"></i>
                      สร้างเมื่อ: {promotion.createdAt instanceof Date ? 
                        promotion.createdAt.toLocaleDateString('th-TH') : 
                        (promotion.createdAt && promotion.createdAt.seconds) ? 
                        new Date(promotion.createdAt.seconds * 1000).toLocaleDateString('th-TH') : 
                        'ไม่ระบุ'}
                    </small>
                    <div className="d-flex gap-2">
                      <button className="btn btn-sm btn-warning" onClick={() => startEdit(promotion)}>
                        <i className="fas fa-edit me-1"></i> แก้ไข
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(promotion.id || promotion.uid)}>
                        <i className="fas fa-trash-alt me-1"></i> ลบ
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
  );
}

export default PromotionAdd;