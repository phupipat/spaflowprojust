import React, { useState, useEffect } from 'react';
import { db } from '../../Firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

function ServiceManager() {
  const [services, setServices] = useState([]);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ name: '', duration: '', price: '', description: '', imageUrl: '', type: '' });
  const [loading, setLoading] = useState(true);
  const [serviceId, setServiceId] = useState('');
  const [type, setType] = useState('MASSAGE');
  const [showAddForm, setShowAddForm] = useState(false);
  const [sortBy, setSortBy] = useState('id'); // เพิ่ม state สำหรับการจัดเรียง
  const [sortOrder, setSortOrder] = useState('asc'); // เพิ่ม state สำหรับลำดับการจัดเรียง (asc/desc)

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      const snap = await getDocs(collection(db, 'Services'));
      const servicesData = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id, // ตอนนี้ doc.id คือ serviceId ที่เรากำหนดเอง
          ...data,
          createdAt: data.createdAt ? data.createdAt.toDate() : null
        };
      });
      
      // จัดเรียงข้อมูลตาม sortBy และ sortOrder
      const sortedServices = sortServices(servicesData, sortBy, sortOrder);
      setServices(sortedServices);
      setLoading(false);
    };
    fetchServices();
  }, [sortBy, sortOrder]); // เพิ่ม dependencies สำหรับการจัดเรียง

  // ฟังก์ชันสำหรับจัดเรียงข้อมูล
  const sortServices = (servicesArray, sortField, order) => {
    return [...servicesArray].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // แปลงเป็นตัวเลขสำหรับ duration
      if (sortField === 'duration') {
        aValue = parseInt(aValue) || 0;
        bValue = parseInt(bValue) || 0;
      }
      
      // แปลงเป็นตัวพิมพ์เล็กสำหรับ string เพื่อการเปรียบเทียบที่ไม่คำนึงถึงตัวพิมพ์
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (order === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  };

  // ฟังก์ชันสำหรับเปลี่ยนการจัดเรียง
  const handleSortChange = (field) => {
    if (sortBy === field) {
      // ถ้าเป็นฟิลด์เดียวกัน ให้เปลี่ยนลำดับ
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // ถ้าเป็นฟิลด์ใหม่ ให้เริ่มต้นด้วย asc
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // อัปโหลดรูปภาพไป Firebase Storage และคืน URL
  const uploadImage = async (file) => {
    if (!file) return '';
    const storage = getStorage();
    const storageRef = ref(storage, `service-images/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  // เพิ่มบริการใหม่
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!serviceId || !name || !duration || !price || !description) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    let url = '';
    try {
      if (image) url = await uploadImage(image);
      const newService = {
        name,
        duration,
        price,
        description,
        type,
        imageUrl: url,
        createdAt: new Date()
      };
      
      // ใช้ setDoc พร้อมกับ serviceId เป็น Document ID
      await setDoc(doc(db, 'Services', serviceId), newService);
      
      // เพิ่มเข้า state โดยใช้ serviceId เป็น id (แทน docRef.id)
      const createdAtJS = newService.createdAt;
      const updatedServices = [...services, { id: serviceId, ...newService, createdAt: createdAtJS }];
      
      // จัดเรียงข้อมูลใหม่หลังจากเพิ่ม
      const sortedServices = sortServices(updatedServices, sortBy, sortOrder);
      setServices(sortedServices);
      
      // รีเซ็ตฟอร์มหลังจากเพิ่มบริการ
      setServiceId('');
      setName('');
      setDuration('');
      setPrice('');
      setDescription('');
      setType('MASSAGE');
      setImage(null);
      
      // ปิด form หลังจากเพิ่ม โดยใช้ state
      setShowAddForm(false);
    } catch (err) {
      console.error('เกิดข้อผิดพลาดในการเพิ่มบริการ:', err);
      alert('เกิดข้อผิดพลาดในการเพิ่มบริการ กรุณาลองใหม่');
    }
  };

  // ลบบริการ
  const handleDelete = async (id) => {
    // ใช้ id ที่เป็น serviceId เดียวกัน
    await deleteDoc(doc(db, 'Services', id));
    setServices(services.filter(s => s.id !== id));
  };

  // เริ่มแก้ไข
  const startEdit = (s) => {
    setEditId(s.id);
    setEditData({
      name: s.name,
      duration: s.duration,
      price: s.price,
      description: s.description,
      type: s.type || 'MASSAGE',
      imageUrl: s.imageUrl || ''
    });
    
    // เปิด form เมื่อกดแก้ไข โดยใช้ state
    setShowAddForm(true);
  };

  // บันทึกการแก้ไข
  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      let url = editData.imageUrl;
      if (editData.image instanceof File) {
        url = await uploadImage(editData.image);
      }
      const updatedService = {
        name: editData.name,
        duration: editData.duration,
        price: editData.price,
        description: editData.description,
        type: editData.type,
        imageUrl: url,
        updatedAt: new Date()
      };
      await updateDoc(doc(db, 'Services', editId), updatedService);
      const updatedServices = services.map(s => 
        s.id === editId ? { ...s, ...updatedService, imageUrl: url } : s
      );
      // จัดเรียงข้อมูลใหม่หลังจากแก้ไข
      const sortedServices = sortServices(updatedServices, sortBy, sortOrder);
      setServices(sortedServices);
      setEditId(null);
      setEditData({ name: '', duration: '', price: '', description: '', type: 'MASSAGE', imageUrl: '' });
      
      // ปิด form หลังจากบันทึก โดยใช้ state
      setShowAddForm(false);
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการแก้ไขบริการ:', error);
      alert('เกิดข้อผิดพลาดในการแก้ไขบริการ กรุณาลองใหม่');
    }
  };

  return (
    <div className="card p-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">
          <i className="fas fa-spa me-2 text-primary"></i>
          จัดการบริการนวด
        </h4>
        <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          <i className="fas fa-plus me-1"></i> เพิ่มบริการใหม่
        </button>
      </div>
      <div className={`collapse ${showAddForm ? 'show' : ''}`} id="addServiceForm">
      <div className="card mb-4 bg-light">
        <div className="card-body">
          <form className="row g-3" onSubmit={editId ? handleEdit : handleAdd}>
            <div className="col-md-3">
              <label className="form-label">รหัสบริการ</label>
              <input type="text" className="form-control" placeholder="Service ID" value={editId ? editId : serviceId} onChange={e => setServiceId(e.target.value)} required disabled={!!editId} />
            </div>
        <div className="col-md-3">
              <label className="form-label">ชื่อบริการ</label>
              <input type="text" className="form-control" placeholder="ชื่อบริการ" value={editId ? editData.name : name} onChange={e => editId ? setEditData({ ...editData, name: e.target.value }) : setName(e.target.value)} required />
            </div>
            <div className="col-md-3">
              <label className="form-label">ประเภทบริการ</label>
              <select className="form-select" value={editId ? editData.type : type} onChange={e => editId ? setEditData({ ...editData, type: e.target.value }) : setType(e.target.value)} required>
                <option value="MASSAGE">MASSAGE</option>
                <option value="AROMA MASSAGE">AROMA MASSAGE</option>
                <option value="SPA">SPA</option>
                <option value="ONSEN">ONSEN</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">ระยะเวลา (นาที)</label>
              <input type="number" className="form-control" placeholder="นาที" value={editId ? editData.duration : duration} onChange={e => editId ? setEditData({ ...editData, duration: e.target.value }) : setDuration(e.target.value)} required min="1" />
            </div>
            <div className="col-md-2">
              <label className="form-label">ราคา (บาท)</label>
              <input type="number" className="form-control" placeholder="บาท" value={editId ? editData.price : price} onChange={e => editId ? setEditData({ ...editData, price: e.target.value }) : setPrice(e.target.value)} required min="0" />
            </div>
            <div className="col-12">
              <label className="form-label">คำอธิบายบริการ</label>
              <textarea className="form-control" rows="2" placeholder="รายละเอียดบริการ" value={editId ? editData.description : description} onChange={e => editId ? setEditData({ ...editData, description: e.target.value }) : setDescription(e.target.value)} required />
            </div>
            <div className="col-md-6">
              <label className="form-label">รูปภาพบริการ</label>
              <input type="file" className="form-control" accept="image/*" onChange={e => editId ? setEditData({ ...editData, image: e.target.files[0] }) : setImage(e.target.files[0])} />
              {editId && editData.imageUrl && (
                <div className="mt-2">
                  <img src={editData.imageUrl} alt="service" className="img-thumbnail" style={{ height: 100, objectFit: 'cover' }} />
                </div>
              )}
            </div>
            <div className="col-12">
              <div className="d-flex justify-content-end gap-2 mt-3">
                {editId && <button type="button" className="btn btn-secondary" onClick={() => setEditId(null)}>ยกเลิก</button>}
                <button type="submit" className={`btn ${editId ? 'btn-warning' : 'btn-success'}`}>
                  <i className={`fas ${editId ? 'fa-save' : 'fa-plus'} me-1`}></i>
                  {editId ? 'บันทึกการแก้ไข' : 'เพิ่มบริการ'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">รายการบริการ</h5>
        <div className="d-flex gap-2 align-items-center">
          {/* เพิ่มปุ่มจัดเรียง */}
          <div className="btn-group" role="group" aria-label="Sort options">
            <button 
              type="button" 
              className={`btn btn-sm ${sortBy === 'id' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleSortChange('id')}
            >
              รหัสบริการ {sortBy === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              type="button" 
              className={`btn btn-sm ${sortBy === 'name' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleSortChange('name')}
            >
              ชื่อบริการ {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              type="button" 
              className={`btn btn-sm ${sortBy === 'duration' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleSortChange('duration')}
            >
              ระยะเวลา {sortBy === 'duration' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
          
          <select className="form-select form-select-sm" style={{ width: 'auto' }} onChange={(e) => handleSortChange('type')}>
            <option value="">ประเภทบริการ</option>
            <option value="MASSAGE">MASSAGE</option>
            <option value="AROMA MASSAGE">AROMA MASSAGE</option>
            <option value="SPA">SPA</option>
            <option value="ONSEN">ONSEN</option>
          </select>
          
          <input 
            type="text" 
            className="form-control form-control-sm" 
            placeholder="ค้นหา..." 
            style={{ width: '200px' }} 
            onChange={(e) => console.log(e.target.value)}
          />
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
        <div className="row g-3">
          {services.length === 0 && <div className="col-12 text-center py-5 text-muted">ยังไม่มีบริการ <button className="btn btn-sm btn-primary ms-2" onClick={() => setShowAddForm(true)}>เพิ่มบริการใหม่</button></div>}
          {services.map((s) => (
            <div key={s.id} className="col-12 col-sm-6 col-md-4 col-lg-3">
              <div className="card h-100 shadow-sm">
                <div className="position-relative">
                  {s.imageUrl ? (
                    <img src={s.imageUrl} alt="service" className="card-img-top" style={{ height: 160, objectFit: 'cover' }} />
                  ) : (
                    <div className="bg-light d-flex align-items-center justify-content-center" style={{ height: 160 }}>
                      <i className="fas fa-spa" style={{ fontSize: '48px', color: '#ccc' }}></i>
                    </div>
                  )}
                  <span className="position-absolute top-0 end-0 badge bg-primary m-2">{s.price} บาท</span>
                  <span className="position-absolute top-0 start-0 badge bg-secondary m-2">{s.type}</span>
                </div>
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title">{s.name}</h5>
                  <p className="card-text text-muted small mb-1"><i className="far fa-clock me-1"></i>{s.duration} นาที</p>
                  <p className="card-text mb-2" style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{s.description}</p>
                  {s.createdAt && <p className="card-text text-muted small mb-2"><i className="far fa-calendar-alt me-1"></i>เพิ่มเมื่อ: {s.createdAt.toLocaleString()}</p>}
                  <div className="d-grid gap-2 mt-auto">
                    <button className="btn btn-outline-info btn-sm" data-bs-toggle="modal" data-bs-target={`#detailModal${s.id}`}>
                      <i className="fas fa-info-circle me-1"></i> ดูรายละเอียด
                    </button>
                    <div className="d-flex justify-content-center gap-2">
                      <button className="btn btn-sm btn-outline-warning" onClick={() => startEdit(s)}>
                        <i className="fas fa-edit me-1"></i> แก้ไข
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(s.id)}>
                        <i className="fas fa-trash-alt me-1"></i> ลบ
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {/* Modal for detail */}
              <div className="modal fade" id={`detailModal${s.id}`} tabIndex="-1" aria-labelledby={`detailModalLabel${s.id}`} aria-hidden="true">
                <div className="modal-dialog modal-lg">
                  <div className="modal-content">
                    <div className="modal-header" style={{ background: 'linear-gradient(to right, #f8f9fa, #e9ecef)' }}>
                      <h5 className="modal-title" id={`detailModalLabel${s.id}`}>
                        <i className="fas fa-spa me-2 text-primary"></i>
                        {s.name}
                      </h5>
                      <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div className="modal-body">
                      <div className="row">
                        <div className="col-md-5">
                          {s.imageUrl ? (
                            <img src={s.imageUrl} alt="service" className="img-fluid rounded shadow mb-3" style={{ maxHeight: 300, objectFit: 'cover', width: '100%' }} />
                          ) : (
                            <div className="bg-light d-flex align-items-center justify-content-center rounded" style={{ height: 300 }}>
                              <i className="fas fa-spa" style={{ fontSize: '64px', color: '#ccc' }}></i>
                            </div>
                          )}
                          <div className="d-flex justify-content-between">
                            <span className="badge bg-primary" style={{ fontSize: '1rem' }}><i className="fas fa-tag me-1"></i> {s.price} บาท</span>
                            <span className="badge bg-secondary" style={{ fontSize: '1rem' }}><i className="fas fa-list me-1"></i> {s.type || 'MASSAGE'}</span>
                          </div>
                        </div>
                        <div className="col-md-7">
                          <div className="card mb-3">
                            <div className="card-header bg-light">
                              <i className="fas fa-info-circle me-2"></i>ข้อมูลบริการ
                            </div>
                            <div className="card-body">
                              <div className="mb-3">
                                <label className="form-label fw-bold">รหัสบริการ:</label>
                                <div>{s.id || '-'}</div>
                              </div>
                              <div className="mb-3">
                                <label className="form-label fw-bold">ระยะเวลา:</label>
                                <div><i className="far fa-clock me-1"></i> {s.duration} นาที</div>
                              </div>
                              <div className="mb-3">
                                <label className="form-label fw-bold">คำอธิบาย:</label>
                                <div>{s.description}</div>
                              </div>
                              {s.createdAt && (
                                <div className="mb-0">
                                  <label className="form-label fw-bold">เพิ่มเมื่อ:</label>
                                  <div><i className="far fa-calendar-alt me-1"></i> {s.createdAt.toLocaleString()}</div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="d-flex gap-2">
                            <button className="btn btn-warning" onClick={() => { startEdit(s); document.querySelector(`button[data-bs-dismiss="modal"][aria-label="Close"]`).click(); }}>
                              <i className="fas fa-edit me-1"></i> แก้ไขบริการ
                            </button>
                            <button className="btn btn-danger" onClick={() => { 
                              if (window.confirm(`ต้องการลบบริการ ${s.name} ใช่หรือไม่?`)) {
                                handleDelete(s.id); 
                                document.querySelector(`button[data-bs-dismiss="modal"][aria-label="Close"]`).click();
                              }
                            }}>
                              <i className="fas fa-trash-alt me-1"></i> ลบบริการ
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer bg-light">
                      <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">ปิด</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ServiceManager;
