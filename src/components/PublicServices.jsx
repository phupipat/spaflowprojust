import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../styles/SharedStyles.css";
// ลบการนำเข้า Bootstrap CSS แบบนี้ออก เนื่องจากเราใช้ CDN แล้ว
// import "bootstrap/dist/css/bootstrap.min.css";

const services = [
  // นวดแผนไทย
  {
    id: "foot-massage",
    title: "นวดเท้า (Foot Massage)",
    image: "/assets/publicServicesimg/massage-Foot.jpg",
    description: "นวดเท้าเพื่อผ่อนคลายและกระตุ้นการไหลเวียนโลหิต",
    category: "massage",
    packages: [
      {  duration: "30", price: "250" },
      {  duration: "60", price: "450" },
      {  duration: "90", price: "650" },
      {  duration: "120", price: "950" }
    ]
  },
  {
    id: "thai-massage",
    title: "นวดแผนไทย (Traditional Thai Massage)",
    image: "/assets/publicServicesimg/Thai-m.jpg",
    description: "นวดแผนไทยผสมผสานกับน้ำมันธรรมชาติ เพื่อผิวเนียนนุ่มและการผ่อนคลายสูงสุด",
    category: "massage",
    packages: [
      { duration: "60", price: "490" },
      { duration: "90", price: "790" },
      { duration: "120", price: "990" }
    ]
  },
  {
    id: "neck-shoulder-massage",
    title: "นวด คอ บ่า ไหล่  (Neck, Shoulder, and Back Massage)",
    image: "/assets/publicServicesimg/massage-thai.jpg",
    description: "นวดคอ บ่า ไหล่ เพื่อบรรเทาอาการปวดเมื่อยและคลายเครียด",
    category: "massage",
    packages: [
      { duration: "60", price: "690" },
      { duration: "90", price: "990" },
      { duration: "120", price: "1190" }
    ]
  },
  {
    id: "thai-oil-massage",
    title: "นวดแผนไทยออยล์ (Thai Oil Massage)",
    image: "/assets/publicServicesimg/massage-oil.jpg",
    description: "นวดด้วยน้ำมันหอมระเหยจากสมุนไพรไทย ช่วยผ่อนคลายกล้ามเนื้อและเพิ่มความชุ่มชื้นให้ผิว",
    category: "massage",
    packages: [
      { duration: "60", price: "690" },
      { duration: "90", price: "990" },
      { duration: "120", price: "1390" }
    ]
  },
  {
    id: "herbal-compress-massage",
    title: "นวดแผนประคบ สนุมไพร (Herbal Compress Massage)",
    image: "/assets/publicServicesimg/massage-herbal.jpg",
    description: "นวดด้วยลูกประคบสมุนไพรร้อน ช่วยขับลมขับความเย็น บรรเทาอาการปวดเมื่อย",
    category: "massage",
    packages: [
      { duration: "60", price: "1090" },
      { duration: "90", price: "1690" },
      { duration: "120", price: "1990" }
    ]
  },
  // นวดอโรม่า
  {
    id: "aromatherapy-massage",
    title: "นวดอโรม่าบำบัด (Aromatherapy Massage)",
    image: "/assets/publicServicesimg/aroma-therapy.jpg",
    description: "นวดอโรม่าบำบัด ด้วยน้ำมันหอมระเหย เพื่อผ่อนคลายจิตใจและร่างกาย",
    category: "aroma",
    packages: [
      { duration: "60", price: "890" },
      { duration: "90", price: "1390" },
      { duration: "120", price: "1690" }
    ]
  },
  {
    id: "hot-stone-massage",
    title: "นวดหินร้อน (Hot Stone Massage)",
    image: "/assets/publicServicesimg/aroma-hotstone.jpg",
    description: "นวดด้วยหินร้อนธรรมชาติ ช่วยคลายกล้ามเนื้อและเพิ่มการไหลเวียนโลหิต",
    category: "aroma",
    packages: [
      { duration: "60", price: "1090" },
      { duration: "90", price: "1690" },
      { duration: "120", price: "1990" }
    ]
  },
  {
    id: "swedish-massage",
    title: "นวดสวีดิช (Swedish Massage)",
    image: "/assets/publicServicesimg/aroma-swedish.jpg",
    description: "นวดสไตล์สวีดิช เน้นการคลายเครียดและผ่อนคลายกล้ามเนื้อทั้งตัว",
    category: "aroma",
    packages: [
      { duration: "60", price: "1290" },
      { duration: "90", price: "1890" },
      { duration: "120", price: "2290" }
    ]
  },
  {
    id: "sport-massage",
    title: "นวดสปอร์ต  (Sport Massage)",
    image: "/assets/publicServicesimg/aroma-sports.jpg",
    description: "นวดสปอร์ตเพื่อฟื้นฟูกล้ามเนื้อหลังออกกำลังกาย ช่วยลดอาการบาดเจ็บ",
    category: "aroma",
    packages: [
      { duration: "60", price: "1390" },
      { duration: "90", price: "1990" },
      { duration: "120", price: "2590" }
    ]
  },

  // สปา
  {
    id: "body-scrub",
    title: "สครับผิวกาย (Body Scrub)",
    image:  "/assets/publicServicesimg/spa-bodyscrub.jpg",
    description: "ขจัดเซลล์ผิวที่เสื่อมสภาพด้วยสครับผิวสูตรพิเศษ เผยผิวใหม่ที่เนียนนุ่ม",
    category: "spa",
    packages: [
      { duration: "60", price: "1190" }
    ]
  },
  {
    id: "body-mask",
    title: "มาส์กผิวกาย (Body Mask)",
    image: "/assets/publicServicesimg/spa-bodymask.jpg",
    description: "บำรุงผิวกายด้วยมาส์กผิวจากธรรมชาติ เพื่อผิวสุขภาพดีและเปล่งปลั่ง",
    category: "spa",
    packages: [
      { duration: "60", price: "1290" }
    ]
  },
  {
    id: "facial-treatment",
    title: "นวดหน้าใส (Facial Treatment)",
    image: "/assets/publicServicesimg/spa-facial.jpg",
    description: "ฟื้นฟูผิวหน้าให้สะอาดล้ำลึกและเปล่งประกาย ด้วยผลิตภัณฑ์คุณภาพสูง",
    category: "spa",
    packages: [
      { duration: "60", price: "2190" }
    ]
  },
  {
    id: "indian-head-spa",
    title: "สปาหัวอินเดียเฮด (Indian Head Spa)",
    image: "/assets/publicServicesimg/spa-Head-Spa.jpg",
    description: "สปาหัวอินเดียเฮดเพื่อผ่อนคลายและกระตุ้นการไหลเวียนโลหิตในศีรษะ",
    category: "spa",
    packages: [
      { duration: "75", price: "990" }
    ]
  },
  // ONSEN
  {
    id: "onsen-sauna",
    title: "ออนเซ็น ซาวน่า สตรีม (ONSEN Sauna Stream)",
    image: "/assets/publicServicesimg/onsen-public.jpg",
    description: "ออนเซ็นบ่อน้ำร้อนธรรมชาติ แช่น้ำแร่ เพื่อสุขภาพและผ่อนคลายอย่างสมบูรณ์",
    category: "onsen",
    packages: [
      { duration: "45", price: "490" }
    ]
  },
  {
    id: "mineral-bath",
    title: "แช่นํ้าแร่ (Mineral bath) ",
    image: "/assets/publicServicesimg/mineral-bath.jpg",
    description: "แช่น้ำแร่ธรรมชาติในบ่อส่วนตัว พร้อมบริการครบครัน เพื่อความเป็นส่วนตัวสูงสุด",
    category: "onsen",
    packages: [
      { duration: "30", price: "650" }
    ]
  },
  {
    id: "milk-bath",
    title: "แช่น้ำนม (Milk Bath)",
    image: "/assets/publicServicesimg/milk-bath.jpg",
    description: "แช่น้ำนมธรรมชาติที่อุดมไปด้วยวิตามินและแร่ธาตุ ช่วยบำรุงผิวให้เนียนนุ่ม",
    category: "onsen",
    packages: [
      { duration: "30", price: "650" }
    ]
  },
];

