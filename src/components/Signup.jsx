import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from "../Firebase.js";
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // ตรวจสอบข้อมูลก่อนส่ง
    if (password !== confirmPassword) {
      setError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      setLoading(false);
      return;
    }
    
    if (!name.trim()) {
      setError('กรุณากรอกชื่อ-นามสกุล');
      setLoading(false);
      return;
    }
    
    if (password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      setLoading(false);
      return;
    }
    
    if (!agreeTerms) {
      setError('กรุณายอมรับข้อตกลงการใช้บริการ');
      setLoading(false);
      return;
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // เพิ่มข้อมูลผู้ใช้ลง Firestore ที่ path: artifacts/{projectId}/users/{uid}
      const projectId = 'login-spa-7921d'; // หรือดึงจาก config
  await setDoc(doc(db, 'artifacts', projectId, 'users', user.uid), {
  fullname: name,
  email: user.email,
  phone: phone,
  password: password, // เก็บรหัสผ่าน (ควรเข้ารหัสในระบบจริง)
  role: 'member',
  status: 'pending',
  points: 0,
  timestamp: serverTimestamp(),
      });

      // แสดง popup แจ้งว่าลงทะเบียนสำเร็จแล้ว
      const successMessage = 'สมัครสมาชิกเรียบร้อยแล้ว\nกรุณารอการอนุมัติจากเจ้าหน้าที่ เราจะส่งอีเมลแจ้งเมื่อบัญชีของคุณได้รับการอนุมัติ';
      alert(successMessage);
      navigate('/login');
    } catch (error) {
      console.error('Signup error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('อีเมลนี้มีผู้ใช้งานแล้ว');
      } else if (error.code === 'auth/invalid-email') {
        setError('รูปแบบอีเมลไม่ถูกต้อง');
      } else {
        setError(`เกิดข้อผิดพลาด: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm fixed-top" id="mainNav">
        <div className="container px-4 px-lg-5">
          <Link className="navbar-brand d-flex align-items-center fw-bold" to="/" style={{ fontWeight: 800, letterSpacing: '1px', fontSize: '1.5rem', color: '#000' }}>
            <i className="fas fa-spa me-2" style={{ color: '#FF7D29' }}></i>
            SpaFlow
          </Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarResponsive"
            aria-controls="navbarResponsive" aria-expanded="false" aria-label="Toggle navigation">
            <span style={{ color: '#000' }}>Menu</span> <i className="fas fa-bars" style={{ color: '#000' }}></i>
          </button>
          <div className="collapse navbar-collapse" id="navbarResponsive">
            <ul className="navbar-nav ms-auto py-4 py-lg-0 align-items-center">
              <li className="nav-item">
                <Link className="nav-link px-lg-3 py-3 py-lg-4 d-flex align-items-center" to="/" style={{ color: '#000', fontWeight: 500 }}>
                  <i className="fas fa-home me-1"></i> หน้าแรก
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link px-lg-3 py-3 py-lg-4 d-flex align-items-center" to="/Services" style={{ color: '#000', fontWeight: 500 }}>
                  <i className="fas fa-spa me-1"></i> บริการ
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link px-lg-3 py-3 py-lg-4 d-flex align-items-center" to="/about" style={{ color: '#000', fontWeight: 500 }}>
                  <i className="fas fa-info-circle me-1"></i> เกี่ยวกับเรา
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link px-lg-3 py-3 py-lg-4 d-flex align-items-center" to="/contact" style={{ color: '#000', fontWeight: 500 }}>
                  <i className="fas fa-envelope me-1"></i> ติดต่อ
                </Link>
              </li>
              <li className="nav-item ms-2">
                <Link className="btn btn-sm btn-primary px-3 py-2 d-flex align-items-center" to="/login" style={{ background: '#7B4019', border: 'none', borderRadius: '50px',color: '#fff' }}>
                  <i className="fas fa-sign-in-alt me-1"></i> เข้าสู่ระบบ
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Add FontAwesome CDN */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" 
            integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" 
            crossOrigin="anonymous" referrerPolicy="no-referrer" />
      
      {/* Main Content */}
      <section
        className="position-relative"
        style={{ minHeight: '100vh', paddingTop: '76px' }}
      >
        <div
          className="bg-image"
          style={{
            backgroundImage: "url('/assets/img/singup.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: -1,
            filter: 'brightness(0.85)'
          }}
        />
        <div className="mask d-flex align-items-center justify-content-center" style={{ minHeight: 'calc(100vh - 76px)' }}>
          <div className="container py-5">
            <div className="row d-flex justify-content-center align-items-center">
              <div className="col-12 col-md-9 col-lg-7 col-xl-6">
                <div className="card border-0" 
                  style={{ 
                    borderRadius: '16px', 
                    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)'
                  }}>
                  <div className="card-body p-4 p-md-5">
                    <div className="text-center mb-4">
                      <i className="fas fa-user-plus fa-3x mb-3" style={{ color: '#FF7D29' }}></i>
                      <h2 className="fw-bold" style={{ color: '#333' }}>สมัครสมาชิก</h2>
                      <p className="text-muted">กรอกข้อมูลเพื่อสร้างบัญชีใหม่</p>
                    </div>
                    
                    {error && (
                      <div className="alert alert-danger d-flex align-items-center" role="alert">
                        <i className="fas fa-exclamation-circle me-2"></i>
                        <div>{error}</div>
                      </div>
                    )}
                    
                    <form onSubmit={handleSignup}>
                      <div className="form-floating mb-3">
                        <input 
                          type="text" 
                          className="form-control" 
                          id="floatingName" 
                          placeholder="ชื่อ-นามสกุล" 
                          value={name} 
                          onChange={(e) => setName(e.target.value)} 
                          required 
                        />
                        <label htmlFor="floatingName">
                          <i className="fas fa-user me-2 text-muted"></i>
                          ชื่อ-นามสกุล
                        </label>
                      </div>
                      
                      <div className="form-floating mb-3">
                        <input 
                          type="email" 
                          className="form-control" 
                          id="floatingEmail" 
                          placeholder="name@example.com" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          required 
                        />
                        <label htmlFor="floatingEmail">
                          <i className="fas fa-envelope me-2 text-muted"></i>
                          อีเมล
                        </label>
                      </div>
                      
                      <div className="form-floating mb-3">
                        <input 
                          type="tel" 
                          className="form-control" 
                          id="floatingPhone" 
                          placeholder="เบอร์โทรศัพท์" 
                          value={phone} 
                          onChange={(e) => setPhone(e.target.value)} 
                        />
                        <label htmlFor="floatingPhone">
                          <i className="fas fa-phone me-2 text-muted"></i>
                          เบอร์โทรศัพท์
                        </label>
                      </div>
                      
                      <div className="form-floating mb-3">
                        <input 
                          type="password" 
                          className="form-control" 
                          id="floatingPassword" 
                          placeholder="รหัสผ่าน" 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          required 
                        />
                        <label htmlFor="floatingPassword">
                          <i className="fas fa-lock me-2 text-muted"></i>
                          รหัสผ่าน
                        </label>
                        <small className="form-text text-muted">รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร</small>
                      </div>
                      
                      <div className="form-floating mb-4">
                        <input 
                          type="password" 
                          className="form-control" 
                          id="floatingConfirmPassword" 
                          placeholder="ยืนยันรหัสผ่าน" 
                          value={confirmPassword} 
                          onChange={(e) => setConfirmPassword(e.target.value)} 
                          required 
                        />
                        <label htmlFor="floatingConfirmPassword">
                          <i className="fas fa-shield-alt me-2 text-muted"></i>
                          ยืนยันรหัสผ่าน
                        </label>
                      </div>
                      
                      <div className="form-check d-flex align-items-center mb-4">
                        <input 
                          className="form-check-input me-2" 
                          type="checkbox" 
                          id="agreeTerms"
                          checked={agreeTerms}
                          onChange={(e) => setAgreeTerms(e.target.checked)}
                          required 
                        />
                        <label className="form-check-label" htmlFor="agreeTerms">
                          ฉันยอมรับ <a href="#" className="text-decoration-none" style={{ color: '#FF7D29' }}><u>ข้อตกลงการใช้บริการ</u></a> และ <a href="#" className="text-decoration-none" style={{ color: '#FF7D29' }}><u>นโยบายความเป็นส่วนตัว</u></a>
                        </label>
                      </div>
                      
                      <div className="d-grid gap-2">
                        <button 
                          type="submit" 
                          className="btn btn-lg" 
                          style={{ 
                            background: '#7B4019', 
                            border: 'none', 
                            color: '#fff', 
                            fontWeight: 600,
                            borderRadius: '10px',
                            padding: '12px'
                          }}
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              กำลังสมัคร...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-user-plus me-2"></i>
                              สมัครสมาชิก
                            </>
                          )}
                        </button>
                      </div>
                      
                      <div className="text-center mt-4">
                        <p className="mb-0">
                          <i className="fas fa-question-circle me-1 text-muted"></i> 
                          มีบัญชีอยู่แล้ว? <Link to="/login" className="fw-bold text-decoration-none" style={{ color: '#C87941' }}>เข้าสู่ระบบ</Link>
                        </p>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="container-fluid bg-white mt-5" style={{ position: 'relative', zIndex: 10 }}>
          <footer className="py-3 mt-4">
            <ul className="nav justify-content-center border-bottom pb-3 mb-3">
              <li className="nav-item"><Link to="/" className="nav-link px-2 text-muted">หน้าแรก</Link></li>
              <li className="nav-item"><Link to="/services" className="nav-link px-2 text-muted">บริการ</Link></li>
              <li className="nav-item"><Link to="/about" className="nav-link px-2 text-muted">เกี่ยวกับเรา</Link></li>
              <li className="nav-item"><Link to="/contact" className="nav-link px-2 text-muted">ติดต่อ</Link></li>
              <li className="nav-item"><Link to="#" className="nav-link px-2 text-muted">นโยบายความเป็นส่วนตัว</Link></li>
            </ul>
            <p className="text-center text-muted">
              <i className="fas fa-spa me-2" style={{ color: '#87431D' }}></i>
              &copy; 2023-{new Date().getFullYear()} SpaFlow, Inc. All rights reserved.
            </p>
          </footer>
        </div>
      </section>
    </>
  );
}

export default Signup;