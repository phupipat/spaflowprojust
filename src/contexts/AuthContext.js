import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../Firebase.js"; // Adjust the import path as needed
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          // อ่านข้อมูลจาก path ที่ถูกต้อง: artifacts/{projectId}/users/{uid}
          const projectId = 'login-spa-7921d';
          const docSnap = await getDoc(doc(db, 'artifacts', projectId, 'users', user.uid));
          
          if (docSnap.exists()) {
            // แปลงเป็นรูปแบบมาตรฐาน (ขึ้นต้นด้วยตัวใหญ่ ที่เหลือตัวเล็ก)
            const userRole = docSnap.data().role;
            console.log('Found user role:', userRole);
            
            // ปรับรูปแบบ role ให้เป็นมาตรฐาน
            if (userRole) {
              const standardRole = userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase();
              console.log('Standardized role:', standardRole);
              setRole(standardRole);
            } else {
              console.log('Role field is missing in user document');
              setRole(null);
            }
          } else {
            // ลองค้นหาใน users collection อีกทาง
            try {
              const altDocSnap = await getDoc(doc(db, 'users', user.uid));
              if (altDocSnap.exists() && altDocSnap.data().role) {
                const userRole = altDocSnap.data().role;
                const standardRole = userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase();
                console.log('Found role in alternate path:', standardRole);
                setRole(standardRole);
              } else {
                console.log('User document not found in any expected path');
                setRole(null);
              }
            } catch (error) {
              console.error('Error checking alternate path:', error);
              setRole(null);
            }
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          setRole(null);
        }
      } else {
        setRole(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // ฟังก์ชันสำหรับออกจากระบบ
  const logout = async () => {
    try {
      await signOut(auth);
      // ไม่ต้องเซ็ต user และ role เป็น null เพราะ onAuthStateChanged จะจัดการให้เมื่อสถานะเปลี่ยน
      return true;
    } catch (error) {
      console.error("Error logging out:", error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
