import React, { useEffect, useState } from 'react';
import { db } from '../../Firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const userRef = doc(db, 'Users', user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setDisplayName(data.displayName || '');
          setPhone(data.phone || '');
        }
      } catch (e) {
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const userRef = doc(db, 'Users', user.uid);
      await updateDoc(userRef, {
        displayName,
        phone
      });
      setSuccess(true);
    } catch (e) {
      setError('บันทึกไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 420, margin: '40px auto', background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(44,44,44,0.10)', padding: '2.5rem 2rem' }}>
      <h3 className="mb-4" style={{ color: '#ff7730', fontWeight: 700 }}>
        <i className="fas fa-user-cog me-2"></i>ตั้งค่าโปรไฟล์
      </h3>
      {loading ? (
        <div className="text-center py-5">กำลังโหลดข้อมูล...</div>
      ) : (
        <form onSubmit={handleSave}>
          <div className="mb-3">
            <label className="form-label fw-bold">ชื่อ-นามสกุล</label>
            <input
              type="text"
              className="form-control"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
              style={{ borderRadius: 10 }}
            />
          </div>
          <div className="mb-3">
            <label className="form-label fw-bold">เบอร์โทรศัพท์</label>
            <input
              type="tel"
              className="form-control"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              pattern="[0-9]{9,12}"
              required
              style={{ borderRadius: 10 }}
            />
          </div>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          {success && <div className="alert alert-success py-2">บันทึกสำเร็จ</div>}
          <div className="d-flex justify-content-between mt-4">
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)} disabled={saving}>
              ย้อนกลับ
            </button>
            <button type="submit" className="btn" style={{ background: 'linear-gradient(135deg, #ff9900 0%, #ff7730 100%)', color: '#fff', fontWeight: 600 }} disabled={saving}>
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default Profile;
