import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './styles/SharedStyles.css';  // นำเข้าไฟล์สไตล์ร่วม
import './fonts.css';  // นำเข้าไฟล์ฟอนต์
import '@fortawesome/fontawesome-free/css/all.min.css'; // นำเข้า Font Awesome จาก package ที่ติดตั้ง
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
