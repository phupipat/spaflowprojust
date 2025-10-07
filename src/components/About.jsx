import React from "react";
import { Link } from "react-router-dom";

const About = () => {
  return (
    <>
      {/* Custom CSS */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .hover-card {
            transition: all 0.3s ease;
          }
          
          .hover-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1) !important;
          }
          
          .nav-item a:hover {
            color: #FF7D29 !important;
          }
          
          .icon-circle {
            transition: all 0.3s ease;
          }
          
          .hover-card:hover .icon-circle {
            transform: scale(1.1);
          }
          
          /* Gallery Styles */
          .hover-card {
            overflow: hidden;
            cursor: pointer;
          }
          
          .hover-card img {
            transition: all 0.6s ease;
          }
          
          .hover-card:hover img {
            transform: scale(1.1);
            filter: brightness(1.1);
          }
          
          .hover-card .overlay {
            transition: all 0.3s ease;
            opacity: 0.9;
          }
          
          .hover-card:hover .overlay {
            opacity: 1;
            background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 80%, rgba(255,125,41,0.3) 100%);
          }
        `}
      </style>
      
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm fixed-top" id="mainNav">
        <div className="container px-4 px-lg-5">
          <a className="navbar-brand fw-bold d-flex align-items-center" href="/" style={{ fontWeight: 800, letterSpacing: '1px', fontSize: '1.5rem', color: '#000' }}>
            <i className="fas fa-spa me-2" style={{ color: '#FF7D29' }}></i>
            SpaFlow
          </a>
          <button className="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarResponsive" aria-controls="navbarResponsive" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarResponsive">
            <ul className="navbar-nav ms-auto py-4 py-lg-0 align-items-center">
              <li className="nav-item"><a className="nav-link px-lg-3 py-3 py-lg-4 fw-semibold" href="/" style={{ color: '#000' }}><i className="fas fa-home me-1"></i> หน้าหลัก</a></li>
              <li className="nav-item"><a className="nav-link px-lg-3 py-3 py-lg-4 fw-semibold" href="/Services" style={{ color: '#000' }}><i className="fas fa-concierge-bell me-1"></i> บริการ</a></li>
              <li className="nav-item"><Link className="nav-link px-lg-3 py-3 py-lg-4 fw-semibold" to="/about" style={{ color: '#FF7D29' }}><i className="fas fa-info-circle me-1"></i> เกี่ยวกับเรา</Link></li>
              <li className="nav-item"><a className="nav-link px-lg-3 py-3 py-lg-4 fw-semibold" href="/contact" style={{ color: '#000' }}><i className="fas fa-envelope me-1"></i> ติดต่อเรา</a></li>
              <li className="nav-item ms-lg-2"><a className="btn btn-warning px-4 py-2 fw-semibold" href="/login" style={{ background: '#7B4019', border: 'none', color: '#fff', borderRadius: '50px' }}><i className="fas fa-sign-in-alt me-2"></i>เข้าสู่ระบบ</a></li>
            </ul>
          </div>
        </div>
      </nav>
      {/* Header */}
      <header className="masthead" style={{ 
        backgroundImage: "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.5)), url('/assets/img/aboume.png')", 
        minHeight: '50vh', 
        backgroundSize: 'cover', 
        backgroundPosition: 'center',
        marginTop: '76px'
      }}>
        <div className="container position-relative px-4 px-lg-5">
          <div className="row gx-4 gx-lg-5 justify-content-center">
            <div className="col-md-10 col-lg-8 col-xl-7">
              <div className="page-heading text-white text-center" style={{ padding: '120px 0 60px 0' }}>
                <div className="mb-4 animate__animated animate__fadeIn" style={{ animation: 'fadeIn 1s' }}>
                  <i className="fas fa-info-circle fa-3x" style={{ color: '#FF7D29', marginBottom: '20px' }}></i>
                </div>
                <h1 className="animate__animated animate__fadeIn" style={{ 
                  fontSize: '3.2rem', 
                  fontWeight: 800, 
                  letterSpacing: '1px',
                  animation: 'fadeIn 1.5s' 
                }}>
                  เกี่ยวกับเรา
                </h1>
                <div className="d-flex justify-content-center">
                  <div className="divider" style={{ 
                    width: '80px', 
                    height: '4px', 
                    background: 'linear-gradient(90deg, #FF7D29 0%, #FFBF78 100%)',
                    margin: '20px auto',
                    borderRadius: '2px'
                  }}></div>
                </div>
                <span className="subheading fs-4 animate__animated animate__fadeIn" style={{ animation: 'fadeIn 2s' }}>
                  <i className="fas fa-quote-left me-2" style={{ color: '#FF7D29' }}></i>
                  รู้จัก SpaFlow ให้มากขึ้น
                  <i className="fas fa-quote-right ms-2" style={{ color: '#FF7D29' }}></i>
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>
      {/* Main Content */}
      <main className="mb-4 py-5">
        <div className="container px-4 px-lg-5">
          <div className="row gx-4 gx-lg-5 justify-content-center align-items-center">
            <div className="col-lg-5 mb-4 mb-lg-0 animate__animated animate__fadeIn" style={{ animation: 'fadeIn 1s' }}>
              <div className="card border-0 shadow overflow-hidden">
                <div className="ratio ratio-1x1">
                  <img src="/assets/img/aboume.png" alt="About SpaFlow" className="img-fluid" 
                       style={{ objectFit: 'cover', borderRadius: '8px' }} />
                </div>
                <div className="card-img-overlay d-flex flex-column justify-content-end" 
                     style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0))' }}>
                  <h3 className="text-white fw-bold mb-0">SpaFlow</h3>
                  <p className="text-white mb-0">ประสบการณ์การผ่อนคลายที่ดีที่สุด</p>
                </div>
              </div>
            </div>
            <div className="col-lg-7 col-xl-6 animate__animated animate__fadeIn" style={{ animation: 'fadeIn 1.5s' }}>
              <div className="d-flex align-items-center mb-4">
                <i className="fas fa-spa fa-2x me-3" style={{ color: '#FF7D29' }}></i>
                <h2 className="mb-0 fw-bold" style={{ fontSize: '2.2rem', color: '#333' }}>เกี่ยวกับเรา</h2>
              </div>
              
              <div className="mb-4">
                <div className="bg-light p-4 rounded-3 shadow-sm border-start border-5" style={{ borderColor: '#FF7D29 !important' }}>
                  <p style={{ fontSize: '1.08rem', lineHeight: 1.7 }}>
                    <i className="fas fa-quote-left me-2" style={{ color: '#FF7D29' }}></i>
                    <em>ยินดีต้อนรับสู่ SpaFlow! เราคือผู้นำด้านระบบจัดการร้านสปาและบริการลูกค้าออนไลน์ครบวงจร</em>
                    <i className="fas fa-quote-right ms-2" style={{ color: '#FF7D29' }}></i>
                  </p>
                </div>
              </div>
              
              <p style={{ fontSize: '1.08rem', lineHeight: 1.8, marginTop: 32 }}>
                <i className="fas fa-check-circle me-2" style={{ color: '#FF7D29' }}></i>
                SpaFlow ถูกพัฒนาขึ้นเพื่อเป็นระบบจัดการร้านสปาและบริการลูกค้าออนไลน์ครบวงจร ที่รองรับการทำงานทุกส่วนของธุรกิจสปา
              </p>
              <p style={{ fontSize: '1.08rem', lineHeight: 1.8 }}>
                <i className="fas fa-check-circle me-2" style={{ color: '#FF7D29' }}></i>
                เรามุ่งมั่นที่จะพัฒนาแพลตฟอร์มที่ใช้งานง่าย สะดวก และตอบโจทย์ทั้งเจ้าของร้าน พนักงาน และลูกค้า ด้วยฟีเจอร์ที่ครอบคลุมทุกความต้องการ
              </p>
              <p style={{ fontSize: '1.08rem', lineHeight: 1.8 }}>
                <i className="fas fa-check-circle me-2" style={{ color: '#FF7D29' }}></i>
                ระบบของเรารองรับการจองออนไลน์ การจัดการพนักงาน การเก็บประวัติลูกค้า และการวิเคราะห์ข้อมูลทางธุรกิจ
              </p>
              
              <div className="mt-4 pt-2">
                <div className="d-flex align-items-center mb-3">
                  <div className="icon-circle me-3" style={{ 
                    width: '50px', 
                    height: '50px', 
                    background: 'linear-gradient(45deg, #FF7D29, #FFBF78)', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(255, 153, 0, 0.3)'
                  }}>
                    <i className="fas fa-envelope fa-lg text-white"></i>
                  </div>
                  <div>
                    <h5 className="fw-bold mb-1" style={{ color: '#333' }}>ติดต่อเรา</h5>
                    <p className="mb-0">
                      <a href="mailto:phupipat.ka.65@ubu.ac.th" className="text-decoration-none" style={{ color: '#FF7D29' }}>
                        phupipat.ka.65@ubu.ac.th
                      </a>
                    </p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <a href="/contact" className="btn btn-warning btn-lg px-4" 
                     style={{ 
                       background: '#FF7D29', 
                       border: 'none',
                       borderRadius: '50px',
                       color: '#fff',
                       fontWeight: 600
                     }}>
                    <i className="fas fa-paper-plane me-2" style={{ color: '#fff' }}></i> ติดต่อเรา
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Gallery Section */}
      <section className="py-5 bg-light" style={{ 
        background: 'linear-gradient(to bottom, #f8f9fa, #e9ecef) !important' 
      }}>
        <div className="container px-4 px-lg-5">
          <div className="text-center mb-5 animate__animated animate__fadeIn" style={{ animation: 'fadeIn 1s' }}>
            <i className="fas fa-images fa-2x mb-3" style={{ color: '#FF7D29' }}></i>
            <h2 className="fw-bold mb-3" style={{ fontSize: '2.2rem', color: '#333' }}>ภาพบรรยากาศภายในร้าน</h2>
            <div className="d-flex justify-content-center">
              <div className="divider" style={{ 
                width: '80px', 
                height: '4px', 
                background: 'linear-gradient(90deg, #FF7D29 0%, #FFBF78 100%)',
                margin: '12px auto',
                borderRadius: '2px'
              }}></div>
            </div>
            <p className="text-muted col-lg-8 mx-auto">สัมผัสบรรยากาศที่ผ่อนคลายและการตกแต่งที่เป็นเอกลักษณ์ของ SpaFlow ด้วยภาพถ่ายจากสถานที่จริง</p>
          </div>
          
          <div className="row g-3">
            <div className="col-lg-4 col-md-6">
              <div className="hover-card rounded overflow-hidden shadow-sm position-relative">
                <div className="ratio ratio-1x1">
                  <img src="/assets/publicServicesimg/reat-wecome.jpg" alt="SpaFlow Reception" className="img-fluid" 
                      style={{ objectFit: 'cover', transition: 'all 0.5s ease' }} />
                </div>
                <div className="overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-end p-3"
                     style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 60%)' }}>
                  <h5 className="text-white m-0">บริเวณต้อนรับ</h5>
                </div>
              </div>
            </div>
            
            <div className="col-lg-4 col-md-6">
              <div className="hover-card rounded overflow-hidden shadow-sm position-relative">
                <div className="ratio ratio-1x1">
                  <img src="/assets/publicServicesimg/onsen-room.jpg" alt="Onsen Bath" className="img-fluid" 
                      style={{ objectFit: 'cover', transition: 'all 0.5s ease' }} />
                </div>
                <div className="overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-end p-3"
                     style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 60%)' }}>
                  <h5 className="text-white m-0">ห้องบริการออนเซ็น</h5>
                </div>
              </div>
            </div>
            
            <div className="col-lg-4 col-md-6">
              <div className="hover-card rounded overflow-hidden shadow-sm position-relative">
                <div className="ratio ratio-1x1">
                  <img src="/assets/publicServicesimg/Aromaroom.jpg" alt="Aromatherapy Room" className="img-fluid" 
                      style={{ objectFit: 'cover', transition: 'all 0.5s ease' }} />
                </div>
                <div className="overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-end p-3"
                     style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 60%)' }}>
                  <h5 className="text-white m-0">ห้องอโรม่าเธอราพี</h5>
                </div>
              </div>
            </div>
            
            <div className="col-lg-3 col-md-6">
              <div className="hover-card rounded overflow-hidden shadow-sm position-relative">
                <div className="ratio ratio-1x1">
                  <img src="/assets/publicServicesimg/spa-facial.jpg" alt="Facial Treatment" className="img-fluid" 
                      style={{ objectFit: 'cover', transition: 'all 0.5s ease' }} />
                </div>
                <div className="overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-end p-3"
                     style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 60%)' }}>
                  <h5 className="text-white m-0">บริการสปาหน้า</h5>
                </div>
              </div>
            </div>
            
            <div className="col-lg-3 col-md-6">
              <div className="hover-card rounded overflow-hidden shadow-sm position-relative">
                <div className="ratio ratio-1x1">
                  <img src="/assets/publicServicesimg/massage-thai.jpg" alt="Thai Massage Room" className="img-fluid" 
                      style={{ objectFit: 'cover', transition: 'all 0.5s ease' }} />
                </div>
                <div className="overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-end p-3"
                     style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 60%)' }}>
                  <h5 className="text-white m-0">นวดแผนไทย</h5>
                </div>
              </div>
            </div>
            
            <div className="col-lg-3 col-md-6">
              <div className="hover-card rounded overflow-hidden shadow-sm position-relative">
                <div className="ratio ratio-1x1">
                  <img src="/assets/publicServicesimg/massage-oil.jpg" alt="Oil Massage" className="img-fluid" 
                      style={{ objectFit: 'cover', transition: 'all 0.5s ease' }} />
                </div>
                <div className="overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-end p-3"
                     style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 60%)' }}>
                  <h5 className="text-white m-0">นวดน้ำมัน</h5>
                </div>
              </div>
            </div>
            
            <div className="col-lg-3 col-md-6">
              <div className="hover-card rounded overflow-hidden shadow-sm position-relative">
                <div className="ratio ratio-1x1">
                  <img src="/assets/publicServicesimg/milk-bath.jpg" alt="Milk Bath" className="img-fluid" 
                      style={{ objectFit: 'cover', transition: 'all 0.5s ease' }} />
                </div>
                <div className="overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-end p-3"
                     style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 60%)' }}>
                  <h5 className="text-white m-0">อ่างอาบนมสปา</h5>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-4">
            <a href="/services" className="btn btn-warning px-4 py-2 btn-lg" 
               style={{ 
                 background: '#FF7D29', 
                 border: 'none',
                 borderRadius: '50px',
                 color: '#fff',
                 fontWeight: 600
               }}>
              <i className="fas fa-spa me-2" style={{ color: '#fff' }}></i> ดูบริการทั้งหมด
            </a>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-top bg-light py-5 mt-0" style={{ 
        background: 'linear-gradient(to bottom, #f8f9fa, #e9ecef) !important' 
      }}>
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-4 mb-4 mb-lg-0">
              <div className="d-flex align-items-center mb-3">
                <i className="fas fa-spa fa-2x me-2" style={{ color: '#FF7D29' }}></i>
                <h5 className="fw-bold m-0" style={{ fontSize: '1.5rem' }}>SpaFlow</h5>
              </div>
              <p className="text-muted">
                สัมผัสประสบการณ์ความผ่อนคลายที่เหนือระดับ 
                ที่ออกแบบมาเพื่อการฟื้นฟูร่างกายและจิตใจของคุณโดยเฉพาะ
              </p>
              <div className="d-flex gap-3">
                <a href="https://www.facebook.com/profile.php?id=61557876865512" target="_blank" rel="noopener noreferrer" className="social-icon">
                  <i className="fab fa-facebook-f" style={{ color: '#1877f3' }}></i>
                </a>
                <a href="https://page.line.me/theretreatspa" target="_blank" rel="noopener noreferrer" className="social-icon">
                  <i className="fab fa-line" style={{ color: '#06C755' }}></i>
                </a>
                <a href="https://www.instagram.com/theretreatbkk" target="_blank" rel="noopener noreferrer" className="social-icon">
                  <i className="fab fa-instagram" style={{ color: '#E4405F' }}></i>
                </a>
              </div>
            </div>
            
            <div className="col-lg-2 col-md-6">
              <h6 className="fw-bold mb-4">ลิงค์ด่วน</h6>
              <ul className="list-unstyled">
                <li className="mb-2"><a href="/" className="text-decoration-none text-muted"><i className="fas fa-chevron-right me-2 small" style={{ color: '#FF7D29' }}></i>หน้าแรก</a></li>
                <li className="mb-2"><a href="/about" className="text-decoration-none text-muted"><i className="fas fa-chevron-right me-2 small" style={{ color: '#FF7D29' }}></i>เกี่ยวกับเรา</a></li>
                <li className="mb-2"><a href="/services" className="text-decoration-none text-muted"><i className="fas fa-chevron-right me-2 small" style={{ color: '#FF7D29' }}></i>บริการ</a></li>
                <li className="mb-2"><a href="/contact" className="text-decoration-none text-muted"><i className="fas fa-chevron-right me-2 small" style={{ color: '#FF7D29' }}></i>ติดต่อเรา</a></li>
              </ul>
            </div>
            
            <div className="col-lg-3 col-md-6">
              <h6 className="fw-bold mb-4">บริการของเรา</h6>
              <ul className="list-unstyled">
                <li className="mb-2">
                  <a href="/services" className="text-decoration-none text-muted">
                    <i className="fas fa-spa me-2 small" style={{ color: '#FF7D29' }}></i>นวดแผนไทย
                  </a>
                </li>
                <li className="mb-2">
                  <a href="/services" className="text-decoration-none text-muted">
                    <i className="fas fa-leaf me-2 small" style={{ color: '#28a745' }}></i>อโรม่าเธอราพี
                  </a>
                </li>
                <li className="mb-2">
                  <a href="/services" className="text-decoration-none text-muted">
                    <i className="fas fa-paint-brush me-2 small" style={{ color: '#17a2b8' }}></i>สปาบำรุงผิว
                  </a>
                </li>
                <li className="mb-2">
                  <a href="/services" className="text-decoration-none text-muted">
                    <i className="fas fa-hot-tub me-2 small" style={{ color: '#dc3545' }}></i>ออนเซ็น
                  </a>
                </li>
              </ul>
            </div>
            
            <div className="col-lg-3 col-md-6">
              <h6 className="fw-bold mb-4">ติดต่อเรา</h6>
              <p className="d-flex align-items-center mb-2">
                <i className="fas fa-map-marker-alt me-3" style={{ color: '#FF7D29' }}></i>
                <span className="text-muted">469/2, 469/4 อาคาร Ashton ถ. อโศก - ดินแดง</span>
              </p>
              <p className="d-flex align-items-center mb-2">
                <i className="fas fa-phone-alt me-3" style={{ color: '#FF7D29' }}></i>
                <span className="text-muted">096-342-1553</span>
              </p>
              <p className="d-flex align-items-center mb-2">
                <i className="fas fa-envelope me-3" style={{ color: '#FF7D29' }}></i>
                <span className="text-muted">phupipat.ka.65@ubu.ac.th</span>
              </p>
              <p className="d-flex align-items-center">
                <i className="fas fa-clock me-3" style={{ color: '#FF7D29' }}></i>
                <span className="text-muted">เปิดทุกวัน 10:00 - 00:00 น.</span>
              </p>
            </div>
          </div>
          
          <hr className="my-4" />
          
          <div className="row">
            <div className="col-md-6 text-center text-md-start">
              <p className="text-muted mb-0">&copy; {new Date().getFullYear()} SpaFlow. All rights reserved.</p>
            </div>
            <div className="col-md-6 text-center text-md-end">
              <img src="https://via.placeholder.com/200x30/FFFFFF/333333?text=Payment+Methods" alt="Payment Methods" height="30" />
            </div>
          </div>
        </div>
      </footer>
      
      {/* FontAwesome CDN */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      
      {/* Bootstrap JavaScript */}
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossOrigin="anonymous"></script>
    </>
  );
};

export default About;
