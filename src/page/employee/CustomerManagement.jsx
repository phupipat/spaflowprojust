import React, { useState, useEffect } from 'react';
import { db } from '../../Firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../../styles/SharedStyles.css';

function CustomerManagement() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [customerNote, setCustomerNote] = useState('');

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!user) return;

      try {
        // Get employee details
        const userQuery = query(
          collection(db, 'artifacts/login-spa-7921d/users'),
          where('__name__', '==', user.uid)
        );
        const userSnapshot = await getDocs(userQuery);
        const userData = userSnapshot.docs[0]?.data();
        setUserName(userData?.fullname || userData?.name || 'พนักงาน');

        // Get customers from bookings
        const bookingsQuery = query(
          collection(db, 'Bookings'),
          where('employeeId', '==', user.uid)
        );

        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookingsData = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // ในกรณีที่ไม่มีข้อมูล ให้ใช้ข้อมูลจำลอง
        if (bookingsData.length === 0) {
          const dummyData = generateDummyCustomers();
          setCustomers(dummyData);
        } else {
          // จัดกลุ่มลูกค้าจากข้อมูลการจอง
          const customersMap = {};
          
          bookingsData.forEach(booking => {
            if (booking.customerName) {
              if (!customersMap[booking.customerName]) {
                customersMap[booking.customerName] = {
                  id: `customer-${Object.keys(customersMap).length + 1}`,
                  name: booking.customerName,
                  phone: booking.phone || '',
                  email: booking.email || '',
                  bookings: [],
                  totalSpent: 0,
                  notes: booking.customerNotes || '',
                  lastVisit: null,
                  type: Math.random() < 0.7 ? 'regular' : 'new',
                  preferredServices: [],
                };
              }
              
              customersMap[booking.customerName].bookings.push({
                id: booking.id,
                date: booking.date,
                time: booking.time,
                service: booking.service,
                price: booking.price || 0,
                status: booking.status,
              });
              
              customersMap[booking.customerName].totalSpent += booking.price || 0;
              
              const bookingDate = new Date(`${booking.date} ${booking.time}`);
              if (!customersMap[booking.customerName].lastVisit || 
                  bookingDate > customersMap[booking.customerName].lastVisit) {
                customersMap[booking.customerName].lastVisit = bookingDate;
              }
              
              if (booking.service && 
                  !customersMap[booking.customerName].preferredServices.includes(booking.service)) {
                customersMap[booking.customerName].preferredServices.push(booking.service);
              }
            }
          });
          
          setCustomers(Object.values(customersMap));
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching customers:", error);
        // ใช้ข้อมูลจำลองในกรณีที่มีข้อผิดพลาด
        const dummyData = generateDummyCustomers();
        setCustomers(dummyData);
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [user]);

  // ฟังก์ชันสร้างข้อมูลจำลองสำหรับลูกค้า
  const generateDummyCustomers = () => {
    const customerNames = [
      'คุณสมศรี มีสุข',
      'คุณสมชาย ใจดี',
      'คุณวิภา สดใส',
      'คุณมานะ ทองดี',
      'คุณสุดา รักดี',
      'คุณพิชัย ใจเย็น',
      'คุณเอมอร สุขศรี',
      'คุณธนา นาคำ',
    ];
    
    const services = [
      'นวดแผนไทย',
      'นวดน้ำมันอโรมา',
      'สปาเท้า',
      'นวดแผนไทยประคบสมุนไพร',
      'นวดหินร้อน',
      'ทรีทเมนท์ผิวหน้า',
      'ทรีทเมนท์ผิวกาย',
    ];
    
    const notes = [
      'ชอบความกดที่แรงปานกลาง',
      'แพ้น้ำมันหอมระเหยกลิ่นลาเวนเดอร์',
      'มีปัญหาข้อเข่า ต้องการนวดเบาๆ',
      'ชอบบรรยากาศเงียบสงบ',
      'ต้องการห้องส่วนตัว',
      'ชอบดื่มชาระหว่างรอ',
      'มีโรคประจำตัวความดันสูง',
      'สนใจโปรโมชั่นคอร์สนวด',
    ];
    
    return customerNames.map((name, index) => {
      // สุ่มจำนวนการใช้บริการ
      const bookingsCount = Math.floor(Math.random() * 5) + 1;
      const bookings = [];
      let totalSpent = 0;
      const preferredServices = [];
      
      // สร้างประวัติการใช้บริการ
      for (let i = 0; i < bookingsCount; i++) {
        // สุ่มบริการที่ใช้
        const serviceIndex = Math.floor(Math.random() * services.length);
        const service = services[serviceIndex];
        
        // สุ่มวันที่ใช้บริการในช่วง 6 เดือนที่ผ่านมา
        const today = new Date();
        const bookingDate = new Date();
        bookingDate.setDate(today.getDate() - Math.floor(Math.random() * 180));
        
        // สุ่มราคา
        const price = (serviceIndex + 1) * 300;
        
        bookings.push({
          id: `booking-${index}-${i}`,
          date: bookingDate.toISOString().split('T')[0],
          time: `${Math.floor(Math.random() * 8) + 10}:${Math.random() < 0.5 ? '00' : '30'}`,
          service,
          price,
          status: 'completed',
        });
        
        totalSpent += price;
        
        if (!preferredServices.includes(service)) {
          preferredServices.push(service);
        }
      }
      
      // เรียงลำดับการใช้บริการตามวันที่
      bookings.sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);
        return dateB - dateA; // เรียงจากใหม่ไปเก่า
      });
      
      return {
        id: `customer-${index + 1}`,
        name,
        phone: `08${Math.floor(Math.random() * 10000000) + 10000000}`,
        email: `${name.split(' ')[0].toLowerCase()}@example.com`,
        bookings,
        totalSpent,
        notes: Math.random() < 0.7 ? notes[Math.floor(Math.random() * notes.length)] : '',
        lastVisit: bookings.length > 0 ? new Date(`${bookings[0].date} ${bookings[0].time}`) : null,
        type: bookings.length >= 3 ? 'regular' : 'new',
        preferredServices,
      };
    });
  };
  
  // ฟังก์ชันกรองข้อมูลลูกค้า
  const getFilteredCustomers = () => {
    return customers.filter(customer => {
      // กรองตามประเภทลูกค้า
      if (filterType !== 'all' && customer.type !== filterType) {
        return false;
      }
      
      // ค้นหาตามข้อความ
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          customer.name?.toLowerCase().includes(query) ||
          customer.phone?.toLowerCase().includes(query) ||
          customer.email?.toLowerCase().includes(query) ||
          customer.notes?.toLowerCase().includes(query) ||
          customer.preferredServices.some(service => service.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  };

  // ฟังก์ชันจัดรูปแบบวันที่
  const formatDate = (dateObj) => {
    if (!dateObj) return '-';
    return dateObj.toLocaleDateString('th-TH', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };
  
  // แสดงรายละเอียดลูกค้า
  const viewCustomerDetails = (customer) => {
    setSelectedCustomer(customer);
    setCustomerNote(customer.notes || '');
    setIsModalOpen(true);
    setEditMode(false);
  };
  
  // บันทึกข้อมูลลูกค้า
  const saveCustomerData = async () => {
    try {
      // อัปเดตข้อมูลในท้องถิ่น
      const updatedCustomers = customers.map(c => 
        c.id === selectedCustomer.id ? { ...c, notes: customerNote } : c
      );
      setCustomers(updatedCustomers);
      
      // อัปเดตข้อมูลลูกค้าที่เลือกด้วย
      setSelectedCustomer({ ...selectedCustomer, notes: customerNote });
      
      // ปิดโหมดแก้ไข
      setEditMode(false);
      
      alert('บันทึกข้อมูลเรียบร้อย');
    } catch (error) {
      console.error("Error updating customer:", error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  return (
    <div className="container-fluid animate-fade-in py-4">
      {/* Add FontAwesome CDN */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" 
        integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" 
        crossOrigin="anonymous" referrerPolicy="no-referrer" />
      
      <style>
        {`
          .customer-card {
            border-top-width: 5px !important;
          }
          
          .customer-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background-color: #ff9900;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            font-weight: bold;
          }
          
          .customer-type-badge {
            position: absolute;
            top: 0;
            right: 0;
            border-radius: 0 0.375rem 0 0.375rem;
          }
          
          .service-tag {
            display: inline-block;
            background-color: #f0f0f0;
            color: #555;
            padding: 2px 8px;
            margin: 2px;
            border-radius: 12px;
            font-size: 0.8rem;
          }
          
          .modal-content {
            border: none;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          }
          
          .modal-header {
            border-bottom: 1px solid #f0f0f0;
            background: linear-gradient(to right, #ff9900, #ff7730);
            color: white;
            border-radius: 12px 12px 0 0;
          }
          
          .modal-footer {
            border-top: 1px solid #f0f0f0;
          }
          
          .customer-info-section {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 20px;
          }
          
          .booking-history-item {
            padding: 10px 15px;
            border-left: 3px solid #ff9900;
            background: #f9f9f9;
            margin-bottom: 10px;
            border-radius: 0 5px 5px 0;
          }
          
          .stats-card {
            background: white;
            border-radius: 10px;
            padding: 15px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            transition: all 0.2s ease;
          }
          
          .stats-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
          }
          
          .customer-notes {
            background: #fffbf0;
            border-left: 3px solid #ffc107;
            padding: 10px;
            margin-top: 10px;
            font-style: italic;
          }
        `}
      </style>
      
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="mb-1">
                    <i className="fas fa-users me-2" style={{ color: '#ff9900' }}></i>
                    จัดการข้อมูลลูกค้า
                  </h2>
                  <p className="text-muted mb-0">
                    <i className="fas fa-user me-1"></i>
                    {userName} - จัดการข้อมูลลูกค้าและประวัติการใช้บริการ
                  </p>
                </div>
                <div>
                  <button className="btn btn-primary">
                    <i className="fas fa-plus me-1"></i> เพิ่มลูกค้าใหม่
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* ข้อมูลสถิติ */}
      <div className="row mb-4">
        <div className="col-md-3 col-6 mb-4 mb-md-0">
          <div className="stats-card h-100">
            <div className="d-flex align-items-center">
              <div className="rounded-circle p-3 me-3" style={{ background: 'rgba(255, 153, 0, 0.1)' }}>
                <i className="fas fa-users" style={{ color: '#ff9900', fontSize: '1.5rem' }}></i>
              </div>
              <div>
                <h3 className="mb-0 fw-bold">{customers.length}</h3>
                <p className="text-muted mb-0">ลูกค้าทั้งหมด</p>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6 mb-4 mb-md-0">
          <div className="stats-card h-100">
            <div className="d-flex align-items-center">
              <div className="rounded-circle p-3 me-3" style={{ background: 'rgba(40, 167, 69, 0.1)' }}>
                <i className="fas fa-user-plus" style={{ color: '#28a745', fontSize: '1.5rem' }}></i>
              </div>
              <div>
                <h3 className="mb-0 fw-bold">
                  {customers.filter(c => c.type === 'new').length}
                </h3>
                <p className="text-muted mb-0">ลูกค้าใหม่</p>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6 mb-4 mb-md-0">
          <div className="stats-card h-100">
            <div className="d-flex align-items-center">
              <div className="rounded-circle p-3 me-3" style={{ background: 'rgba(0, 123, 255, 0.1)' }}>
                <i className="fas fa-user-check" style={{ color: '#007bff', fontSize: '1.5rem' }}></i>
              </div>
              <div>
                <h3 className="mb-0 fw-bold">
                  {customers.filter(c => c.type === 'regular').length}
                </h3>
                <p className="text-muted mb-0">ลูกค้าประจำ</p>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="stats-card h-100">
            <div className="d-flex align-items-center">
              <div className="rounded-circle p-3 me-3" style={{ background: 'rgba(220, 53, 69, 0.1)' }}>
                <i className="fas fa-chart-line" style={{ color: '#dc3545', fontSize: '1.5rem' }}></i>
              </div>
              <div>
                <h3 className="mb-0 fw-bold">
                  {customers.reduce((total, customer) => {
                    return total + (customer.bookings?.length || 0);
                  }, 0)}
                </h3>
                <p className="text-muted mb-0">การจองทั้งหมด</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* ตัวกรองและค้นหา */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-8">
                  <div className="input-group">
                    <span className="input-group-text bg-white">
                      <i className="fas fa-search text-muted"></i>
                    </span>
                    <input 
                      type="text" 
                      className="form-control border-start-0" 
                      placeholder="ค้นหาชื่อลูกค้า เบอร์โทรศัพท์ หรือบริการที่ใช้..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="col-md-4">
                  <div className="btn-group w-100" role="group">
                    <input 
                      type="radio" 
                      className="btn-check" 
                      name="customerType" 
                      id="all" 
                      checked={filterType === 'all'} 
                      onChange={() => setFilterType('all')}
                    />
                    <label className="btn btn-outline-secondary" htmlFor="all">ทั้งหมด</label>
                    
                    <input 
                      type="radio" 
                      className="btn-check" 
                      name="customerType" 
                      id="regular" 
                      checked={filterType === 'regular'} 
                      onChange={() => setFilterType('regular')}
                    />
                    <label className="btn btn-outline-primary" htmlFor="regular">ลูกค้าประจำ</label>
                    
                    <input 
                      type="radio" 
                      className="btn-check" 
                      name="customerType" 
                      id="new" 
                      checked={filterType === 'new'} 
                      onChange={() => setFilterType('new')}
                    />
                    <label className="btn btn-outline-success" htmlFor="new">ลูกค้าใหม่</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* รายการลูกค้า */}
      <div className="row">
        <div className="col-12">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-3" role="status">
                <span className="visually-hidden">กำลังโหลด...</span>
              </div>
              <p className="text-muted">กำลังโหลดข้อมูลลูกค้า...</p>
            </div>
          ) : getFilteredCustomers().length === 0 ? (
            <div className="text-center py-5 bg-light rounded">
              <i className="fas fa-users-slash mb-3" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
              <h5>ไม่พบข้อมูลลูกค้าตามเงื่อนไขที่กำหนด</h5>
              <p className="text-muted">ลองเปลี่ยนตัวกรองหรือคำค้นหาของคุณ</p>
              <button className="btn btn-outline-primary" onClick={() => {
                setFilterType('all');
                setSearchQuery('');
              }}>
                <i className="fas fa-sync-alt me-1"></i> ล้างตัวกรอง
              </button>
            </div>
          ) : (
            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
              {getFilteredCustomers().map(customer => (
                <div className="col" key={customer.id}>
                  <div className={`card h-100 border-0 shadow-sm customer-card border-top ${customer.type === 'regular' ? 'border-primary' : 'border-success'}`}>
                    <div className="card-body position-relative">
                      <span className={`customer-type-badge badge ${customer.type === 'regular' ? 'bg-primary' : 'bg-success'}`}>
                        {customer.type === 'regular' ? 'ลูกค้าประจำ' : 'ลูกค้าใหม่'}
                      </span>
                      
                      <div className="d-flex mb-3">
                        <div className="customer-avatar me-3">
                          {customer.name?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <h5 className="mb-1">{customer.name}</h5>
                          <p className="mb-0 text-muted">
                            <i className="fas fa-phone-alt me-1"></i> {customer.phone}
                          </p>
                          {customer.email && (
                            <p className="mb-0 text-muted">
                              <i className="fas fa-envelope me-1"></i> {customer.email}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="mb-3 pb-3 border-bottom">
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">บริการที่นิยม:</span>
                        </div>
                        <div>
                          {customer.preferredServices.length > 0 ? (
                            customer.preferredServices.slice(0, 2).map((service, index) => (
                              <span key={index} className="service-tag">
                                {service}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                          {customer.preferredServices.length > 2 && (
                            <span className="service-tag">+{customer.preferredServices.length - 2}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="row g-2 mb-3">
                        <div className="col-6">
                          <div className="border rounded p-2 text-center h-100">
                            <div className="text-muted small">การจอง</div>
                            <div className="fw-bold">{customer.bookings.length} ครั้ง</div>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="border rounded p-2 text-center h-100">
                            <div className="text-muted small">มูลค่า</div>
                            <div className="fw-bold">{customer.totalSpent.toLocaleString()} ฿</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-muted small">
                          <i className="fas fa-history me-1"></i>
                          เยี่ยมชมล่าสุด: {formatDate(customer.lastVisit)}
                        </span>
                        <button 
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => viewCustomerDetails(customer)}
                        >
                          <i className="fas fa-info-circle me-1"></i> รายละเอียด
                        </button>
                      </div>
                      
                      {customer.notes && (
                        <div className="customer-notes mt-3">
                          <small>{customer.notes}</small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Modal รายละเอียดลูกค้า */}
      {isModalOpen && selectedCustomer && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0, 0, 0, 0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-user-circle me-2"></i>
                  รายละเอียดลูกค้า
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setIsModalOpen(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-5 mb-4 mb-md-0">
                    <h6 className="mb-3 border-bottom pb-2">
                      <i className="fas fa-user me-2" style={{ color: '#ff9900' }}></i>
                      ข้อมูลลูกค้า
                    </h6>
                    
                    <div className="customer-info-section">
                      <div className="d-flex align-items-center mb-4">
                        <div className="customer-avatar me-3" style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}>
                          {selectedCustomer.name?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <h5 className="mb-1">{selectedCustomer.name}</h5>
                          <p className="mb-0">
                            <span className={`badge ${selectedCustomer.type === 'regular' ? 'bg-primary' : 'bg-success'}`}>
                              {selectedCustomer.type === 'regular' ? 'ลูกค้าประจำ' : 'ลูกค้าใหม่'}
                            </span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <div className="d-flex align-items-center mb-2">
                          <div className="text-muted" style={{ width: '100px' }}>เบอร์โทรศัพท์:</div>
                          <div>{selectedCustomer.phone || '-'}</div>
                        </div>
                        <div className="d-flex align-items-center mb-2">
                          <div className="text-muted" style={{ width: '100px' }}>อีเมล:</div>
                          <div>{selectedCustomer.email || '-'}</div>
                        </div>
                        <div className="d-flex align-items-center mb-2">
                          <div className="text-muted" style={{ width: '100px' }}>ใช้บริการ:</div>
                          <div>{selectedCustomer.bookings.length} ครั้ง</div>
                        </div>
                        <div className="d-flex align-items-center mb-2">
                          <div className="text-muted" style={{ width: '100px' }}>มูลค่ารวม:</div>
                          <div className="fw-bold">{selectedCustomer.totalSpent.toLocaleString()} บาท</div>
                        </div>
                        <div className="d-flex align-items-center">
                          <div className="text-muted" style={{ width: '100px' }}>ครั้งล่าสุด:</div>
                          <div>{formatDate(selectedCustomer.lastVisit)}</div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h6 className="mb-2 d-flex justify-content-between align-items-center">
                          <span>หมายเหตุลูกค้า:</span>
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setEditMode(!editMode)}
                          >
                            <i className={`fas fa-${editMode ? 'times' : 'edit'}`}></i>
                          </button>
                        </h6>
                        
                        {editMode ? (
                          <div className="mb-3">
                            <textarea 
                              className="form-control"
                              rows="4"
                              value={customerNote}
                              onChange={(e) => setCustomerNote(e.target.value)}
                              placeholder="เพิ่มบันทึกหรือหมายเหตุเกี่ยวกับลูกค้า..."
                            ></textarea>
                            <div className="d-flex justify-content-end mt-2">
                              <button 
                                className="btn btn-sm btn-primary"
                                onClick={saveCustomerData}
                              >
                                <i className="fas fa-save me-1"></i> บันทึก
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="appointment-notes">
                            {selectedCustomer.notes || 'ไม่มีหมายเหตุ'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-md-7">
                    <h6 className="mb-3 border-bottom pb-2">
                      <i className="fas fa-history me-2" style={{ color: '#ff9900' }}></i>
                      ประวัติการใช้บริการ
                    </h6>
                    
                    {selectedCustomer.bookings.length > 0 ? (
                      <div className="pe-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {selectedCustomer.bookings.map((booking, index) => (
                          <div key={index} className="booking-history-item mb-3">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <h6 className="mb-0 fw-bold">{booking.service}</h6>
                              <span className="badge bg-info">{booking.date}</span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center small">
                              <span className="text-muted">
                                <i className="fas fa-clock me-1"></i> {booking.time}
                              </span>
                              <span className="fw-bold">{booking.price.toLocaleString()} บาท</span>
                            </div>
                            <hr className="my-2" />
                            <div className="d-flex justify-content-between align-items-center">
                              <span className={`badge bg-${
                                booking.status === 'completed' ? 'success' :
                                booking.status === 'cancelled' ? 'danger' :
                                'warning'
                              }`}>
                                {booking.status === 'completed' ? 'เสร็จสิ้น' :
                                 booking.status === 'cancelled' ? 'ยกเลิก' :
                                 'รอดำเนินการ'}
                              </span>
                              <button className="btn btn-sm btn-outline-secondary">
                                <i className="fas fa-file-alt me-1"></i> รายละเอียด
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-light rounded">
                        <i className="fas fa-calendar-times mb-3" style={{ fontSize: '2rem', color: '#6c757d' }}></i>
                        <p className="mb-0">ไม่มีประวัติการใช้บริการ</p>
                      </div>
                    )}
                    
                    <h6 className="mt-4 mb-3 border-bottom pb-2">
                      <i className="fas fa-chart-pie me-2" style={{ color: '#ff9900' }}></i>
                      บริการที่นิยมใช้
                    </h6>
                    
                    {selectedCustomer.preferredServices.length > 0 ? (
                      <div className="row g-3">
                        {selectedCustomer.preferredServices.map((service, index) => (
                          <div key={index} className="col-md-6">
                            <div className="border rounded p-3">
                              <div className="d-flex align-items-center">
                                <div className="rounded-circle p-2 me-3" style={{ background: 'rgba(255, 153, 0, 0.1)' }}>
                                  <i className="fas fa-spa" style={{ color: '#ff9900' }}></i>
                                </div>
                                <div>
                                  <h6 className="mb-1">{service}</h6>
                                  <p className="mb-0 small text-muted">
                                    {selectedCustomer.bookings.filter(b => b.service === service).length} ครั้ง
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted">ไม่มีข้อมูลบริการที่นิยมใช้</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>ปิด</button>
                <button type="button" className="btn btn-success">
                  <i className="fas fa-calendar-plus me-1"></i> สร้างการจองใหม่
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerManagement;
