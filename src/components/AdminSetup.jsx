import React, { useState } from 'react';
import { createOwnerAccount, createEmployeeAccount } from '../utils/createOwnerAccount';
import { createOwnerAccountWithRandomEmail, createEmployeeAccountWithRandomEmail } from '../utils/createAccountsWithRandomEmail';
import 'bootstrap/dist/css/bootstrap.min.css';

function AdminSetup() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const handleCreateOwnerRandom = async () => {
    setLoading(true);
    const result = await createOwnerAccountWithRandomEmail();
    setResults(prev => [...prev, {
      type: 'Owner (Random Email)',
      ...result,
      timestamp: new Date().toLocaleString()
    }]);
    setLoading(false);
  };

  const handleCreateEmployeeRandom = async () => {
    setLoading(true);
    const result = await createEmployeeAccountWithRandomEmail();
    setResults(prev => [...prev, {
      type: 'Employee (Random Email)',
      ...result,
      timestamp: new Date().toLocaleString()
    }]);
    setLoading(false);
  };

  const handleCreateOwner = async () => {
    setLoading(true);
    const result = await createOwnerAccount();
    setResults(prev => [...prev, {
      type: 'Owner',
      ...result,
      timestamp: new Date().toLocaleString()
    }]);
    setLoading(false);
  };

  const handleCreateEmployee = async () => {
    setLoading(true);
    const result = await createEmployeeAccount();
    setResults(prev => [...prev, {
      type: 'Employee',
      ...result,
      timestamp: new Date().toLocaleString()
    }]);
    setLoading(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h3 className="mb-0">🔧 Admin Setup - สร้างบัญชีผู้ดูแลระบบ</h3>
            </div>
            <div className="card-body">
              <div className="alert alert-warning" role="alert">
                <strong>⚠️ คำเตือน:</strong> ใช้หน้านี้เฉพาะตอนตั้งค่าระบบครั้งแรก หรือเมื่อข้อมูลใน Firebase หายไป
              </div>

              <div className="mb-4">
                <h5>สร้างบัญชีเจ้าของร้าน (Owner) - Email สุ่ม</h5>
                <p className="text-muted">จะสร้าง email แบบสุ่ม เช่น owner123abc@spa.com</p>
                <button 
                  className="btn btn-success me-2" 
                  onClick={handleCreateOwnerRandom}
                  disabled={loading}
                >
                  {loading ? 'กำลังสร้าง...' : 'สร้างบัญชี Owner (Email สุ่ม)'}
                </button>
              </div>

              <div className="mb-4">
                <h5>สร้างบัญชีเจ้าของร้าน (Owner) - Email คงที่</h5>
                <p className="text-muted">Email: owner@spa.com | Password: owner123456</p>
                <p className="text-warning small">⚠️ ถ้า email นี้ถูกใช้ไปแล้ว ระบบจะพยายามลบและสร้างใหม่</p>
                <button 
                  className="btn btn-warning me-2" 
                  onClick={handleCreateOwner}
                  disabled={loading}
                >
                  {loading ? 'กำลังสร้าง...' : 'สร้างบัญชี Owner (Email คงที่)'}
                </button>
              </div>

              <div className="mb-4">
                <h5>สร้างบัญชีพนักงาน (Employee) - Email สุ่ม</h5>
                <p className="text-muted">จะสร้าง email แบบสุ่ม เช่น employee123abc@spa.com</p>
                <button 
                  className="btn btn-info me-2" 
                  onClick={handleCreateEmployeeRandom}
                  disabled={loading}
                >
                  {loading ? 'กำลังสร้าง...' : 'สร้างบัญชี Employee (Email สุ่ม)'}
                </button>
              </div>

              <div className="mb-4">
                <h5>สร้างบัญชีพนักงาน (Employee) - Email คงที่</h5>
                <p className="text-muted">Email: employee@spa.com | Password: employee123456</p>
                <button 
                  className="btn btn-secondary me-2" 
                  onClick={handleCreateEmployee}
                  disabled={loading}
                >
                  {loading ? 'กำลังสร้าง...' : 'สร้างบัญชี Employee (Email คงที่)'}
                </button>
              </div>

              {results.length > 0 && (
                <div className="mt-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5>ผลการสร้างบัญชี</h5>
                    <button 
                      className="btn btn-outline-secondary btn-sm" 
                      onClick={clearResults}
                    >
                      ล้างผลลัพธ์
                    </button>
                  </div>
                  
                  {results.map((result, index) => (
                    <div key={index} className={`alert ${result.success ? 'alert-success' : 'alert-danger'}`}>
                      <h6>{result.type} Account</h6>
                      <p className="mb-1"><strong>เวลา:</strong> {result.timestamp}</p>
                      {result.success ? (
                        <>
                          <p className="mb-1"><strong>✅ สร้างสำเร็จ!</strong></p>
                          <p className="mb-1"><strong>Email:</strong> {result.email}</p>
                          <p className="mb-1"><strong>Password:</strong> {result.password}</p>
                          <p className="mb-0"><strong>UID:</strong> {result.uid}</p>
                        </>
                      ) : (
                        <p className="mb-0"><strong>❌ เกิดข้อผิดพลาด:</strong> {result.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-4 border-top">
                <h6>หลังจากสร้างบัญชีแล้ว:</h6>
                <ol>
                  <li>ไปที่หน้า Login: <a href="/login">/login</a></li>
                  <li>ใช้ email และ password ที่แสดงด้านบนเพื่อเข้าสู่ระบบ</li>
                  <li>คุณจะเข้าสู่ Dashboard ตาม role ที่กำหนด</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSetup;
