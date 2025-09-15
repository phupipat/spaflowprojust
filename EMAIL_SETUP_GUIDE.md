# คู่มือการติดตั้ง Trigger Email from Firestore Extension

## ขั้นตอนที่ ### 2.2 SMTP Configuration

#### ช่องที่ต้องกรอก:
```
SMTP connection URI: smtps://your-email@gmail.com:your-app-password@smtp.gmail.com:465
```

**ตัวอย่าง:**
```
smtps://spalflow.system@gmail.com:abcd1234efgh5678@smtp.gmail.com:465
```

### 2.3 Collection และ Document Settings้ง Extension

### 1.1 เข้าสู่ Firebase Console
1. ไปที่ [Firebase Console](https://console.firebase.google.com/)
2. เลือกโปรเจกต์ของคุณ

### 1.2 ติดตั้ง Extension
1. คลิกที่ **"Extensions"** ในเมนูด้านซ้าย
2. คลิก **"Browse Hub"**
3. ค้นหา **"Trigger Email"** หรือพิมพ์ **"firebase/firestore-send-email"**
4. คลิกที่ Extension และเลือก **"Install"**

### 1.3 แก้ไขปัญหาการติดตั้ง Extension

#### Problem: "Error installing. Some extension resources might not be deployed"

**สาเหตุที่พบบ่อย:**
1. **Billing Account ไม่ได้เปิดใช้งาน** - Extensions ต้องใช้ Blaze plan
2. **Cloud Functions API ไม่ได้เปิดใช้งาน**
3. **สิทธิ์ไม่เพียงพอ** - ต้องเป็น Owner หรือ Editor
4. **Region ไม่ support** - บางภูมิภาคไม่รองรับ Extensions

**วิธีแก้ไข:**

#### Step 1: ตรวจสอบ Billing Account
1. ไปที่ **Firebase Console** → **Project Settings** (ไอคอนเฟือง)
2. คลิก **"Usage and billing"**
3. ตรวจสอบว่าเป็น **"Blaze plan"** หรือไม่
4. ถ้าเป็น **"Spark plan"** ให้คลิก **"Modify plan"** → **"Blaze plan"**
5. เพิ่ม Billing Account (ใส่ข้อมูลบัตรเครดิต)

#### Step 2: เปิดใช้งาน APIs ที่จำเป็น
1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. เลือกโปรเจกต์เดียวกับ Firebase
3. ไปที่ **"APIs & Services"** → **"Library"**
4. ค้นหาและเปิดใช้งาน APIs ต่อไปนี้:
   - **Cloud Functions API**
   - **Cloud Firestore API**
   - **Firebase Extensions API**
   - **Cloud Resource Manager API**

#### Step 3: ตรวจสอบสิทธิ์
1. ไปที่ **Firebase Console** → **Project Settings**
2. คลิก **"Users and permissions"**
3. ตรวจสอบว่าบัญชีของคุณมีสิทธิ์ **"Owner"** หรือ **"Editor"**

#### Step 4: ลองติดตั้งใหม่
1. กลับไปที่ **"Extensions"**
2. ถ้า Extension ติดตั้งไม่สำเร็จ ให้คลิก **"Uninstall"**
3. รอสักครู่แล้วลองติดตั้งใหม่
4. เลือก **Region** ที่ใกล้เคียง เช่น **"asia-southeast1"** (Singapore)

#### Step 5: แก้ไขปัญหา Database Region Mismatch
**ปัญหา:** `Database '(default)' does not exist in region 'asia-east1'`

**สาเหตุ:** Firestore Database และ Cloud Functions อยู่คนละ Region

**วิธีแก้ไข:**

##### วิธีที่ 1: ตรวจสอบและเปลี่ยน Region
1. ไปที่ **Firebase Console** → **"Firestore Database"**
2. ดูว่า Database ของคุณอยู่ที่ Region ไหน
3. กลับไปที่ **"Extensions"** → **"Trigger Email"**
4. คลิก **"Uninstall"** (ถ้าติดตั้งไม่สำเร็จ)
5. ติดตั้งใหม่และเลือก **Region เดียวกับ Firestore Database**

##### วิธีที่ 2: ตรวจสอบ Default Database Location
1. ไปที่ **Firebase Console** → **"Project Settings"**
2. ดูใน **"General"** tab ว่า **"Default GCP resource location"** ตั้งเป็นอะไร
3. ใช้ Region เดียวกันในการติดตั้ง Extension

##### วิธีที่ 3: ใช้ Firebase CLI แทน
```bash
# ติดตั้งผ่าน Firebase CLI
npm install -g firebase-tools
firebase login
firebase use your-project-id

# ติดตั้ง Extension และระบุ Region
firebase ext:install firebase/firestore-send-email --project=your-project-id
```

##### วิธีที่ 4: สร้าง Database ใน Region ที่ต้องการ
1. ไปที่ **Google Cloud Console** → **"Firestore"**
2. เลือกโปรเจกต์ของคุณ
3. ตรวจสอบว่ามี Database ใน Region ที่ Extension ต้องการหรือไม่
4. ถ้าไม่มี ให้ไปที่ **Firebase Console** → **"Firestore Database"** → **"Create database"**

#### Step 6: ตรวจสอบ Cloud Functions
1. ไปที่ **Firebase Console** → **"Functions"**
2. ตรวจสอบว่ามี Functions ของ Extension ปรากฏขึ้น
3. ถ้าไม่มี แสดงว่าการติดตั้งไม่สำเร็จ

#### Step 7: ขั้นตอนการแก้ไขเฉพาะปัญหา Region
**จากภาพที่คุณแนบมา ปัญหาคือ Database ไม่อยู่ใน Region ที่ Extension ต้องการ**

1. **ตรวจสอบ Firestore Database Region:**
   - ไปที่ **Firebase Console** → **"Firestore Database"**
   - ดูว่า Database ของคุณอยู่ที่ Region ไหน (เช่น asia-southeast1)

2. **Uninstall Extension:**
   - ไปที่ **"Extensions"** → **"Trigger Email"** → **"Uninstall"**
   - รอจนกว่าจะ Uninstall สำเร็จ

3. **ติดตั้งใหม่ด้วย Region ที่ถูกต้อง:**
   - กลับไปที่ **"Extensions"** → **"Browse Hub"**
   - ค้นหา **"Trigger Email"** → **"Install"**
   - เลือก **Region เดียวกับ Firestore Database**

4. **ถ้ายังมีปัญหา ให้ลองใช้ Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use your-project-id
   firebase ext:install firebase/firestore-send-email
   ```

#### วิธีทางเลือก: ใช้ Command Line
```bash
# ติดตั้งผ่าน Firebase CLI (แนะนำถ้าติดตั้งใน Console ไม่ได้)
npm install -g firebase-tools
firebase login
firebase use your-project-id
firebase ext:install firebase/firestore-send-email --project=your-project-id
```

#### หลังจากใช้คำสั่ง Firebase CLI สำเร็จแล้ว:

##### Step 1: ตรวจสอบการติดตั้งใน Firebase Console
1. ไปที่ **Firebase Console** ([console.firebase.google.com](https://console.firebase.google.com))
2. เลือกโปรเจกต์ของคุณ
3. คลิก **"Extensions"** ในเมนูด้านซ้าย
4. ควรเห็น **"Trigger Email"** ในรายการ Extensions ที่ติดตั้งแล้ว
5. Status ควรเป็น **"Active"** หรือ **"Healthy"**

##### Step 2: กำหนดค่า Extension (Configure)
1. คลิกที่ **"Trigger Email"** → **"Manage"**
2. คลิก **"Reconfigure extension"**
3. ใส่ข้อมูลต่อไปนี้:

```
SMTP connection URI: smtps://your-email@gmail.com:your-app-password@smtp.gmail.com:465
Email documents collection: mail
Default FROM address: your-email@gmail.com
Default reply-to address: your-email@gmail.com
```

4. คลิก **"Save"**

##### Step 3: ทดสอบการส่งอีเมล
1. ไปที่ **"Firestore Database"**
2. สร้าง collection ชื่อ **"mail"**
3. เพิ่ม document ใหม่ด้วยข้อมูล:
```json
{
  "to": "your-test-email@gmail.com",
  "message": {
    "subject": "Test from SpaFlow",
    "html": "<h1>Hello!</h1><p>This is a test email from SpaFlow.</p>"
  }
}
```

##### Step 4: ตรวจสอบผลการส่ง
1. รอประมาณ 1-2 นาที
2. กลับไปดู document ที่สร้าง
3. ควรจะมี field **"delivery"** เพิ่มเข้ามา:
```json
{
  "delivery": {
    "state": "SUCCESS",
    "startTime": "...",
    "endTime": "..."
  }
}
```

##### Step 5: ตรวจสอบอีเมลในกล่องจดหมาย
1. เช็คอีเมลในกล่องจดหมายของคุณ
2. ตรวจสอบทั้ง Inbox และ Spam folder
3. ถ้าได้รับอีเมลแสดงว่าระบบทำงานถูกต้อง

#### สรุปวิธีแก้ไขปัญหา Database Region:
1. **ตรวจสอบ Firestore Database Region**
2. **Uninstall Extension ที่ติดตั้งไม่สำเร็จ**
3. **ติดตั้งใหม่ด้วย Region ที่ถูกต้อง**
4. **ใช้ Firebase CLI ถ้าติดตั้งใน Console ไม่ได้**

#### การใช้งานใน React Code
หลังจากติดตั้งและกำหนดค่า Extension เสร็จแล้ว สามารถใช้ในโค้ดได้ดังนี้:

```javascript
// ใน UserRoleManager.jsx
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../Firebase';

const handleApprove = async (userId) => {
  try {
    const user = users.find(u => u.id === userId);
    
    // 1. อัปเดตสถานะผู้ใช้
    await updateDoc(getUserDocRef(user), { status: 'approved' });
    
    // 2. ส่งอีเมลแจ้งเตือน (Extension จะทำงานอัตโนมัติ)
    if (user.email) {
      await addDoc(collection(db, 'mail'), {
        to: user.email,
        message: {
          subject: 'SpaFlow: บัญชีของคุณได้รับการอนุมัติแล้ว ✅',
          html: `
            <div style="font-family: Arial, sans-serif;">
              <h2>สวัสดีคุณ ${user.fullname || user.name}</h2>
              <p>บัญชีของคุณได้รับการอนุมัติเรียบร้อยแล้ว</p>
              <p>คุณสามารถเข้าสู่ระบบได้ทันที</p>
            </div>
          `
        }
      });
    }
    
    // 3. อัปเดต UI
    setUsers(users => users.map(u => 
      u.id === userId ? { ...u, status: 'approved' } : u
    ));
    
    alert('✅ อนุมัติและส่งอีเมลเรียบร้อยแล้ว');
  } catch (error) {
    console.error('Error:', error);
    alert('❌ เกิดข้อผิดพลาด: ' + error.message);
  }
};
```

## ขั้นตอนที่ 2: การกำหนดค่า Extension

### 2.1 เข้าสู่การตั้งค่า Extension
1. หลังจากติดตั้งสำเร็จ ไปที่ **"Extensions"** → **"Trigger Email"**
2. คลิก **"Manage"**
3. คลิก **"Reconfigure extension"** (หรือ **"Configure"** ถ้าเป็นครั้งแรก)

### 2.2 SMTP Configuration
```
SMTP connection URI: smtps://your-email@gmail.com:your-app-password@smtp.gmail.com:465
```

**ตัวอย่าง:**
```
smtps://spalflow.system@gmail.com:abcd1234efgh5678@smtp.gmail.com:465
```

### 2.2 Collection และ Document Settings
```
Email documents collection: mail
Users collection (optional): users
Templates collection (optional): templates
```

### 2.3 Default Email Settings
```
Default FROM address: your-email@gmail.com
Default reply-to address: your-email@gmail.com
```

## ขั้นตอนที่ 3: การตั้งค่า Gmail App Password

### 3.1 เปิด 2-Factor Authentication
1. ไปที่ [Google Account Settings](https://myaccount.google.com/)
2. คลิก **"Security"** ในเมนูด้านซ้าย
3. หา **"2-Step Verification"** และคลิก **"Get started"**
4. ทำตามขั้นตอนเพื่อเปิดใช้งาน 2FA

### 3.2 สร้าง App Password
1. หลังจากเปิด 2FA แล้ว กลับไปที่ **"Security"**
2. หา **"App passwords"** และคลิก
3. เลือก **"Select app"** → **"Other (Custom name)"**
4. ใส่ชื่อ เช่น **"SpaFlow Firebase Extension"**
5. คลิก **"Generate"**
6. **บันทึก App Password ที่ได้** (16 ตัวอักษร เช่น abcd1234efgh5678)

### 3.3 ใช้ App Password ใน SMTP URI

#### รูปแบบ SMTP URI:
```
smtps://[email]:[app-password]@[smtp-server]:[port]
```

#### ตัวอย่างการใช้งาน:
```
smtps://spalflow.system@gmail.com:abcd1234efgh5678@smtp.gmail.com:465
```

#### การแยกส่วนประกอบ:
- **Protocol**: `smtps://` (SSL/TLS)
- **Email**: `spalflow.system@gmail.com` (อีเมลของคุณ)
- **App Password**: `abcd1234efgh5678` (16 ตัวอักษรจาก Google)
- **SMTP Server**: `smtp.gmail.com` (Gmail SMTP)
- **Port**: `465` (SSL port)

#### ⚠️ **ข้อสำคัญ:**
1. **ใช้ App Password** แทนรหัสผ่าน Gmail ปกติ
2. **ไม่ใส่ช่องว่าง** ใน App Password
3. **ใส่ : (colon)** ระหว่างอีเมลและ App Password
4. **ใช้ smtps://** สำหรับ SSL connection

#### ตัวอย่างจริง:
```
# ถ้าอีเมลของคุณคือ: myemail@gmail.com
# และ App Password คือ: wxyz9876abcd1234
# SMTP URI จะเป็น:
smtps://myemail@gmail.com:wxyz9876abcd1234@smtp.gmail.com:465
```

## ขั้นตอนที่ 4: การทดสอบ Extension

### 4.1 ตัวอย่างการสร้าง App Password และใช้งาน

#### Step 1: หาค่าที่ต้องการ
```
อีเมลของคุณ: spalflow.demo@gmail.com
App Password ที่ได้: abcd efgh ijkl mnop (Google จะให้มา 16 ตัว)
```

#### Step 2: ลบช่องว่างใน App Password
```
App Password: abcdefghijklmnop (ต้องลบช่องว่างทั้งหมด)
```

#### Step 3: สร้าง SMTP URI
```
smtps://spalflow.demo@gmail.com:abcdefghijklmnop@smtp.gmail.com:465
```

#### Step 4: ใส่ใน Firebase Extension Configuration (ใน Firebase Console)
1. ไปที่ **Firebase Console** ([console.firebase.google.com](https://console.firebase.google.com))
2. เลือกโปรเจกต์ของคุณ
3. คลิก **"Extensions"** ในเมนูด้านซ้าย
4. หา **"Trigger Email"** และคลิก **"Manage"**
5. คลิก **"Reconfigure extension"**
6. หา **"SMTP connection URI"** 
7. ใส่ URI ที่สร้างไว้: `smtps://spalflow.demo@gmail.com:abcdefghijklmnop@smtp.gmail.com:465`
8. คลิก **"Save"**

### 4.2 ทดสอบผ่าน Firebase Console
1. ไปที่ **Firebase Console** ([console.firebase.google.com](https://console.firebase.google.com))
2. เลือกโปรเจกต์ของคุณ
3. คลิก **"Firestore Database"** ในเมนูด้านซ้าย
4. คลิก **"+ Start collection"**
5. Collection ID: `mail`
6. คลิก **"Next"**
7. Document ID: `test-email-001` (หรือ Auto-ID)
8. เพิ่ม field ดังนี้:

```json
{
  "to": "your-test-email@gmail.com",
  "message": {
    "subject": "Test Email from SpaFlow",
    "text": "Hello! This is a test email from SpaFlow system.",
    "html": "<h1>Hello!</h1><p>This is a test email from SpaFlow system.</p>"
  }
}
```

9. คลิก **"Save"**
10. รอสักครู่ Extension จะประมวลผลและส่งอีเมล
11. ตรวจสอบอีเมลในกล่องจดหมายของคุณ

### 4.2 ตรวจสอบการส่ง
1. Extension จะประมวลผลและส่งอีเมล
2. ตรวจสอบในช่อง **"delivery"** ของ document
3. ตรวจสอบอีเมลในกล่องจดหมายผู้รับ

## ขั้นตอนที่ 5: การใช้งานในโค้ด

### 5.1 ตัวอย่างโค้ดสำหรับส่งอีเมล
```javascript
import { addDoc, collection } from 'firebase/firestore';
import { db } from './Firebase';

const sendApprovalEmail = async (userEmail, userName) => {
  try {
    await addDoc(collection(db, 'mail'), {
      to: userEmail,
      message: {
        subject: 'SpaFlow: บัญชีของคุณได้รับการอนุมัติแล้ว ✅',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">🎉 ยินดีต้อนรับสู่ SpaFlow!</h1>
            </div>
            <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-bottom: 20px;">สวัสดีคุณ ${userName},</h2>
              <p style="color: #555; font-size: 16px;">เรามีความยินดีที่จะแจ้งให้ทราบว่า บัญชีของคุณสำหรับ <strong>SpaFlow</strong> ได้รับการอนุมัติเรียบร้อยแล้ว</p>
              <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0; color: #2d5a2d;">✅ ตอนนี้คุณสามารถ:</p>
                <ul style="color: #2d5a2d; margin: 10px 0;">
                  <li>เข้าสู่ระบบเพื่อทำการจองบริการ</li>
                  <li>ดูประวัติการจองของคุณ</li>
                  <li>จัดการโปรไฟล์ส่วนตัว</li>
                </ul>
              </div>
              <p style="color: #555;">ขอขอบคุณที่เลือกใช้บริการกับเรา</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
              <p style="color: #777; font-size: 14px;">ขอแสดงความนับถือ,<br><strong>ทีมงาน SpaFlow</strong></p>
            </div>
          </div>
        `
      },
      // เพิ่มข้อมูลสำหรับ tracking
      delivery: {
        startTime: new Date(),
        state: 'PENDING'
      }
    });
    
    console.log('Email queued successfully');
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};
```

### 5.2 การใช้งานใน Component
```javascript
// ในฟังก์ชัน handleApprove
const handleApprove = async (userId) => {
  setUpdating(u => ({ ...u, [userId]: true }));
  try {
    const user = users.find(u => u.id === userId);
    
    // 1. อัปเดตสถานะผู้ใช้
    await updateDoc(getUserDocRef(user), { status: 'approved' });
    
    // 2. ส่งอีเมลแจ้งเตือน
    if (user.email) {
      const emailSent = await sendApprovalEmail(user.email, user.fullname || user.name);
      if (emailSent) {
        alert(`✅ อนุมัติและส่งอีเมลแจ้งเตือนไปยัง ${user.email} เรียบร้อยแล้ว`);
      } else {
        alert(`⚠️ อนุมัติเรียบร้อยแล้ว แต่ไม่สามารถส่งอีเมลได้`);
      }
    }
    
    // 3. อัปเดต state
    setUsers(users => users.map(u => u.id === userId ? { ...u, status: 'approved' } : u));
    
  } catch (err) {
    console.error('Error in handleApprove:', err);
    alert('❌ เกิดข้อผิดพลาด: ' + err.message);
  }
  setUpdating(u => ({ ...u, [userId]: false }));
};
```

## ขั้นตอนที่ 6: การตรวจสอบและแก้ไขปัญหา

### 6.1 ตรวจสอบสถานะการส่ง
```javascript
// ดูสถานะการส่งอีเมล
const checkEmailStatus = async (docId) => {
  const docRef = doc(db, 'mail', docId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    console.log('Email status:', data.delivery);
    // delivery.state จะเป็น 'SUCCESS', 'ERROR', หรือ 'PENDING'
  }
};
```

### 6.2 ปัญหาที่พบบ่อยและวิธีแก้ไข

### 6.2 ปัญหาที่พบบ่อยและวิธีแก้ไข

#### Problem 1: SMTP Authentication Error
```
Error: Invalid login credentials
Error: 535 Authentication failed
```
**สาเหตุ:**
- ใช้รหัสผ่าน Gmail ปกติแทน App Password
- App Password ไม่ถูกต้อง
- ไม่ได้เปิด 2-Factor Authentication

**วิธีแก้ไข:**
1. ตรวจสอบว่าเปิด 2FA แล้ว
2. สร้าง App Password ใหม่
3. ใช้ App Password แทนรหัสผ่าน Gmail ปกติ
4. ลบช่องว่างใน App Password
5. ตรวจสอบรูปแบบ SMTP URI:
   ```
   smtps://your-email@gmail.com:app-password@smtp.gmail.com:465
   ```

#### Problem 2: Connection Timeout
```
Error: Connection timeout
Error: ETIMEDOUT
```
**สาเหตุ:**
- SMTP URI format ไม่ถูกต้อง
- Port หรือ Server ผิด
- Network firewall block

**วิธีแก้ไข:**
1. ตรวจสอบ SMTP URI format
2. ใช้ `smtps://` สำหรับ SSL connection
3. ใช้ port 465 สำหรับ SSL
4. ตรวจสอบ network connectivity

#### Problem 3: Rate Limiting
```
Error: Daily sending quota exceeded
Error: 550 Rate limit exceeded
```
**วิธีแก้ไข:**
- Gmail มีข้อจำกัดการส่งอีเมล 500 ฉบับ/วัน
- ใช้ SMTP service อื่น เช่น SendGrid, Mailgun
- พิจารณาอัปเกรด Gmail Workspace

#### Problem 4: App Password ไม่ทำงาน
```
Error: Application-specific password required
```
**วิธีแก้ไข:**
1. ลบ App Password เก่าและสร้างใหม่
2. ตรวจสอบว่าได้ copy App Password ครบ 16 ตัว
3. ตรวจสอบว่าไม่มีช่องว่างใน App Password
4. ลองใช้อีเมลอื่น

#### ตัวอย่างการแก้ไข SMTP URI ที่ผิด:
```
❌ ผิด: smtps://email@gmail.com:my gmail password@smtp.gmail.com:465
❌ ผิด: smtps://email@gmail.com:abcd efgh ijkl mnop@smtp.gmail.com:465
❌ ผิด: smtp://email@gmail.com:apppassword@smtp.gmail.com:587
✅ ถูก: smtps://email@gmail.com:abcdefghijklmnop@smtp.gmail.com:465
```

### 6.3 การใช้ SendGrid แทน Gmail (ทางเลือก)

#### SMTP URI สำหรับ SendGrid:
```
smtps://apikey:YOUR_SENDGRID_API_KEY@smtp.sendgrid.net:465
```

#### ข้อดีของ SendGrid:
- ส่งได้มากกว่า Gmail
- Analytics ที่ดีกว่า
- ความเชื่อถือสูงกว่า
- Template support

## ขั้นตอนที่ 7: การ Monitor และ Analytics

### 7.1 Dashboard Extension
1. ไปที่ **"Extensions"** ใน Firebase Console
2. หา **"Trigger Email"** และคลิก **"Manage"**
3. ดูสถิติการส่งอีเมล

### 7.2 Firestore Rules สำหรับ Mail Collection
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /mail/{document} {
      allow read, write: if request.auth != null && 
                         get(/databases/$(database)/documents/artifacts/login-spa-7921d/users/$(request.auth.uid)).data.role == 'owner';
    }
  }
}
```

## การติดตั้งสำหรับ Production

### 1. ใช้ Environment Variables
```javascript
// ใน .env file
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-auth-domain
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_SMTP_EMAIL=your-smtp-email
```

### 2. Security Best Practices
- ใช้ Firebase Security Rules ที่เข้มงวด
- จำกัดการเข้าถึง mail collection
- ใช้ HTTPS เสมอ
- Monitor การใช้งาน quota

### 3. Error Handling
```javascript
const sendEmailWithRetry = async (emailData, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await addDoc(collection(db, 'mail'), emailData);
      return true;
    } catch (error) {
      console.error(`Email send attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) return false;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  return false;
};
```

---

## สรุป

การติดตั้ง **Trigger Email from Firestore Extension** ช่วยให้ระบบ SpaFlow สามารถส่งอีเมลแจ้งเตือนได้อย่างอัตโนมัติ โดยเพียงแค่เพิ่มเอกสารใน Firestore collection **"mail"** Extension จะจัดการการส่งอีเมลให้เองทันที

**ข้อสำคัญ:**
1. ต้องมี Gmail App Password
2. ตั้งค่า SMTP URI ให้ถูกต้อง
3. ใช้ collection name "mail"
4. ทดสอบการส่งก่อนใช้งานจริง

หากมีปัญหาในการติดตั้ง สามารถตรวจสอบใน Firebase Console → Extensions → Trigger Email → Logs เพื่อดูรายละเอียด error ได้ครับ