const PublicServices = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [navOpen, setNavOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  
  // Use useEffect to handle menu toggle clicks to prevent flickering
  useEffect(() => {
    // Add event listener to close navbar when clicking outside
    const handleClickOutside = (event) => {
      const navbar = document.getElementById('navbarResponsive');
      const navbarToggler = document.querySelector('.navbar-toggler');
      
      if (navbar && navOpen && 
          !navbar.contains(event.target) && 
          !navbarToggler.contains(event.target)) {
        setNavOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [navOpen]);

  const categories = [
    { id: 'all', name: 'ทั้งหมด', icon: 'fas fa-th-large' },
    { id: 'massage', name: 'นวดแผนไทย', icon: 'fas fa-spa' },
    { id: 'aroma', name: 'นวดอโรม่า', icon: 'fas fa-leaf' },
    { id: 'spa', name: 'สปา', icon: 'fas fa-water' },
    { id: 'onsen', name: 'ONSEN', icon: 'fas fa-hot-tub' }
  ];

  const filteredServices = activeCategory === 'all' 
    ? services 
    : services.filter(service => service.category === activeCategory);

  return (
    <>
      {/* Custom CSS */}
      <style>
        {`          
          .hover-card {
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #e9ecef;
          }
          
          .hover-card:hover {
            border-color: #dee2e6;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          
          .service-img {
            height: 220px;
            object-fit: cover;
          }
          
          .nav-item a:hover {
            color: #FF7D29 !important;
          }
          
          .category-btn {
            border-radius: 25px;
            padding: 10px 20px;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 5px 12px 5px;
            font-size: 0.9rem;
          }
          
          .category-btn.active {
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          }
          
          .service-card {
            /* ไม่มี animations */
          }
          
          .service-badge {
            position: absolute;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            letter-spacing: 0.5px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
            z-index: 2;
            top: 12px;
            left: 12px;
          }
          
          .price-badge {
            background: linear-gradient(135deg, #ff9900, #ff7700);
            color: white;
            padding: 6px 12px;
            border-radius: 15px;
            font-size: 0.85rem;
            font-weight: 600;
            display: inline-block;
          }
          
          .service-table {
            margin: 0;
          }
          
          .service-table th {
            background: #f8f9fa;
            font-weight: 600;
            color: #495057;
            border-bottom: 2px solid #dee2e6;
            padding: 12px 8px;
          }
          
          .service-table td {
            padding: 12px 8px;
            vertical-align: middle;
            border-bottom: 1px solid #f1f3f4;
          }
          
          .service-table tr:hover {
            background: #f8f9fa;
          }
          
          .navbar-toggler:focus {
            box-shadow: none;
            outline: none;
          }
        `}
      </style>
      
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm fixed-top" id="mainNav">
        <div className="container px-4 px-lg-5">
          <Link className="navbar-brand fw-bold d-flex align-items-center" to="/" style={{ fontWeight: 800, letterSpacing: '1px', fontSize: '1.5rem', color: '#000' }}>
            <i className="fas fa-spa me-2" style={{ color: '#FF7D29' }}></i>
            SpaFlow
          </Link>
          <button 
            className="navbar-toggler border-0" 
            type="button" 
            aria-controls="navbarResponsive" 
            aria-expanded={navOpen}
            aria-label="Toggle navigation"
            onClick={(e) => {
              e.preventDefault();
              setNavOpen(prev => !prev);
            }}
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className={`collapse navbar-collapse${navOpen ? ' show' : ''}`} id="navbarResponsive">
            <ul className="navbar-nav ms-auto py-4 py-lg-0 align-items-center">
              <li className="nav-item"><Link className="nav-link px-lg-3 py-3 py-lg-4 fw-semibold" to="/" style={{ color: '#000' }}><i className="fas fa-home me-1"></i> หน้าหลัก</Link></li>
              <li className="nav-item"><Link className="nav-link px-lg-3 py-3 py-lg-4 fw-semibold" to="/Services" style={{ color: '#FF7D29' }}><i className="fas fa-concierge-bell me-1"></i> บริการ</Link></li>
              <li className="nav-item"><Link className="nav-link px-lg-3 py-3 py-lg-4 fw-semibold" to="/about" style={{ color: '#000' }}><i className="fas fa-info-circle me-1"></i> เกี่ยวกับเรา</Link></li>
              <li className="nav-item"><Link className="nav-link px-lg-3 py-3 py-lg-4 fw-semibold" to="/contact" style={{ color: '#000' }}><i className="fas fa-envelope me-1"></i> ติดต่อเรา</Link></li>
              <li className="nav-item ms-lg-2">
                <Link
                  className="btn btn-warning px-4 py-2 fw-semibold"
                  to="/login"
                  style={{
                    background: '#7B4019',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '50px',
                    fontWeight: 600, // เพิ่มความหนาให้เหมือนหน้าอื่น
                    fontSize: '1rem', // ปรับขนาดฟอนต์ให้เหมือนหน้าอื่น
                    letterSpacing: '0.5px' // เพิ่มระยะห่างตัวอักษร
                  }}
                >
                  <i className="fas fa-sign-in-alt me-2"></i>เข้าสู่ระบบ
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="masthead" style={{ 
        backgroundImage: "linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.6)), url('/assets/img/spa-shop.jpg')", 
        minHeight: '50vh',
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
              <div className="page-heading text-white text-center">
                <div className="mb-4">
                  <i className="fas fa-concierge-bell fa-3x" style={{ color: '#FF7D29', marginBottom: '20px' }}></i>
                </div>
                <h1 className="display-4 fw-bold mb-3" 
                    style={{ 
                      textShadow: '2px 2px 4px rgba(0,0,0,0.7)'
                      /* ลบ animation */
                    }}>
                    บริการของเรา
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
                <span className="subheading fs-5" 
                      style={{ 
                        textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
                        /* ลบ animation */
                      }}>
                  <i className="fas fa-star me-2" style={{ color: '#FF7D29' }}></i>
                  มาสัมผัสความลับของการผ่อนคลาย
                  <i className="fas fa-star ms-2" style={{ color: '#FF7D29' }}></i>
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <div className="container py-5" style={{ background: '#ffffff', minHeight: '100vh' }}>
      
      {/* Category Filter */}
      <div className="text-center mb-5">
        <div className="d-flex align-items-center justify-content-center mb-4">
          <div className="line" style={{ height: '3px', width: '50px', background: '#FF7D29', marginRight: '20px' }}></div>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 700, color: '#333' }}>
            <i className="fas fa-list-alt me-2" style={{ color: '#FF7D29' }}></i>
            ประเภทบริการ
          </h2>
          <div className="line" style={{ height: '3px', width: '50px', background: '#FF7D29', marginLeft: '20px' }}></div>
        </div>
        <p className="text-muted mb-5 fs-5" style={{ maxWidth: '700px', margin: '0 auto' }}>
          เลือกประเภทบริการที่คุณสนใจ เพื่อดูรายละเอียดเพิ่มเติม
        </p>
        
        <div className="d-flex flex-wrap justify-content-center mb-5">
          {categories.map(category => {
            let btnColor, textColor, bgColor, borderColor;
            
            switch(category.id) {
              case 'massage':
                btnColor = activeCategory === category.id ? 'btn-warning' : 'btn-outline-warning';
                bgColor = activeCategory === category.id ? '#FF7D29' : 'transparent';
                textColor = activeCategory === category.id ? 'white' : '#FF7D29';
                borderColor = '#FF7D29';
                break;
              case 'aroma':
                btnColor = activeCategory === category.id ? 'btn-success' : 'btn-outline-success';
                bgColor = activeCategory === category.id ? '#28a745' : 'transparent';
                textColor = activeCategory === category.id ? 'white' : '#28a745';
                borderColor = '#28a745';
                break;
              case 'spa':
                btnColor = activeCategory === category.id ? 'btn-info' : 'btn-outline-info';
                bgColor = activeCategory === category.id ? '#17a2b8' : 'transparent';
                textColor = activeCategory === category.id ? 'white' : '#17a2b8';
                borderColor = '#17a2b8';
                break;
              case 'onsen':
                btnColor = activeCategory === category.id ? 'btn-danger' : 'btn-outline-danger';
                bgColor = activeCategory === category.id ? '#dc3545' : 'transparent';
                textColor = activeCategory === category.id ? 'white' : '#dc3545';
                borderColor = '#dc3545';
                break;
              default:
                btnColor = activeCategory === category.id ? 'btn-dark' : 'btn-outline-dark';
                bgColor = activeCategory === category.id ? '#343a40' : 'transparent';
                textColor = activeCategory === category.id ? 'white' : '#343a40';
                borderColor = '#343a40';
            }
            
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`btn ${btnColor} category-btn`}
                style={{
                  background: bgColor,
                  color: textColor,
                  borderColor: borderColor
                }}
              >
                <i className={`${category.icon} me-2`}></i>
                {category.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Services Grid */}
      <div className="row justify-content-center g-4">
        {filteredServices.map((service, idx) => {
          let badgeColor, badgeBg, iconClass;
            
          switch(service.category) {
            case 'massage':
              badgeColor = '#fff';
              badgeBg = '#FF7D29';
              iconClass = 'fas fa-spa';
              break;
            case 'aroma':
              badgeColor = '#fff';
              badgeBg = '#28a745';
              iconClass = 'fas fa-leaf';
              break;
            case 'spa':
              badgeColor = '#fff';
              badgeBg = '#17a2b8';
              iconClass = 'fas fa-paint-brush';
              break;
            case 'onsen':
              badgeColor = '#fff';
              badgeBg = '#dc3545';
              iconClass = 'fas fa-hot-tub';
              break;
            default:
              badgeColor = '#fff';
              badgeBg = '#6c757d';
              iconClass = 'fas fa-spa';
          }
          
          return (
            <div className="col-12 col-sm-6 col-md-4 col-lg-3 mb-4" key={idx}>
              <div className="card h-100 hover-card service-card">
                <div style={{ position: 'relative' }}>
                  <span className="service-badge" style={{ 
                    background: badgeBg, 
                    color: badgeColor
                  }}>
                    <i className={`${iconClass} me-1`} style={{ fontSize: '0.7rem' }}></i>
                    {service.category === 'massage' ? 'นวดไทย' : 
                     service.category === 'aroma' ? 'อโรม่า' :
                     service.category === 'spa' ? 'สปา' : 'ONSEN'}
                  </span>
                  <img
                    src={service.image}
                    className="card-img-top service-img"
                    alt={service.title}
                    onError={(e) => { 
                      e.target.onerror = null; 
                      e.target.src="https://placehold.co/600x400/cccccc/333333?text=รูปภาพไม่พร้อมใช้งาน"; 
                    }}
                  />
                </div>
                <div className="card-body p-4">
                  <h6 className="card-title fw-bold mb-3" style={{ 
                    fontSize: '1rem',
                    lineHeight: 1.4,
                    color: '#2c3e50'
                  }}>
                    {service.title}
                  </h6>
                  <p className="card-text text-muted mb-3" style={{ 
                    fontSize: '0.85rem', 
                    lineHeight: 1.5,
                    height: '40px',
                    overflow: 'hidden'
                  }}>
                    {service.description}
                  </p>
                  
                  {/* แสดงช่วงราคาและเวลา */}
                  {service.packages && (
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <small className="text-muted">
                          <i className="far fa-clock me-1" style={{ color: badgeBg }}></i>
                          {service.packages.length > 1 ? 
                            `${service.packages[0].duration}-${service.packages[service.packages.length-1].duration} นาที` : 
                            `${service.packages[0].duration} นาที`}
                        </small>
                        <span className="price-badge" style={{ background: badgeBg }}>
                          {service.packages.length > 1 ? 
                            `฿${service.packages[0].price}-${service.packages[service.packages.length-1].price}` : 
                            `฿${service.packages[0].price}`}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="d-grid">
                    <div className="card" style={{ background: `${badgeBg}10`, border: `1px solid ${badgeBg}30`, borderRadius: '8px' }}>
                      <div className="card-body p-3">
                        <h6 className="fw-bold mb-2" style={{ color: badgeBg, fontSize: '0.9rem' }}>
                          <i className="fas fa-info-circle me-1"></i> รายละเอียด
                        </h6>
                        
                        {/* แสดงแพ็กเกจทั้งหมด */}
                        {service.packages && service.packages.map((pkg, pkgIdx) => (
                          <div key={pkgIdx} className="d-flex justify-content-between align-items-center mb-1">
                            <span className="small text-muted">
                              <i className="far fa-clock me-1" style={{ color: badgeBg }}></i>
                              {pkg.duration} นาที
                            </span>
                            <span className="fw-bold small" style={{ color: badgeBg }}>
                              ฿{pkg.price}
                            </span>
                          </div>
                        ))}
                        
                        <hr className="my-2" style={{ borderColor: `${badgeBg}30` }} />
                        
                        <div className="text-center mb-2">
                          <small className="text-muted">
                            <i className="fas fa-calendar-alt me-1" style={{ color: badgeBg }}></i>
                            เปิดทุกวัน 10:00 - 00:00 น.
                          </small>
                        </div>
                        
                        {/* ปุ่มดูรายละเอียดเพิ่มเติม */}
                        <div className="d-grid mt-3">
                          <button
                            className="btn btn-sm"
                            style={{
                              background: badgeBg,
                              color: 'white',
                              border: 'none',
                              borderRadius: '20px',
                              fontSize: '0.8rem',
                              fontWeight: '500'
                            }}
                            onClick={() => setSelectedService(service)}
                          >
                            <i className="fas fa-eye me-1"></i> ดูรายละเอียดเพิ่มเติม
                          </button>
                        </div>
      {/* Overlay การ์ดรายละเอียดบริการ */}
      {selectedService && (
        <div
          className="d-flex justify-content-center align-items-center"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'transparent', // โปร่งใสเล็กน้อย
            backdropFilter: 'blur(8px)',         // เพิ่มเบลอพื้นหลัง
            WebkitBackdropFilter: 'blur(8px)',   // รองรับ Safari
            zIndex: 2000
          }}
        >
          <div className="bg-white rounded shadow-lg p-4" style={{ maxWidth: 480, width: '100%', position: 'relative', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', background: 'rgba(255,255,255,0.95)', border: '1px solid #eee' }}>
            <button className="btn-close position-absolute end-0 mt-2 me-2" style={{ zIndex: 10 }} onClick={() => setSelectedService(null)} aria-label="Close"></button>
            <h4 className="fw-bold mb-3 text-center" style={{ color: '#2c3e50', background: 'linear-gradient(90deg, #fffbe6 60%, #fff)', borderRadius: '12px', padding: '12px 0 8px 0' }}>{selectedService.title}</h4>
            <div className="text-center mb-3">
              <img src={selectedService.image} alt={selectedService.title} style={{ maxWidth: 260, maxHeight: 160, objectFit: 'cover', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }} onError={e => {e.target.onerror=null; e.target.src="https://placehold.co/600x400/cccccc/333333?text=รูปภาพไม่พร้อมใช้งาน";}} />
            </div>
            <p className="text-muted text-center mb-4" style={{ fontSize: '1.05rem' }}>{selectedService.description}</p>
            <h6 className="fw-bold text-center mb-3" style={{ color: '#FF7D29', fontSize: '1.1rem' }}>ราคาบริการ</h6>
            <div className="row g-2 mb-4">
              {selectedService.packages.map((pkg, i) => (
                <div className="col-6" key={i}>
                  <div className="bg-light rounded p-3 text-center" style={{ background: '#fffbe6', border: '1px solid #FFEEA9' }}>
                    <div className="fw-bold" style={{ color: '#333', fontSize: '1rem' }}>{pkg.duration} นาที</div>
                    <div className="fw-bold mt-1" style={{ color: '#FF7D29', fontSize: '1.1rem' }}>฿{pkg.price}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="row g-2 mb-2">
              <div className="col-6">
                <div className="bg-light rounded p-2 text-center" style={{ background: '#f8f9fa' }}>
                  <i className="fas fa-leaf" style={{ color: '#28a745', fontSize: '1.2rem' }}></i>
                  <div className="small">ธรรมชาติ 100%</div>
                </div>
              </div>
              <div className="col-6">
                <div className="bg-light rounded p-2 text-center" style={{ background: '#f8f9fa' }}>
                  <i className="fas fa-user-md" style={{ color: '#17a2b8', fontSize: '1.2rem' }}></i>
                  <div className="small">ผู้เชี่ยวชาญ</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* No services message */}
      {filteredServices.length === 0 && (
        <div className="text-center py-5">
          <i className="fas fa-search fa-3x text-muted mb-3"></i>
          <h5 className="text-muted">ไม่พบบริการในหมวดหมู่นี้</h5>
        </div>
      )}
    </div>

    {/* Footer */}
    <footer className="border-top bg-light py-5 mt-5">
      <div className="container">
        <div className="row g-4">
          {/* Company Info */}
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
          
          {/* Quick Links */}
          <div className="col-lg-2 col-md-6">
            <h6 className="fw-bold mb-4">ลิงค์ด่วน</h6>
            <ul className="list-unstyled">
              <li className="mb-2"><Link to="/" className="text-decoration-none text-muted"><i className="fas fa-chevron-right me-2 small" style={{ color: '#FF7D29' }}></i>หน้าแรก</Link></li>
              <li className="mb-2"><Link to="/about" className="text-decoration-none text-muted"><i className="fas fa-chevron-right me-2 small" style={{ color: '#FF7D29' }}></i>เกี่ยวกับเรา</Link></li>
              <li className="mb-2"><Link to="/services" className="text-decoration-none text-muted"><i className="fas fa-chevron-right me-2 small" style={{ color: '#FF7D29' }}></i>บริการ</Link></li>
              <li className="mb-2"><Link to="/contact" className="text-decoration-none text-muted"><i className="fas fa-chevron-right me-2 small" style={{ color: '#FF7D29' }}></i>ติดต่อเรา</Link></li>
            </ul>
          </div>
          
          {/* Services */}
          <div className="col-lg-3 col-md-6">
            <h6 className="fw-bold mb-4">บริการของเรา</h6>
            <ul className="list-unstyled">
              <li className="mb-2">
                <button 
                  onClick={() => {setActiveCategory('massage'); window.scrollTo({top: 0, behavior: 'smooth'})}} 
                  className="text-decoration-none text-muted bg-transparent border-0 p-0"
                >
                  <i className="fas fa-spa me-2 small" style={{ color: '#FF7D29' }}></i>นวดแผนไทย
                </button>
              </li>
              <li className="mb-2">
                <button 
                  onClick={() => {setActiveCategory('aroma'); window.scrollTo({top: 0, behavior: 'smooth'})}} 
                  className="text-decoration-none text-muted bg-transparent border-0 p-0"
                >
                  <i className="fas fa-leaf me-2 small" style={{ color: '#28a745' }}></i>อโรม่าเธอราพี
                </button>
              </li>
              <li className="mb-2">
                <button 
                  onClick={() => {setActiveCategory('spa'); window.scrollTo({top: 0, behavior: 'smooth'})}} 
                  className="text-decoration-none text-muted bg-transparent border-0 p-0"
                >
                  <i className="fas fa-paint-brush me-2 small" style={{ color: '#17a2b8' }}></i>สปาบำรุงผิว
                </button>
              </li>
              <li className="mb-2">
                <button 
                  onClick={() => {setActiveCategory('onsen'); window.scrollTo({top: 0, behavior: 'smooth'})}} 
                  className="text-decoration-none text-muted bg-transparent border-0 p-0"
                >
                  <i className="fas fa-hot-tub me-2 small" style={{ color: '#dc3545' }}></i>ออนเซ็น
                </button>
              </li>
            </ul>
          </div>
          
          {/* Contact */}
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
    {/* Bootstrap CSS */}
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossOrigin="anonymous" />
    </>
  );
};

// Main App component to render PublicServices
function App() {
  return <PublicServices />;
}

export default App;


