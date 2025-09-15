import React, { useState, useEffect } from 'react';
import { auth, db } from '../Firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import DashboardOwner from '../page/owner/DashboardOwner';
import DashboardEmployee from '../page/employee/DashboardEmployee';
import DashboardMember from '../page/member/DashboardMember';

function App() {
  // State variables for form inputs and application status
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [currentView, setCurrentView] = useState('login'); // Controls which component to display
  const [userId, setUserId] = useState(null); // Current authenticated user ID
  const [userRole, setUserRole] = useState(null); // Role of the logged-in user
  const [isAuthReady, setIsAuthReady] = useState(false); // Flag to indicate if auth state is ready
  const navigate = useNavigate(); // Hook for navigation

  // useEffect hook for Firebase authentication state listener
  // This runs once when the component mounts to listen for auth changes.
  useEffect(() => {
    // ตรวจสอบสถานะการยืนยันตัวตน
    // onAuthStateChanged จะทำงานเมื่อสถานะการยืนยันตัวตนเปลี่ยนไป (เช่น เข้าสู่ระบบ, ออกจากระบบ)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
      setIsAuthReady(true); // สถานะการยืนยันตัวตนเป็นที่ทราบแล้ว
    });

    // Cleanup function: ยกเลิกการฟังเมื่อคอมโพเนนต์ถูก unmount
    return () => unsubscribe();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Handles the login process when the form is submitted
  // สถานะการโหลด
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    // Clear previous error messages
    setErrorMsg('');
    // เริ่มสถานะโหลด
    setIsLoading(true);

    // ตรวจสอบให้แน่ใจว่า Firebase auth และ db พร้อมใช้งาน
    // ในโปรเจกต์จริง auth และ db ถูกนำเข้าโดยตรง จึงไม่ต้องตรวจสอบ null
    // แต่ถ้ามีปัญหาการตั้งค่า Firebase.js อาจทำให้ auth/db เป็น undefined ได้
    if (!auth || !db) {
      setErrorMsg('Firebase ยังไม่ได้รับการตั้งค่าอย่างถูกต้อง กรุณาตรวจสอบ Firebase.js ของคุณ');
      setIsLoading(false);
      return;
    }

    try {
      // Sign in the user with email and password
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Construct the Firestore path for user roles.
      // ในโปรเจกต์จริง คุณอาจมีโครงสร้างที่แตกต่างกัน
      // แต่ถ้าคุณต้องการใช้โครงสร้างที่แนะนำสำหรับ Canvas:
      // artifacts/{appId}/public/data/Users/{uid}
      // คุณจะต้องกำหนด appId ด้วยตัวเอง หรือดึงมาจาก config ของ Firebase
      // สำหรับตัวอย่างนี้ เราจะใช้ 'default-app-id' หรือดึงจาก firebaseConfig.appId
      console.log('เริ่มตรวจสอบข้อมูลผู้ใช้ uid:', uid);
      
      // ลองค้นหาข้อมูลใน path แรก: /artifacts/login-spa-7921d/users/{uid}
      const projectId = 'login-spa-7921d';
      let userDocRef = doc(db, 'artifacts', projectId, 'users', uid);
      let userDoc = await getDoc(userDocRef);

      // ถ้าไม่พบข้อมูลในเส้นทางแรก ลองค้นหาใน path ที่สอง: users/{uid}
      if (!userDoc.exists()) {
        console.log('ไม่พบข้อมูลใน path แรก ลองค้นหาใน path ที่สอง');
        userDocRef = doc(db, 'users', uid);
        userDoc = await getDoc(userDocRef);
      }

      // ตรวจสอบว่ามีข้อมูลผู้ใช้หรือไม่
      if (!userDoc.exists()) {
        console.error('ไม่พบข้อมูลผู้ใช้ในทุกเส้นทางที่เป็นไปได้');
        setErrorMsg('ไม่พบข้อมูลบัญชีผู้ใช้ในระบบ กรุณาลงทะเบียนก่อนเข้าสู่ระบบ');
        await signOut(auth); // ออกจากระบบเพื่อความปลอดภัย
        return;
      }
      
      console.log('พบข้อมูลผู้ใช้:', userDoc.id);

      // ข้อมูลมีอยู่จริง จึงดำเนินการต่อ
      const userData = userDoc.data();
      
      // ตรวจสอบว่ามีฟิลด์ role หรือไม่
      if (!userData.role) {
        console.log('ไม่พบข้อมูล role ในฐานข้อมูล:', userData);
        setErrorMsg('ข้อมูลสิทธิ์ผู้ใช้งานไม่ครบถ้วน กรุณาติดต่อผู้ดูแลระบบ');
        await signOut(auth); // ออกจากระบบเพื่อความปลอดภัย
        return;
      }
      
      // แปลงเป็นตัวอักษรพิมพ์ใหญ่ตัวแรก พิมพ์เล็กที่เหลือ เพื่อความสม่ำเสมอ
      const role = userData.role.charAt(0).toUpperCase() + userData.role.slice(1).toLowerCase();
      
      // ตรวจสอบสถานะการอนุมัติ
      const isApproved = userData.status === 'approved';
      
      if (!isApproved) {
        setErrorMsg('บัญชีของคุณยังไม่ได้รับการอนุมัติ กรุณาติดต่อผู้ดูแลระบบ');
        await signOut(auth); // ออกจากระบบเพื่อความปลอดภัย
        return;
      }
      
      setUserRole(role); // Set the user's role in state
      console.log('ตรวจพบผู้ใช้มีสิทธิ์:', role);

      // Navigate based on the user's role
      // สร้าง function สำหรับตรวจสอบ role โดยไม่สนใจตัวพิมพ์ใหญ่-เล็ก
      const roleMatches = (roleToCheck) => {
        return role.toLowerCase() === roleToCheck.toLowerCase();
      };
      
      // แสดงข้อมูล role เพื่อการตรวจสอบ
      console.log('กำลังตรวจสอบสิทธิ์:', role);
      
      if (roleMatches('Owner')) {
        navigate('/owner/DashboardOwner');
      } 
      else if (roleMatches('Employee')) {
        navigate('/employee/DashboardEmployee');
      }
      else if (roleMatches('Member')) {
        navigate('/member/DashboardMember');
      }
      else {
        // If role is not found or not recognized, show an error
        console.error('ไม่รู้จักสิทธิ์:', role);
        setErrorMsg(`ไม่พบสิทธิ์ผู้ใช้งาน "${role}" ในระบบ กรุณาติดต่อผู้ดูแลระบบ`);
        await signOut(auth); // ออกจากระบบเพื่อความปลอดภัย
        setCurrentView('login'); // Stay on login page
      }
    } catch (error) {
      // Handle Firebase authentication errors
      let message = 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
      console.error('เกิดข้อผิดพลาดในการเข้าสู่ระบบ:', error);
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
      } else if (error.code === 'auth/invalid-email') {
        message = 'กรุณาป้อนที่อยู่อีเมลที่ถูกต้อง';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'พยายามเข้าสู่ระบบล้มเหลวหลายครั้งเกินไป กรุณาลองใหม่ในภายหลัง';
      } else if (error.code === 'auth/invalid-credential') {
        message = 'ข้อมูลการยืนยันตัวตนไม่ถูกต้อง โปรดตรวจสอบอีเมลและรหัสผ่าน';
      } else if (error.code === 'auth/user-disabled') {
        message = 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ';
      } else if (error.code === 'auth/network-request-failed') {
        message = 'การเชื่อมต่อเครือข่ายล้มเหลว โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
      } else {
        message = `เกิดข้อผิดพลาด: ${error.message}`;
      }
      setErrorMsg(message);
      setIsLoading(false); // รีเซ็ตสถานะการโหลด
      setCurrentView('login'); // Stay on login page
    } finally {
      // รีเซ็ตสถานะการโหลดเมื่อเสร็จสิ้นการทำงาน
      setIsLoading(false);
    }
  };

  // Render different views based on currentView state
  const renderView = () => {
    if (!isAuthReady) {
      return (
        <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
          <p className="text-muted">กำลังโหลดแอปพลิเคชัน...</p>
        </div>
      );
    }

    // แสดงเฉพาะหน้า login เนื่องจาก navigation จะเปลี่ยนหน้าอัตโนมัติ
    return (
      <section className="h-100 gradient-form" style={{ backgroundColor: '#eee', minHeight: '100vh' }}>
        <div className="container py-5 h-100">
          <div className="row d-flex justify-content-center align-items-center h-100">
            <div className="col-xl-10">
              <div className="card rounded-3 text-black shadow-lg border-0" style={{ maxWidth: 900, margin: '0 auto' }}>
                <div className="row g-0">
                  <div className="col-lg-6 d-flex align-items-center justify-content-center">
                    <div className="card-body p-md-5 mx-md-4 w-100" style={{ maxWidth: 400, width: '100%' }}>
                      <div className="text-center mb-4">
                        <img src="https://mdbcdn.b-cdn.net/img/Photos/new-templates/bootstrap-login-form/lotus.webp"
                          style={{ width: '120px' }} alt="logo"
                          onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/120x120/cccccc/333333?text=โลโก้"; }}
                        />
                        <h4 className="mt-3 mb-4 pb-1 fw-bold">ยินดีต้อนรับสู่ SpaFlow</h4>
                      </div>
                      <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                        <p className="fw-semibold mb-3 text-center">กรุณาเข้าสู่ระบบบัญชีของคุณ</p>
                        {errorMsg && (
                          <div className="alert alert-danger py-2" role="alert">
                            <i className="fas fa-exclamation-circle me-2"></i>
                            {errorMsg}
                          </div>
                        )}
                        <div className="form-outline mb-4">
                          <div className="input-group">
                            <span className="input-group-text bg-white border-end-0">
                              <i className="fas fa-envelope text-muted"></i>
                            </span>
                            <input
                              type="email"
                              id="form2Example11"
                              className="form-control form-control-lg bg-white border-start-0 rounded-end px-3 py-2"
                              style={{ boxSizing: 'border-box', minHeight: 48, borderColor: '#ced4da' }}
                              placeholder="อีเมลของคุณ"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="form-outline mb-4">
                          <div className="input-group">
                            <span className="input-group-text bg-white border-end-0">
                              <i className="fas fa-lock text-muted"></i>
                            </span>
                            <input
                              type="password"
                              id="form2Example22"
                              className="form-control form-control-lg bg-white border-start-0 rounded-end px-3 py-2"
                              style={{ boxSizing: 'border-box', minHeight: 48, borderColor: '#ced4da' }}
                              placeholder="รหัสผ่าน"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        <div className="text-center pt-1 mb-4 pb-1">
                          <button
                            type="submit"
                            className="btn btn-primary btn-block w-100 mb-3"
                            style={{
                              background: '#7B4019',
                              border: 'none',
                              fontWeight: 600
                            }}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                กำลังตรวจสอบ...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-sign-in-alt me-2"></i>
                                เข้าสู่ระบบ
                              </>
                            )}
                          </button>
                          <a className="text-muted small" href="#">ลืมรหัสผ่าน?</a>
                        </div>
                        <div className="d-flex align-items-center justify-content-center pb-2">
                          <p className="mb-0 me-2">ยังไม่มีบัญชี?</p>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm me-2"
                            onClick={() => window.location.href = '/signup'}
                          >
                            สร้างบัญชีใหม่
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => window.location.href = '/'}
                          >
                            กลับหน้าแรก
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                  <div className="col-lg-6 d-flex align-items-stretch gradient-custom-2 rounded-end" style={{ minHeight: 500 }}>
                    <div className="text-white px-4 py-4 p-md-5 mx-md-4 d-flex flex-column justify-content-center w-100">
                      <h4 className="mb-4 fw-bold">เราเป็นมากกว่าแค่ระบบร้านสปา</h4>
                      <p className="small mb-0" style={{ lineHeight: 1.7 }}>
                        เราเป็นผู้ช่วยในการดูแลความผ่อนคลายและสุขภาพของคุณอย่างรอบด้าน
                        ทุกฟีเจอร์ถูกออกแบบโดยคำนึงถึงประสบการณ์ของผู้ใช้งานเป็นสำคัญ
                        เพื่อให้คุณรู้สึกมั่นใจ อุ่นใจ และพึงพอใจในทุกครั้งที่ใช้บริการกับเรา
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  return (
    <>
      {/* Bootstrap CSS CDN */}
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" xintegrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossOrigin="anonymous" />
      {/* Font Awesome */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      {/* Optional: Bootstrap JS bundle if you need interactive components */}
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" xintegrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossOrigin="anonymous"></script>

      {/* Custom styles for the gradient, as it's not a standard Bootstrap class */}
      <style>
        {`
          .gradient-custom-2 {
            background: #7B4019;
          }
          /* Ensure the form labels float correctly with Bootstrap form-outline */
          .form-outline .form-control ~ .form-label {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            padding: 1rem 0.75rem;
            pointer-events: none;
            border: 1px solid transparent;
            transform-origin: 0 0;
            transition: opacity .15s ease-in-out,transform .15s ease-in-out;
          }
          .form-outline .form-control:focus ~ .form-label,
          .form-outline .form-control:not(:placeholder-shown) ~ .form-label {
            transform: translateY(-1rem) scale(0.8);
            opacity: 0.65;
          }
        `}
      </style>
      {renderView()}
    </>
  );
}

export default App;