import React, { useState } from 'react';
import { auth } from '../Firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css';

function ResetPassword() {
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg('อีเมลสำหรับรีเซ็ตรหัสผ่านถูกส่งไปยังที่อยู่อีเมลของคุณแล้ว กรุณาตรวจสอบอีเมลของคุณเพื่อดำเนินการต่อ');
      // อาจรีเซ็ตอีเมลหลังจากส่งเรียบร้อย
      setEmail('');
    } catch (error) {
      console.error('Error sending password reset email:', error);
      let message = 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
      
      if (error.code === 'auth/user-not-found') {
        message = 'ไม่พบบัญชีผู้ใช้ที่ใช้อีเมลนี้';
      } else if (error.code === 'auth/invalid-email') {
        message = 'กรุณาป้อนที่อยู่อีเมลที่ถูกต้อง';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'พยายามส่งอีเมลรีเซ็ตรหัสผ่านมากเกินไป กรุณาลองใหม่ในภายหลัง';
      } else if (error.code === 'auth/network-request-failed') {
        message = 'การเชื่อมต่อเครือข่ายล้มเหลว โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
      } else {
        message = `เกิดข้อผิดพลาด: ${error.message}`;
      }
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="h-100 gradient-form login-container">
      <div className="container py-5 h-100">
        <div className="row d-flex justify-content-center align-items-center h-100">
          <div className="col-xl-10">
            <div className="card rounded-3 text-black shadow-lg border-0 login-card">
              <div className="row g-0">
                <div className="col-lg-6 d-flex align-items-center justify-content-center login-card-left">
                  <div className="card-body p-md-5 mx-md-4 w-100 login-form-container">
                    <div className="text-center mb-4 logo-container">
                      <div className="logo-circle">
                        <i className="fas fa-key fa-3x text-white"></i>
                      </div>
                      <h4 className="mt-4 mb-2 fw-bold logo-text">รีเซ็ตรหัสผ่าน</h4>
                      <p className="text-muted small">ระบบจะส่งอีเมลรีเซ็ตรหัสผ่านให้กับคุณ</p>
                    </div>
                    <form onSubmit={handleResetPassword} className="login-form">
                      <p className="fw-semibold mb-3 text-center form-header">กรุณากรอกอีเมลที่ใช้ลงทะเบียน</p>

                      {errorMsg && (
                        <div className="alert alert-danger py-2 custom-alert" role="alert">
                          <i className="fas fa-exclamation-circle me-2"></i>
                          {errorMsg}
                        </div>
                      )}

                      {successMsg && (
                        <div className="alert alert-success py-2 custom-alert" role="alert">
                          <i className="fas fa-check-circle me-2"></i>
                          {successMsg}
                        </div>
                      )}

                      <div className="form-outline mb-4">
                        <div className="input-group">
                          <span className="input-group-text bg-white border-end-0 input-group-icon">
                            <i className="fas fa-envelope"></i>
                          </span>
                          <input
                            type="email"
                            id="resetEmail"
                            className="form-control form-control-lg bg-white border-start-0 rounded-end px-3 py-2 custom-input"
                            placeholder="อีเมลของคุณ"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="text-center pt-1 mb-4 pb-1">
                        <button
                          type="submit"
                          className="btn btn-primary btn-block w-100 mb-3 login-button"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              กำลังส่งอีเมล...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-paper-plane me-2"></i>
                              ส่งอีเมลรีเซ็ตรหัสผ่าน
                            </>
                          )}
                        </button>
                        <div>
                          <button
                            type="button"
                            className="btn btn-link btn-sm text-muted"
                            onClick={() => navigate('/login')}
                          >
                            <i className="fas fa-arrow-left me-2"></i>
                            กลับไปยังหน้าเข้าสู่ระบบ
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
                <div className="col-lg-6 d-flex align-items-stretch gradient-custom-2 rounded-end right-panel">
                  <div className="text-white px-4 py-4 p-md-5 mx-md-4 d-flex flex-column justify-content-center w-100">
                    <div className="feature-title">
                      <div className="d-flex align-items-center mb-4">
                        <div className="feature-icon large-icon">
                          <i className="fas fa-lock-open fa-2x text-white"></i>
                        </div>
                        <h3 className="mb-0 fw-bold">ขั้นตอนการ<br/>รีเซ็ตรหัสผ่าน</h3>
                      </div>
                    </div>
                    
                    <div className="feature-list">
                      <div className="d-flex mb-4">
                        <div className="feature-icon">
                          <i className="fas fa-envelope text-white"></i>
                        </div>
                        <div>
                          <h6 className="fw-bold mb-1">ป้อนอีเมลของคุณ</h6>
                          <p className="small mb-0">กรอกอีเมลที่ใช้ลงทะเบียนกับระบบของเรา</p>
                        </div>
                      </div>
                      
                      <div className="d-flex mb-4">
                        <div className="feature-icon">
                          <i className="fas fa-paper-plane text-white"></i>
                        </div>
                        <div>
                          <h6 className="fw-bold mb-1">ตรวจสอบอีเมลของคุณ</h6>
                          <p className="small mb-0">เราจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปยังอีเมลของคุณ</p>
                        </div>
                      </div>
                      
                      <div className="d-flex">
                        <div className="feature-icon">
                          <i className="fas fa-key text-white"></i>
                        </div>
                        <div>
                          <h6 className="fw-bold mb-1">ตั้งรหัสผ่านใหม่</h6>
                          <p className="small mb-0">ทำการตั้งรหัสผ่านใหม่ของคุณผ่านลิงก์ที่ได้รับ</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bootstrap CSS CDN */}
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" crossOrigin="anonymous" />
      {/* Font Awesome */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      {/* Optional: Bootstrap JS bundle if you need interactive components */}
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" crossOrigin="anonymous"></script>
    </section>
  );
}

export default ResetPassword;