import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { getAuth, updateProfile, updateEmail } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import '../../styles/SharedStyles.css';

function OwnerProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    displayName: '',
    email: '',
    phoneNumber: '',
    address: '',
    profilePicture: '',
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    // Fetch user profile data
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (!currentUser) {
          navigate('/login');
          return;
        }

        const db = getFirestore();
        const userDocRef = doc(db, 'artifacts/login-spa-7921d/users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setProfile({
            displayName: currentUser.displayName || userData.displayName || '',
            email: currentUser.email || '',
            phoneNumber: userData.phoneNumber || '',
            address: userData.address || '',
            profilePicture: currentUser.photoURL || userData.profilePicture || '',
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setMessage({ 
          type: 'danger', 
          text: 'เกิดข้อผิดพลาดในการโหลดข้อมูลโปรไฟล์ กรุณาลองใหม่อีกครั้ง' 
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const db = getFirestore();
      const userDocRef = doc(db, 'artifacts/login-spa-7921d/users', currentUser.uid);

      // Update Firebase Authentication profile
      const updatePromises = [];
      
      if (profile.displayName !== currentUser.displayName) {
        updatePromises.push(updateProfile(currentUser, {
          displayName: profile.displayName
        }));
      }

      if (profile.email !== currentUser.email) {
        updatePromises.push(updateEmail(currentUser, profile.email));
      }

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }

      // Update Firestore user document
      await updateDoc(userDocRef, {
        displayName: profile.displayName,
        phoneNumber: profile.phoneNumber,
        address: profile.address
      });

      setMessage({ 
        type: 'success', 
        text: 'บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว' 
      });
      
      // Delay before navigating back
      setTimeout(() => {
        navigate('/owner');
      }, 2000);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ 
        type: 'danger', 
        text: 'เกิดข้อผิดพลาดในการอัพเดทโปรไฟล์ กรุณาลองใหม่อีกครั้ง' 
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
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-gradient-primary text-white py-3" 
                 style={{ 
                   background: 'linear-gradient(to right, #ff9900, #ff5e62)',
                   borderRadius: '0.5rem 0.5rem 0 0'
                 }}>
              <h4 className="mb-0">
                <i className="fas fa-user-circle me-2"></i>
                ข้อมูลส่วนตัว
              </h4>
            </div>
            <div className="card-body p-4">
              {message.text && (
                <div className={`alert alert-${message.type} alert-dismissible fade show`} role="alert">
                  {message.text}
                  <button type="button" className="btn-close" onClick={() => setMessage({ type: '', text: '' })}></button>
                </div>
              )}
              
              <form onSubmit={saveProfile}>
                <div className="text-center mb-4">
                  <div className="profile-image-container mb-3">
                    <div 
                      className="rounded-circle mx-auto d-flex align-items-center justify-content-center" 
                      style={{ 
                        width: '120px', 
                        height: '120px', 
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #ddd',
                        overflow: 'hidden'
                      }}
                    >
                      {profile.profilePicture ? (
                        <img src={profile.profilePicture} alt="Profile" className="img-fluid" />
                      ) : (
                        <i className="fas fa-user fa-3x text-secondary"></i>
                      )}
                    </div>
                  </div>
                  <button type="button" className="btn btn-sm btn-outline-secondary mb-3" disabled>
                    <i className="fas fa-camera me-2"></i>
                    อัพโหลดรูปโปรไฟล์
                  </button>
                  <p className="text-muted small">* อยู่ระหว่างพัฒนาฟีเจอร์อัพโหลดรูปโปรไฟล์</p>
                </div>
                
                <div className="mb-3">
                  <label htmlFor="displayName" className="form-label">ชื่อ-นามสกุล</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="displayName" 
                    name="displayName" 
                    value={profile.displayName}
                    onChange={handleInputChange}
                    placeholder="ระบุชื่อ-นามสกุล"
                  />
                </div>
                
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">อีเมล</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    id="email" 
                    name="email" 
                    value={profile.email}
                    onChange={handleInputChange}
                    placeholder="ระบุอีเมล"
                    disabled
                  />
                  <small className="text-muted">การเปลี่ยนแปลงอีเมลต้องทำการยืนยันตัวตนใหม่</small>
                </div>
                
                <div className="mb-3">
                  <label htmlFor="phoneNumber" className="form-label">เบอร์โทรศัพท์</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    id="phoneNumber" 
                    name="phoneNumber" 
                    value={profile.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="ระบุเบอร์โทรศัพท์"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="address" className="form-label">ที่อยู่</label>
                  <textarea 
                    className="form-control" 
                    id="address" 
                    name="address" 
                    rows="3" 
                    value={profile.address}
                    onChange={handleInputChange}
                    placeholder="ระบุที่อยู่"
                  ></textarea>
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
                        บันทึกข้อมูล
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

export default OwnerProfile;
