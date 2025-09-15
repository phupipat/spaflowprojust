import React from "react";
import { Link } from "react-router-dom";

const Home = () => {
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
        `}
      </style>
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm fixed-top" id="mainNav">
        <div className="container px-4 px-lg-5">
          <Link className="navbar-brand fw-bold d-flex align-items-center" to="/" style={{ fontWeight: 800, letterSpacing: '1px', fontSize: '1.5rem', color: '#000', textDecoration: 'none' }}>
            <i className="fas fa-spa me-2" style={{ color: '#FF7D29' }}></i>
            SpaFlow
          </Link>
          <button className="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarResponsive" aria-controls="navbarResponsive" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarResponsive">
            <ul className="navbar-nav ms-auto py-4 py-lg-0 align-items-center">
              <li className="nav-item"><Link className="nav-link px-lg-3 py-3 py-lg-4 fw-semibold" to="/" style={{ color: '#000' }}><i className="fas fa-home me-1"></i> หน้าหลัก</Link></li>
              <li className="nav-item"><Link className="nav-link px-lg-3 py-3 py-lg-4 fw-semibold" to="/services" style={{ color: '#000' }}><i className="fas fa-concierge-bell me-1"></i> บริการ</Link></li>
              <li className="nav-item"><Link className="nav-link px-lg-3 py-3 py-lg-4 fw-semibold" to="/about" style={{ color: '#000' }}><i className="fas fa-info-circle me-1"></i> เกี่ยวกับเรา</Link></li>
              <li className="nav-item"><Link className="nav-link px-lg-3 py-3 py-lg-4 fw-semibold" to="/contact" style={{ color: '#000' }}><i className="fas fa-envelope me-1"></i> ติดต่อเรา</Link></li>
              <li className="nav-item ms-lg-2"><Link className="btn btn-warning px-4 py-2 fw-semibold" to="/login" style={{ background: '#7B4019', border: 'none', color: '#fff', borderRadius: '50px', textDecoration: 'none' }}><i className="fas fa-sign-in-alt me-2"></i>เข้าสู่ระบบ</Link></li>
            </ul>
          </div>
        </div>
      </nav>
      
      {/* Header */}
      <header className="masthead d-flex align-items-center justify-content-center" style={{ 
        backgroundImage: "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.5)), url('/assets/img/backgr.jpg')", 
        minHeight: '100vh', 
        backgroundSize: 'cover', 
        backgroundPosition: 'center', 
        backgroundAttachment: 'fixed' 
      }}>
        <div className="container position-relative px-4 px-lg-5">
          <div className="row justify-content-center">
            <div className="col-12 col-md-10 col-lg-8 text-center">
              <div className="site-heading text-white">
                <div className="mb-4 animate__animated animate__fadeIn" style={{ animation: 'fadeIn 1s' }}>
                  <i className="fas fa-spa fa-3x" style={{ color: '#FF7D29', marginBottom: '15px' }}></i>
                </div>
                <h1 className="display-1 fw-bold mb-4 animate__animated animate__fadeIn" 
                    style={{ 
                      fontSize: '4.5rem', 
                      fontWeight: 800, 
                      letterSpacing: '3px', 
                      textShadow: '3px 3px 6px rgba(0,0,0,0.7)',
                      animation: 'fadeIn 1.5s'
                    }}>
                    <span style={{ color: '#FF7D29' }}>Spa</span>Flow
                </h1>
                <div className="mx-auto" style={{ maxWidth: '700px' }}>
                  <p className="lead mb-3 animate__animated animate__fadeIn" 
                      style={{ 
                        fontSize: '1.4rem', 
                        letterSpacing: '1px', 
                        lineHeight: '1.6',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
                        animation: 'fadeIn 2s'
                      }}>
                      <i className="fas fa-star me-2" style={{ color: '#ff9900' }}></i>
                      ระบบจัดการร้านสปาและบริการลูกค้าออนไลน์ครบวงจร
                  </p>
                  <p className="fs-5 mb-4 animate__animated animate__fadeIn" 
                      style={{ 
                        letterSpacing: '0.5px', 
                        textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                        animation: 'fadeIn 2.5s'
                      }}>
                      <i className="fas fa-heart me-2" style={{ color: '#ff5e62' }}></i>
                      ประสบการณ์การผ่อนคลายที่ดีที่สุด
                  </p>
                </div>
                
                <div className="mt-5 animate__animated animate__fadeIn" style={{ animation: 'fadeIn 3s' }}>
                  <Link to="/services" className="btn btn-warning btn-lg px-5 py-3 me-3 mb-3 mb-sm-0" 
                      style={{ 
                        background: '#FF7D29', 
                        border: 'none', 
                        borderRadius: '50px',
                        boxShadow: '0 5px 15px rgba(255, 153, 0, 0.3)',
                        textDecoration: 'none'
                      }}>
                    <i className="fas fa-concierge-bell me-2" style={{ color: '#fff' }}></i> <span style={{ color: '#fff' }}>ดูบริการของเรา</span>
                  </Link>
                  <Link to="/login" className="btn btn-outline-light btn-lg px-5 py-3" 
                      style={{ 
                        borderRadius: '50px',
                        boxShadow: '0 5px 15px rgba(255, 255, 255, 0.1)',
                        textDecoration: 'none'
                      }}>
                    <i className="fas fa-sign-in-alt me-2"></i> เข้าสู่ระบบ
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="container px-4 px-lg-5 py-5">
        <div className="row gx-4 gx-lg-5 justify-content-center">
          <div className="col-md-10 col-lg-8 col-xl-7">
            
            {/* Service Categories */}
            <div className="text-center mb-5">
              <div className="d-flex align-items-center justify-content-center mb-4">
                <div className="line" style={{ height: '3px', width: '50px', background: '#ff9900', marginRight: '20px' }}></div>
                <h2 style={{ fontSize: '2.8rem', fontWeight: 700, color: '#333' }}>
                  <i className="fas fa-concierge-bell me-2" style={{ color: '#ff9900' }}></i>
                  ประเภทบริการ
                </h2>
                <div className="line" style={{ height: '3px', width: '50px', background: '#ff9900', marginLeft: '20px' }}></div>
              </div>
              <p className="text-muted mb-5" style={{ maxWidth: '700px', margin: '0 auto', fontSize: '1.1rem' }}>
                บริการคุณภาพที่คัดสรรมาเพื่อประสบการณ์ผ่อนคลายที่ดีที่สุด
              </p>
              <div className="row g-4">
                <div className="col-md-3 col-6">
                  <div className="text-center p-4 h-100 border-0 rounded-4 shadow hover-card" style={{ backgroundColor: '#fff', transition: 'all 0.3s ease', cursor: 'pointer' }}>
                    <div className="icon-circle mb-3" style={{ 
                      width: '80px', 
                      height: '80px', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      margin: '0 auto',
                      background: 'linear-gradient(45deg, #ff9900, #ff5e62)'
                    }}>
                      <i className="fas fa-spa fa-2x text-white"></i>
                    </div>
                    <h5 className="fw-bold mb-2" style={{ color: '#333' }}>นวดแผนไทย</h5>
                    <p className="text-muted small">นวดไทยแผนโบราณเพื่อการผ่อนคลาย</p>
                    <Link to="/services" className="text-decoration-none" style={{ color: '#ff9900', fontWeight: '600', fontSize: '0.9rem' }}>
                      ดูเพิ่มเติม <i className="fas fa-angle-right ms-1"></i>
                    </Link>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="text-center p-4 h-100 border-0 rounded-4 shadow hover-card" style={{ backgroundColor: '#fff', transition: 'all 0.3s ease', cursor: 'pointer' }}>
                    <div className="icon-circle mb-3" style={{ 
                      width: '80px', 
                      height: '80px', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      margin: '0 auto',
                      background: 'linear-gradient(45deg, #28a745, #20c997)'
                    }}>
                      <i className="fas fa-leaf fa-2x text-white"></i>
                    </div>
                    <h5 className="fw-bold mb-2" style={{ color: '#333' }}>อโรมาเธอราปี</h5>
                    <p className="text-muted small">น้ำมันหอมระเหยเพื่อสุขภาพ</p>
                    <Link to="/services" className="text-decoration-none" style={{ color: '#28a745', fontWeight: '600', fontSize: '0.9rem' }}>
                      ดูเพิ่มเติม <i className="fas fa-angle-right ms-1"></i>
                    </Link>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="text-center p-4 h-100 border-0 rounded-4 shadow hover-card" style={{ backgroundColor: '#fff', transition: 'all 0.3s ease', cursor: 'pointer' }}>
                    <div className="icon-circle mb-3" style={{ 
                      width: '80px', 
                      height: '80px', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      margin: '0 auto',
                      background: 'linear-gradient(45deg, #17a2b8, #0dcaf0)'
                    }}>
                      <i className="fas fa-paint-brush fa-2x text-white"></i>
                    </div>
                    <h5 className="fw-bold mb-2" style={{ color: '#333' }}>สปาทรีทเมนต์</h5>
                    <p className="text-muted small">ทรีทเมนต์ผิวเพื่อความงาม</p>
                    <Link to="/services" className="text-decoration-none" style={{ color: '#17a2b8', fontWeight: '600', fontSize: '0.9rem' }}>
                      ดูเพิ่มเติม <i className="fas fa-angle-right ms-1"></i>
                    </Link>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="text-center p-4 h-100 border-0 rounded-4 shadow hover-card" style={{ backgroundColor: '#fff', transition: 'all 0.3s ease', cursor: 'pointer' }}>
                    <div className="icon-circle mb-3" style={{ 
                      width: '80px', 
                      height: '80px', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      margin: '0 auto',
                      background: 'linear-gradient(45deg, #dc3545, #fd7e14)'
                    }}>
                      <i className="fas fa-hot-tub fa-2x text-white"></i>
                    </div>
                    <h5 className="fw-bold mb-2" style={{ color: '#333' }}>ONSEN</h5>
                    <p className="text-muted small">บ่อน้ำร้อนสำหรับผ่อนคลาย</p>
                    <Link to="/services" className="text-decoration-none" style={{ color: '#dc3545', fontWeight: '600', fontSize: '0.9rem' }}>
                      ดูเพิ่มเติม <i className="fas fa-angle-right ms-1"></i>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="position-relative py-5 my-5">
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(to right, rgba(0,0,0,0), rgba(0,0,0,0.1), rgba(0,0,0,0))',
                zIndex: 1
              }}></div>
              
              <div className="text-center position-absolute start-50 top-0 translate-middle bg-white px-4" style={{ zIndex: 2 }}>
                <i className="fas fa-star text-warning"></i>
              </div>

              {/* Contact Information */}
              <div className="mb-5 pt-4">
                <div className="d-flex align-items-center justify-content-center mb-4">
                  <div className="line" style={{ height: '3px', width: '50px', background: '#ff9900', marginRight: '20px' }}></div>
                  <h2 style={{ fontSize: '2.8rem', fontWeight: 700, color: '#333' }}>
                    <i className="fas fa-address-card me-2" style={{ color: '#ff9900' }}></i>
                    ข้อมูลติดต่อ
                  </h2>
                  <div className="line" style={{ height: '3px', width: '50px', background: '#ff9900', marginLeft: '20px' }}></div>
                </div>
                <p className="text-muted text-center mb-5" style={{ maxWidth: '700px', margin: '0 auto', fontSize: '1.1rem' }}>
                  สามารถติดต่อเราได้หลากหลายช่องทาง เพื่อความสะดวกของคุณ
                </p>
                <div className="row g-4">
                  <div className="col-md-6">
                    <div className="card border-0 shadow h-100 hover-card" style={{ borderRadius: '15px', overflow: 'hidden' }}>
                      <div className="card-body p-4">
                        <div className="d-flex align-items-center mb-3">
                          <div className="icon-circle me-3" style={{ 
                            width: '60px', 
                            height: '60px', 
                            background: 'linear-gradient(45deg, #ff9900, #ff5e62)', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            boxShadow: '0 4px 10px rgba(255, 153, 0, 0.3)'
                          }}>
                            <i className="fas fa-map-marker-alt fa-2x text-white"></i>
                          </div>
                          <div>
                            <h5 className="fw-bold mb-1" style={{ color: '#333' }}>ที่อยู่</h5>
                            <p className="text-muted mb-0">469/2, 469/4 อาคาร Ashton ถ. อโศก - ดินแดง <br/>เขตแขวงดินแดง  กรุงเทพมหานคร 10400</p>
                          </div>
                        </div>
                        <a href="https://maps.google.com" className="btn btn-sm btn-outline-primary mt-3" target="_blank" rel="noopener noreferrer">
                          <i className="fas fa-directions me-2"></i> เส้นทางการเดินทาง
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card border-0 shadow h-100 hover-card" style={{ borderRadius: '15px', overflow: 'hidden' }}>
                      <div className="card-body p-4">
                        <div className="d-flex align-items-center mb-3">
                          <div className="icon-circle me-3" style={{ 
                            width: '60px', 
                            height: '60px', 
                            background: 'linear-gradient(45deg, #28a745, #20c997)', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            boxShadow: '0 4px 10px rgba(40, 167, 69, 0.3)'
                          }}>
                            <i className="fas fa-phone-alt fa-2x text-white"></i>
                          </div>
                          <div>
                            <h5 className="fw-bold mb-1" style={{ color: '#333' }}>โทรศัพท์</h5>
                            <p className="text-muted mb-0">096-342-1553<br/>หรือ 088-990-6666</p>
                          </div>
                        </div>
                        <a href="tel:0963421553" className="btn btn-sm btn-outline-success mt-3">
                          <i className="fas fa-phone me-2"></i> โทรหาเรา
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card border-0 shadow h-100 hover-card" style={{ borderRadius: '15px', overflow: 'hidden' }}>
                      <div className="card-body p-4">
                        <div className="d-flex align-items-center mb-3">
                          <div className="icon-circle me-3" style={{ 
                            width: '60px', 
                            height: '60px', 
                            background: 'linear-gradient(45deg, #17a2b8, #0dcaf0)', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            boxShadow: '0 4px 10px rgba(23, 162, 184, 0.3)'
                          }}>
                            <i className="fas fa-envelope fa-2x text-white"></i>
                          </div>
                          <div>
                            <h5 className="fw-bold mb-1" style={{ color: '#333' }}>อีเมล</h5>
                            <p className="text-muted mb-0">phupipat.ka.65@ubu.ac.th<br/>sales@theretreatspa.com</p>
                          </div>
                        </div>
                        <a href="mailto:phupipat.ka.65@ubu.ac.th" className="btn btn-sm btn-outline-info mt-3">
                          <i className="fas fa-paper-plane me-2"></i> ส่งอีเมล
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card border-0 shadow h-100 hover-card" style={{ borderRadius: '15px', overflow: 'hidden' }}>
                      <div className="card-body p-4">
                        <div className="d-flex align-items-center mb-3">
                          <div className="icon-circle me-3" style={{ 
                            width: '60px', 
                            height: '60px', 
                            background: 'linear-gradient(45deg, #dc3545, #fd7e14)', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            boxShadow: '0 4px 10px rgba(220, 53, 69, 0.3)'
                          }}>
                            <i className="fas fa-clock fa-2x text-white"></i>
                          </div>
                          <div>
                            <h5 className="fw-bold mb-1" style={{ color: '#333' }}>เวลาเปิด-ปิด</h5>
                            <p className="text-muted mb-0">จันทร์-อาทิตย์<br/>10:00 - 00:00 น.</p>
                          </div>
                        </div>
                        <Link to="/login" className="btn btn-sm btn-outline-danger mt-3">
                          <i className="fas fa-calendar-alt me-2"></i> จองคิวล่วงหน้า
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(to right, rgba(0,0,0,0), rgba(0,0,0,0.1), rgba(0,0,0,0))',
                zIndex: 1
              }}></div>
              
              <div className="text-center position-absolute start-50 bottom-0 translate-middle bg-white px-4" style={{ zIndex: 2 }}>
                <i className="fas fa-star text-warning"></i>
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
                <a href="https://www.instagram.com/theretreatbkk" target="_blank" rel="noopener noreferrer" className="social-icon">
                  <i className="fab fa-instagram" style={{ color: '#E4405F' }}></i>
                </a>
              </div>
            </div>
            
            <div className="col-lg-2 col-md-6">
              <h6 className="fw-bold mb-4">ลิงค์ด่วน</h6>
              <ul className="list-unstyled">
                <li className="mb-2"><Link to="/" className="text-decoration-none text-muted"><i className="fas fa-chevron-right me-2 small" style={{ color: '#FF7D29' }}></i>หน้าแรก</Link></li>
                <li className="mb-2"><Link to="/about" className="text-decoration-none text-muted"><i className="fas fa-chevron-right me-2 small" style={{ color: '#FF7D29' }}></i>เกี่ยวกับเรา</Link></li>
                <li className="mb-2"><Link to="/services" className="text-decoration-none text-muted"><i className="fas fa-chevron-right me-2 small" style={{ color: '#FF7D29' }}></i>บริการ</Link></li>
                <li className="mb-2"><Link to="/contact" className="text-decoration-none text-muted"><i className="fas fa-chevron-right me-2 small" style={{ color: '#FF7D29' }}></i>ติดต่อเรา</Link></li>
              </ul>
            </div>
            
            <div className="col-lg-3 col-md-6">
              <h6 className="fw-bold mb-4">บริการของเรา</h6>
              <ul className="list-unstyled">
                <li className="mb-2">
                  <Link to="/services" className="text-decoration-none text-muted">
                    <i className="fas fa-spa me-2 small" style={{ color: '#FF7D29' }}></i>นวดแผนไทย
                  </Link>
                </li>
                <li className="mb-2">
                  <Link to="/services" className="text-decoration-none text-muted">
                    <i className="fas fa-leaf me-2 small" style={{ color: '#28a745' }}></i>อโรม่าเธอราพี
                  </Link>
                </li>
                <li className="mb-2">
                  <Link to="/services" className="text-decoration-none text-muted">
                    <i className="fas fa-paint-brush me-2 small" style={{ color: '#17a2b8' }}></i>สปาบำรุงผิว
                  </Link>
                </li>
                <li className="mb-2">
                  <Link to="/services" className="text-decoration-none text-muted">
                    <i className="fas fa-hot-tub me-2 small" style={{ color: '#dc3545' }}></i>ออนเซ็น
                  </Link>
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

export default Home;


