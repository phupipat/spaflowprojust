import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";

// Pages
import Login from "./components/Login.jsx";
import Signup from "./components/Signup.jsx";
import DashboardOwner from "./page/owner/DashboardOwner.jsx";
import OwnerProfile from "./page/owner/OwnerProfile.jsx";
import OwnerSettings from "./page/owner/OwnerSettings.jsx";
import DashboardEmployee from "./page/employee/DashboardEmployee.jsx";
import EmployeeProfile from "./page/employee/EmployeeProfile.jsx";
import DashboardMember from "./page/member/DashboardMember.jsx"; // สำหรับ Member
import CustomerServices from "./page/member/CustomerServices.jsx"; // สำหรับ Member จองบริการ
import MemberRewards from "./page/member/MemberRewards.jsx"; // สำหรับ Member แลกรางวัล
import ReviewService from "./page/member/ReviewService.jsx"; // สำหรับ Member รีวิวบริการ
import PublicServices from "./components/PublicServices.jsx"; // สำหรับ Guest
import Home from "./components/Home.jsx";
import About from "./components/About.jsx"; 
import Contact from './components/Contact';
import Unauthorized from './components/Unauthorized';
import Profile from './page/member/MemberProfile.jsx';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/home" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/Services" element={<PublicServices />} />
          <Route path="/services" element={<PublicServices />} />
          <Route path="/public" element={<PublicServices />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Owner */}
          <Route
            path="/owner"
            element={
              <ProtectedRoute allowRoles={["Owner"]}>
                <DashboardOwner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/DashboardOwner"
            element={
              <ProtectedRoute allowRoles={["Owner"]}>
                <DashboardOwner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/profile"
            element={
              <ProtectedRoute allowRoles={["Owner"]}>
                <OwnerProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/settings"
            element={
              <ProtectedRoute allowRoles={["Owner"]}>
                <OwnerSettings />
              </ProtectedRoute>
            }
          />

          {/* Employee */}
          <Route
            path="/employee/DashboardEmployee"
            element={
              <ProtectedRoute allowRoles={["Employee"]}>
                <DashboardEmployee />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/EmployeeProfile"
            element={
              <ProtectedRoute allowRoles={["Employee"]}>
                <EmployeeProfile />
              </ProtectedRoute>
            }
          />

          {/* Customer (Member) */}
          <Route
            path="/member/dashboard"
            element={
              <ProtectedRoute allowRoles={["Member"]}>
                <DashboardMember />
              </ProtectedRoute>
            }
          />
          <Route
            path="/member/DashboardMember"
            element={
              <ProtectedRoute allowRoles={["Member"]}>
                <DashboardMember />
              </ProtectedRoute>
            }
          />
          <Route
            path="/member/profile"
            element={
              <ProtectedRoute allowRoles={["Member"]}>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/member/customer-services"
            element={
              <ProtectedRoute allowRoles={["Member"]}>
                <CustomerServices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/member/booking-history"
            element={
              <ProtectedRoute allowRoles={["Member"]}>
              </ProtectedRoute>
            }
          />
          <Route
            path="/member/rewards"
            element={
              <ProtectedRoute allowRoles={["Member"]}>
                <MemberRewards />
              </ProtectedRoute>
            }
          />
          <Route
            path="/member/review/:bookingId"
            element={
              <ProtectedRoute allowRoles={["Member"]}>
                <ReviewService />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
// Note: Ensure that the ProtectedRoute component is correctly implemented to check user roles and redirect accordingly.
// The AuthProvider should manage the authentication state and provide user and role information to the context.
