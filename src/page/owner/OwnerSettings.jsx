import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import '../../styles/SharedStyles.css';

function OwnerSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    businessName: 'SpaFlow',
    businessAddress: '',
    businessPhone: '',
    businessEmail: '',
    openingHours: '10:00',
    closingHours: '20:00',
    allowOnlineBooking: true,
    requireApproval: true,
    bookingLeadTime: '1',
    maxBookingPerDay: '20',
    emailNotifications: true,
    smsNotifications: false,
    maintenanceMode: false
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
  // ดึงข้อมูลการตั้งค่าระบบ
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (!currentUser) {
          navigate('/login');
          return;
        }

        const db = getFirestore();
        const settingsRef = doc(db, 'artifacts/login-spa-7921d/settings', 'business');
        const settingsDoc = await getDoc(settingsRef);

        if (settingsDoc.exists()) {
          const settingsData = settingsDoc.data();
          setSettings(prevState => ({
            ...prevState,
            ...settingsData
          }));
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        setMessage({ 
          type: 'danger', 
          text: 'เกิดข้อผิดพลาดในการโหลดการตั้งค่า กรุณาลองใหม่อีกครั้ง' 
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setSettings({ ...settings, [name]: newValue });
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      const db = getFirestore();
      const settingsRef = doc(db, 'artifacts/login-spa-7921d/settings', 'business');

      await updateDoc(settingsRef, settings);

      setMessage({ 
        type: 'success', 
        text: 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว' 
      });
      
      // Delay before navigating back
      setTimeout(() => {
        navigate('/owner');
      }, 2000);
      
    } catch (error) {
      console.error('Error updating settings:', error);
      setMessage({ 
        type: 'danger', 
        text: 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า กรุณาลองใหม่อีกครั้ง' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const goBack = () => {
    navigate('/owner');
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-warning" role="status">
          <span className="visually-hidden">กำลังโหลด...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-gradient-primary text-white py-3" 
                 style={{ 
                   background: 'linear-gradient(to right, #ff9900, #ff5e62)',
                   borderRadius: '0.5rem 0.5rem 0 0'
                 }}>
              <h4 className="mb-0">
                <i className="fas fa-cogs me-2"></i>
                ตั้งค่าระบบ
              </h4>
            </div>
            <div className="card-body p-4">
              {message.text && (
                <div className={`alert alert-${message.type} alert-dismissible fade show`} role="alert">
                  {message.text}
                  <button type="button" className="btn-close" onClick={() => setMessage({ type: '', text: '' })}></button>
                </div>
              )}
              
              <form onSubmit={saveSettings}>
                <div className="row">
                  {/* ส่วนข้อมูลธุรกิจ */}
                  <div className="col-12 mb-4">
                    <h5 className="fw-bold mb-3">
                      <i className="fas fa-store me-2" style={{ color: '#ff9900' }}></i>
                      ข้อมูลธุรกิจ
                    </h5>
                    <hr />
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label htmlFor="businessName" className="form-label">ชื่อร้าน</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          id="businessName" 
                          name="businessName" 
                          value={settings.businessName}
                          onChange={handleInputChange}
                          placeholder="ชื่อร้านของคุณ"
                        />
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="businessPhone" className="form-label">เบอร์โทรศัพท์</label>
                        <input 
                          type="tel" 
                          className="form-control" 
                          id="businessPhone" 
                          name="businessPhone" 
                          value={settings.businessPhone}
                          onChange={handleInputChange}
                          placeholder="เบอร์โทรศัพท์ร้าน"
                        />
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="businessEmail" className="form-label">อีเมล</label>
                        <input 
                          type="email" 
                          className="form-control" 
                          id="businessEmail" 
                          name="businessEmail" 
                          value={settings.businessEmail}
                          onChange={handleInputChange}
                          placeholder="อีเมลร้าน"
                        />
                      </div>
                      <div className="col-12">
                        <label htmlFor="businessAddress" className="form-label">ที่อยู่</label>
                        <textarea 
                          className="form-control" 
                          id="businessAddress" 
                          name="businessAddress" 
                          rows="2" 
                          value={settings.businessAddress}
                          onChange={handleInputChange}
                          placeholder="ที่อยู่ร้าน"
                        ></textarea>
                      </div>
                    </div>
                  </div>
                  
                  {/* ส่วนเวลาทำการ */}
                  <div className="col-12 mb-4">
                    <h5 className="fw-bold mb-3">
                      <i className="fas fa-clock me-2" style={{ color: '#ff9900' }}></i>
                      เวลาทำการ
                    </h5>
                    <hr />
                    <div className="row">
                      <div className="col-md-6">
                        <label htmlFor="openingHours" className="form-label">เวลาเปิด</label>
                        <input 
                          type="time" 
                          className="form-control" 
                          id="openingHours" 
                          name="openingHours" 
                          value={settings.openingHours}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="closingHours" className="form-label">เวลาปิด</label>
                        <input 
                          type="time" 
                          className="form-control" 
                          id="closingHours" 
                          name="closingHours" 
                          value={settings.closingHours}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* ส่วนการจอง */}
                  <div className="col-12 mb-4">
                    <h5 className="fw-bold mb-3">
                      <i className="fas fa-calendar-check me-2" style={{ color: '#ff9900' }}></i>
                      การจอง
                    </h5>
                    <hr />
                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="form-check form-switch">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            role="switch" 
                            id="allowOnlineBooking" 
                            name="allowOnlineBooking" 
                            checked={settings.allowOnlineBooking}
                            onChange={handleInputChange}
                          />
                          <label className="form-check-label" htmlFor="allowOnlineBooking">
                            อนุญาตการจองออนไลน์
                          </label>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-check form-switch">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            role="switch" 
                            id="requireApproval" 
                            name="requireApproval" 
                            checked={settings.requireApproval}
                            onChange={handleInputChange}
                          />
                          <label className="form-check-label" htmlFor="requireApproval">
                            ต้องอนุมัติการจอง
                          </label>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="bookingLeadTime" className="form-label">ต้องจองล่วงหน้าอย่างน้อย (วัน)</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          id="bookingLeadTime" 
                          name="bookingLeadTime" 
                          min="0"
                          max="30"
                          value={settings.bookingLeadTime}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="maxBookingPerDay" className="form-label">จำนวนการจองสูงสุดต่อวัน</label>
                        <input 
                          type="number" 
                          className="form-control" 
                          id="maxBookingPerDay" 
                          name="maxBookingPerDay" 
                          min="1"
                          max="100"
                          value={settings.maxBookingPerDay}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* ส่วนการแจ้งเตือน */}
                  <div className="col-12 mb-4">
                    <h5 className="fw-bold mb-3">
                      <i className="fas fa-bell me-2" style={{ color: '#ff9900' }}></i>
                      การแจ้งเตือน
                    </h5>
                    <hr />
                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="form-check form-switch">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            role="switch" 
                            id="emailNotifications" 
                            name="emailNotifications" 
                            checked={settings.emailNotifications}
                            onChange={handleInputChange}
                          />
                          <label className="form-check-label" htmlFor="emailNotifications">
                            แจ้งเตือนทางอีเมล
                          </label>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-check form-switch">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            role="switch" 
                            id="smsNotifications" 
                            name="smsNotifications" 
                            checked={settings.smsNotifications}
                            onChange={handleInputChange}
                          />
                          <label className="form-check-label" htmlFor="smsNotifications">
                            แจ้งเตือนทาง SMS (ยังไม่เปิดให้บริการ)
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* ส่วนการบำรุงรักษาระบบ */}
                  <div className="col-12 mb-4">
                    <h5 className="fw-bold mb-3">
                      <i className="fas fa-tools me-2" style={{ color: '#ff9900' }}></i>
                      การบำรุงรักษาระบบ
                    </h5>
                    <hr />
                    <div className="row">
                      <div className="col-12">
                        <div className="alert alert-warning">
                          <div className="form-check form-switch">
                            <input 
                              className="form-check-input" 
                              type="checkbox" 
                              role="switch" 
                              id="maintenanceMode" 
                              name="maintenanceMode" 
                              checked={settings.maintenanceMode}
                              onChange={handleInputChange}
                            />
                            <label className="form-check-label fw-bold" htmlFor="maintenanceMode">
                              เปิดโหมดบำรุงรักษาระบบ
                            </label>
                          </div>
                          <small className="text-muted d-block mt-2">
                            เมื่อเปิดโหมดนี้ ลูกค้าจะไม่สามารถจองออนไลน์ได้ และจะเห็นข้อความแจ้งว่าระบบกำลังปรับปรุง
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <hr className="my-4" />
                
                <div className="d-flex justify-content-between">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary" 
                    onClick={goBack}
                  >
                    <i className="fas fa-arrow-left me-2"></i>
                    ย้อนกลับ
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-warning"
                    disabled={isSaving}
                    style={{
                      background: 'linear-gradient(to right, #ff9900, #ff5e62)',
                      color: 'white',
                      border: 'none'
                    }}
                  >
                    {isSaving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        กำลังบันทึก...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-2"></i>
                        บันทึกการตั้งค่า
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OwnerSettings;
