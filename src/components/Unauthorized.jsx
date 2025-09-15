import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/NotFoundStyles.css';

const Unauthorized = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [stars, setStars] = useState([]);

  useEffect(() => {
    // Create random star positions
    const newStars = [];
    for (let i = 0; i < 50; i++) {
      newStars.push({
        x: Math.random(),
        y: Math.random(),
      });
    }
    setStars(newStars);
    
    // Add CSS variables for star positions
    const starsElements = document.querySelectorAll('.stars, .stars2, .stars3');
    starsElements.forEach(el => {
      el.style.setProperty('--x', Math.random());
      el.style.setProperty('--y', Math.random());
    });
  }, []);

  const goBack = () => {
    navigate(-1);
  };

  const goHome = () => {
    navigate('/');
  };

  const goLogin = () => {
    navigate('/login');
  };

  return (
    <div className="not-found-container">
      <div className="stars-container">
        <div className="stars"></div>
        <div className="stars2"></div>
        <div className="stars3"></div>
      </div>
      
      <div className="not-found-content">
        <div className="error-code">
          <div className="number">4</div>
          <div className="circle">
            <div className="circle-inner">
              <div className="lotus-icon">
                <i className="fas fa-spa"></i>
              </div>
            </div>
          </div>
          <div className="number">4</div>
        </div>
        
        <h1 className="error-title">นวดพลาด - ไม่มีสิทธิเข้าถึง</h1>
        <p className="error-message">
          ขออภัย คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้
          <br />
          เหมือนกับการนวดที่พลาดจุดสำคัญไป
          
          {user && role && (
            <>
              <br /><br />
              <span style={{
                background: 'linear-gradient(135deg, #ff7730, #ff9900)',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                color: 'white',
                fontWeight: 'bold'
              }}>
                สิทธิ์ของคุณ: {role}
              </span>
            </>
          )}
        </p>
        
        <div className="action-buttons">
          <a href="#" onClick={goBack} className="home-button">
            <i className="fas fa-arrow-left mr-2"></i> ย้อนกลับ
          </a>
          <a href="#" onClick={goHome} className="contact-button">
            <i className="fas fa-home mr-2"></i> หน้าหลัก
          </a>
        </div>
      </div>
      
      <div className="floating-elements">
        <div className="hot-stone hot-stone-1"></div>
        <div className="hot-stone hot-stone-2"></div>
        <div className="hot-stone hot-stone-3"></div>
        <div className="lotus lotus-1"></div>
        <div className="lotus lotus-2"></div>
        <div className="aroma-mist mist-1"></div>
        <div className="aroma-mist mist-2"></div>
      </div>
    </div>
  );
};

export default Unauthorized;
