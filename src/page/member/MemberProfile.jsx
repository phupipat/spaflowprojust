import React, { useEffect, useState } from 'react';
import { db } from '../../Firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../../styles/ProfileStyles.css';


function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fullname, setFullname] = useState('');
  const [phone, setPhone] = useState('');
  const [oldFullname, setOldFullname] = useState('');
  const [oldPhone, setOldPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const userRef = doc(db, '/artifacts/login-spa-7921d/users', user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setFullname(data.fullname || data.displayName || '');
          setPhone(data.phone || '');
          setOldFullname(data.fullname || data.displayName || '');
          setOldPhone(data.phone || '');
        }
      } catch (e) {
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const userRef = doc(db, '/artifacts/login-spa-7921d/users', user.uid);
      await updateDoc(userRef, {
        fullname,
        phone
      });
      // ตรวจสอบการเปลี่ยนแปลง
      if (fullname !== oldFullname && phone !== oldPhone) {
        setSuccess('เปลี่ยนชื่อ-นามสกุลและเบอร์โทรศัพท์เรียบร้อยแล้ว');
      } else if (fullname !== oldFullname) {
        setSuccess('เปลี่ยนชื่อ-นามสกุลเรียบร้อยแล้ว');
      } else if (phone !== oldPhone) {
        setSuccess('เปลี่ยนเบอร์โทรศัพท์เรียบร้อยแล้ว');
      } else {
        setSuccess('ไม่มีการเปลี่ยนแปลงข้อมูล');
      }
      setOldFullname(fullname);
      setOldPhone(phone);
    } catch (e) {
      setError('บันทึกไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            {/* Header Card */}
            <div className="card mb-4 profile-header-card">
              <div className="card-body text-center py-4">
                <div className="mb-3">
                  <div className="profile-avatar">
                    <i className="fas fa-user"></i>
                  </div>
                </div>
                <h4 className="profile-title">
                  โปรไฟล์ของฉัน
                </h4>
                <p className="profile-subtitle">
                  จัดการข้อมูลส่วนตัวของคุณ
                </p>
              </div>
            </div>

            {/* Profile Form Card */}
            <div className="card profile-form-card">
              <div className="card-body p-4">
                {loading ? (
                  <div className="profile-loading">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p>กำลังโหลดข้อมูล...</p>
                  </div>
                ) : (
                  <form onSubmit={handleSave}>
                    {/* Full Name Field */}
                    <div className="profile-field">
                      <label className="form-label profile-label">
                        <i className="fas fa-user text-primary"></i>
                        ชื่อ-นามสกุล
                      </label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control profile-input name-input"
                          value={fullname}
                          onChange={e => setFullname(e.target.value)}
                          required
                          placeholder="กรอกชื่อ-นามสกุล"
                        />
                      </div>
                    </div>

                    {/* Phone Field */}
                    <div className="profile-field">
                      <label className="form-label profile-label">
                        <i className="fas fa-phone text-success"></i>
                        เบอร์โทรศัพท์
                      </label>
                      <div className="input-group">
                        <input
                          type="tel"
                          className="form-control profile-input phone-input"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          pattern="[0-9]{9,12}"
                          required
                          placeholder="กรอกเบอร์โทรศัพท์"
                        />
                      </div>
                    </div>

                    {/* Error & Success Messages */}
                    {error && (
                      <div className="profile-alert error">
                        <i className="fas fa-exclamation-circle"></i>
                        {error}
                      </div>
                    )}
                    {success && (
                      <div className="profile-alert success">
                        <i className="fas fa-check-circle"></i>
                        {success}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="profile-buttons">
                      <button 
                        type="button" 
                        className="btn profile-btn back-btn" 
                        onClick={() => navigate(-1)} 
                        disabled={saving}
                      >
                        <i className="fas fa-arrow-left"></i>
                        ย้อนกลับ
                      </button>
                      <button 
                        type="submit" 
                        className="btn profile-btn save-btn" 
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <div className="spinner-border spinner-border-sm profile-spinner" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                            กำลังบันทึก...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save"></i>
                            บันทึกข้อมูล
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
