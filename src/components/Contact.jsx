import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Link } from "react-router-dom";

function Contact() {
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
          
          .form-control:focus {
            border-color: #FF7D29;
            box-shadow: 0 0 0 0.25rem rgba(255, 125, 41, 0.25);
          }
          
          .social-icon {
            transition: all 0.3s ease;
            width: 40px;
            height: 40px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            margin: 0 8px;
            color: white;
          }
          
          .social-icon:hover {
            transform: translateY(-5px);
          }
        `}
      </style>
      
      {/* Navbar */}
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
              <li className="nav-item"><Link className="nav-link px-lg-3 py-3 py-lg-4 fw-semibold" to="/about" style={{ color: '#000' }}><i className="fas fa-info-circle me-1"></i> เกี่ยวกับเรา</Link></li>
              <li className="nav-item"><a className="nav-link px-lg-3 py-3 py-lg-4 fw-semibold" href="/contact" style={{ color: '#FF7D29' }}><i className="fas fa-envelope me-1"></i> ติดต่อเรา</a></li>
              <li className="nav-item ms-lg-2"><a className="btn btn-warning px-4 py-2 fw-semibold" href="/login" style={{ background: '#7B4019', border: 'none', color: '#fff', borderRadius: '50px' }}><i className="fas fa-sign-in-alt me-2"></i>เข้าสู่ระบบ</a></li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Header Section */}
      <header className="masthead" style={{ 
        backgroundImage: "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.5)), url('/assets/img/contact-bg.jpg')", 
        minHeight: '60vh',
        backgroundSize: 'cover', 
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        marginTop: '76px'
      }}>
        <div className="container position-relative px-4 px-lg-5">
          <div className="row gx-4 gx-lg-5 justify-content-center">
            <div className="col-md-10 col-lg-8 col-xl-7">
              <div className="site-heading text-center text-white">
                <div className="mb-4 animate__animated animate__fadeIn" style={{ animation: 'fadeIn 1s' }}>
                  <i className="fas fa-envelope-open-text fa-3x" style={{ color: '#FF7D29', marginBottom: '20px' }}></i>
                </div>
                <h1 className="display-4 fw-bold mb-3 animate__animated animate__fadeIn" 
                    style={{ 
                      textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
                      animation: 'fadeIn 1.5s',
                      fontSize: '3.5rem'
                    }}>
                    ติดต่อเรา
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
                <div className="animate__animated animate__fadeIn" style={{ animation: 'fadeIn 2s' }}>
                  <span className="subheading fs-5" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }}>
                    <i className="fas fa-quote-left me-2" style={{ color: '#FF7D29' }}></i>
                    หากคุณมีคำถาม ข้อเสนอแนะ หรือต้องการสอบถามข้อมูลเพิ่มเติม เรายินดีให้บริการ
                    <i className="fas fa-quote-right ms-2" style={{ color: '#FF7D29' }}></i>
                  </span>
                </div>
                <div className="mt-4 animate__animated animate__fadeIn" style={{ animation: 'fadeIn 2.5s' }}>
                  <a href="#contact-form" className="btn btn-warning btn-lg px-5 py-3" 
                     style={{ 
                       background: 'linear-gradient(90deg, #FF7D29 0%, #FFBF78 100%)', 
                       border: 'none', 
                       borderRadius: '50px',
                       boxShadow: '0 5px 15px rgba(255, 153, 0, 0.3)'
                     }}>
                    <i className="fas fa-paper-plane me-2" style={{ color: '#ffffffff' }}></i> ส่งข้อความหาเรา
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contact Section */}
      <div className="container px-4 px-lg-5 py-5">
        <div className="row gx-4 gx-lg-5 justify-content-center">
          <div className="col-md-10 col-lg-10 col-xl-10">
            
            <div className="text-center mb-5">
              <div className="d-flex align-items-center justify-content-center mb-4">
                <div className="line" style={{ height: '3px', width: '50px', background: '#FF7D29', marginRight: '20px' }}></div>
                <h2 style={{ fontSize: '2.4rem', fontWeight: 700, color: '#333' }}>
                  <i className="fas fa-headset me-2" style={{ color: '#FF7D29' }}></i>
                  วิธีการติดต่อเรา
                </h2>
                <div className="line" style={{ height: '3px', width: '50px', background: '#FF7D29', marginLeft: '20px' }}></div>
              </div>
              <p className="text-muted mb-5 fs-5" style={{ maxWidth: '700px', margin: '0 auto' }}>
                มีหลากหลายช่องทางในการติดต่อเรา เลือกช่องทางที่สะดวกที่สุดสำหรับคุณ
              </p>
            </div>
            
            {/* Contact Cards */}
            <div className="row g-4 mb-5">
              <div className="col-md-3">
                <div className="card border-0 shadow h-100 hover-card text-center py-4" style={{ borderRadius: '15px' }}>
                  <div className="card-body">
                    <div className="icon-circle mb-3 mx-auto" style={{ 
                      width: '80px', 
                      height: '80px', 
                      background: 'linear-gradient(45deg, #FF7D29, #FFBF78)', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      boxShadow: '0 4px 10px rgba(255, 153, 0, 0.3)'
                    }}>
                      <i className="fas fa-map-marker-alt fa-2x text-white"></i>
                    </div>
                    <h5 className="fw-bold mb-2">ที่อยู่</h5>
                    <p className="text-muted mb-3">469/2, 469/4 อาคาร Ashton ถ. อโศก - ดินแดง<br />
                      เขตดินแดง กรุงเทพฯ 10400</p>
                    <a href="https://maps.google.com" className="btn btn-sm btn-outline-warning rounded-pill" target="_blank" rel="noopener noreferrer">
                      <i className="fas fa-directions me-1"></i> ดูแผนที่
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="col-md-3">
                <div className="card border-0 shadow h-100 hover-card text-center py-4" style={{ borderRadius: '15px' }}>
                  <div className="card-body">
                    <div className="icon-circle mb-3 mx-auto" style={{ 
                      width: '80px', 
                      height: '80px', 
                      background: 'linear-gradient(45deg, #FF7D29, #FFBF78)', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      boxShadow: '0 4px 10px rgba(40, 167, 69, 0.3)'
                    }}>
                      <i className="fas fa-phone-alt fa-2x text-white"></i>
                    </div>
                    <h5 className="fw-bold mb-2">โทรศัพท์</h5>
                    <p className="text-muted mb-3">096-342-1553<br/>088-990-6666</p>
                    <a href="tel:0963421553" className="btn btn-sm btn-outline-success rounded-pill">
                      <i className="fas fa-phone me-1"></i> โทรหาเรา
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="col-md-3">
                <div className="card border-0 shadow h-100 hover-card text-center py-4" style={{ borderRadius: '15px' }}>
                  <div className="card-body">
                    <div className="icon-circle mb-3 mx-auto" style={{ 
                      width: '80px', 
                      height: '80px', 
                      background: 'linear-gradient(45deg, #FF7D29, #FFBF78)', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      boxShadow: '0 4px 10px rgba(23, 162, 184, 0.3)'
                    }}>
                      <i className="fas fa-envelope fa-2x text-white"></i>
                    </div>
                    <h5 className="fw-bold mb-2">อีเมล</h5>
                    <p className="text-muted mb-3">phupipat.ka.65@ubu.ac.th<br/>sales@theretreatspa.com</p>
                    <a href="mailto:info@spaflow.com" className="btn btn-sm btn-outline-info rounded-pill">
                      <i className="fas fa-paper-plane me-1"></i> ส่งอีเมล
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="col-md-3">
                <div className="card border-0 shadow h-100 hover-card text-center py-4" style={{ borderRadius: '15px' }}>
                  <div className="card-body">
                    <div className="icon-circle mb-3 mx-auto" style={{ 
                      width: '80px', 
                      height: '80px', 
                      background: 'linear-gradient(45deg, #FF7D29, #FFBF78)', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      boxShadow: '0 4px 10px rgba(220, 53, 69, 0.3)'
                    }}>
                      <i className="fas fa-clock fa-2x text-white"></i>
                    </div>
                    <h5 className="fw-bold mb-2">เวลาเปิดบริการ</h5>
                    <p className="text-muted mb-3">จันทร์-อาทิตย์<br/>10:00 - 00:00 น.</p>
                    <a href="#contact-form" className="btn btn-sm btn-outline-danger rounded-pill">
                      <i className="fas fa-calendar-alt me-1"></i> จองคิว
                    </a>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Form Section */}
            <div className="row shadow rounded-4 bg-white p-0 mb-5 overflow-hidden" id="contact-form">
              {/* Map */}
              <div className="col-lg-6 p-0">
                <div className="h-100" style={{ minHeight: '400px', background: '#f8f9fa' }}>
                  <iframe 
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3542.3440416008216!2d100.56173167466618!3d13.75564498663662!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2c835eb0cd5c63df%3A0x222c52655bcb3464!2sThe%20Retreat%20Onsen%20%26%20Spa!5e1!3m2!1sen!2sth!4v1757412132346!5m2!1sen!2sth" 
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    allowFullScreen="" 
                    loading="lazy" 
                    referrerPolicy="no-referrer-when-downgrade"
                    title="SpaFlow Location"
                  ></iframe>
                </div>
              </div>

              {/* Form */}
              <div className="col-lg-6 p-4 p-lg-5">
                <div className="d-flex align-items-center mb-4">
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
                    <i className="fas fa-envelope-open-text text-white"></i>
                  </div>
                  <h3 className="fw-bold mb-0" style={{ color: '#fff' }}>ส่งข้อความหาเรา</h3>
                </div>
                <p className="text-muted mb-4">เราจะติดต่อกลับหาคุณโดยเร็วที่สุด</p>
                
                <form className="needs-validation" noValidate>
                  <div className="mb-3">
                    <div className="input-group">
                      <span className="input-group-text" style={{ background: '#fff' }}>
                        <i className="fas fa-user text-muted"></i>
                      </span>
                      <input type="text" className="form-control border-start-0" id="name" placeholder="ชื่อของคุณ" required />
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="input-group">
                      <span className="input-group-text" style={{ background: '#fff' }}>
                        <i className="fas fa-envelope text-muted"></i>
                      </span>
                      <input type="email" className="form-control border-start-0" id="email" placeholder="อีเมลของคุณ" required />
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="input-group">
                      <span className="input-group-text" style={{ background: '#fff' }}>
                        <i className="fas fa-phone text-muted"></i>
                      </span>
                      <input type="tel" className="form-control border-start-0" id="phone" placeholder="เบอร์โทรศัพท์" />
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="input-group">
                      <span className="input-group-text align-items-start" style={{ background: '#fff' }}>
                        <i className="fas fa-comment-alt text-muted mt-2"></i>
                      </span>
                      <textarea className="form-control border-start-0" id="message" rows="5" placeholder="ข้อความของคุณ" required></textarea>
                    </div>
                  </div>
                  
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="agreement" required />
                      <label className="form-check-label small text-muted" htmlFor="agreement">
                        ยอมรับเงื่อนไขการใช้บริการและนโยบายความเป็นส่วนตัว
                      </label>
                    </div>
                  </div>
                  
                  <button type="submit" className="btn btn-primary px-4 py-2 fw-semibold mt-4 w-100" style={{
                    background: 'linear-gradient(90deg, #FF7D29 0%, #FFBF78 100%)',
                    border: 'none',
                    borderRadius: '50px',
                    boxShadow: '0 4px 15px rgba(255, 125, 41, 0.3)'
                  }}>
                    <i className="fas fa-paper-plane me-2"></i>ส่งข้อความ
                  </button>
                </form>
              </div>
            </div>
            
            {/* Social Media */}
            <div className="text-center mb-5">
              <h3 className="mb-4 fw-bold" style={{ color: '#333' }}>
                <i className="fas fa-share-alt me-2" style={{ color: '#FF7D29' }}></i>
                ติดตามเรา
              </h3>
              <p className="text-muted mb-4">ติดตามข่าวสาร โปรโมชัน และกิจกรรมต่างๆ ได้ทางโซเชียลมีเดียของเรา</p>
              
              <div className="d-flex justify-content-center gap-3 flex-wrap">
                <a href="https://www.facebook.com/profile.php?id=61557876865512" target="_blank" rel="noopener noreferrer" className="social-icon" style={{ background: '#1877f3' }}>
                  <i className="fab fa-facebook-f"></i>
                </a>
                <a href="https://page.line.me/theretreatspa" target="_blank" rel="noopener noreferrer" className="social-icon" style={{ background: '#06C755' }}>
                  <i className="fab fa-line"></i>
                </a>
                <a href="https://www.instagram.com/theretreatbkk" target="_blank" rel="noopener noreferrer" className="social-icon" style={{ background: '#E4405F' }}>
                  <i className="fab fa-instagram"></i>
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="border-top bg-light py-5 mt-5" style={{ 
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
                <a href="" target="_blank" rel="noopener noreferrer" className="social-icon">
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
}

export default Contact;
