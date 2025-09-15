import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export const ProtectedRoute = ({ children, allowRoles }) => {
  const { user, role } = useAuth();

  console.log('ProtectedRoute - Current user role:', role);
  console.log('ProtectedRoute - Allowed roles:', allowRoles);

  // ถ้าไม่มี user ให้ไปที่หน้าล็อกอิน
  if (!user) {
    console.log('ProtectedRoute - No authenticated user, redirecting to login');
    return <Navigate to="/login" />;
  }
  
  // ถ้าไม่มีบทบาท (role) ให้ไปที่หน้า unauthorized
  if (!role) {
    console.log('ProtectedRoute - User has no role, redirecting to unauthorized');
    return <Navigate to="/unauthorized" />;
  }
  
  // ตรวจสอบว่า role ของ user อยู่ในรายการที่อนุญาตหรือไม่ (ไม่สนใจตัวพิมพ์เล็ก-ใหญ่)
  const hasPermission = allowRoles.some(
    allowedRole => allowedRole.toLowerCase() === role.toLowerCase()
  );
  
  if (!hasPermission) {
    console.log('ProtectedRoute - User role not allowed, redirecting to unauthorized');
    return <Navigate to="/unauthorized" />;
  }

  // อนุญาตให้เข้าถึงได้
  console.log('ProtectedRoute - Access granted to:', role);
  return children;
};