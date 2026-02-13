import { useAuth } from "@/context/AuthContext";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import StoreStaffDashboard from "@/components/dashboards/StoreStaffDashboard";
import ShopStaffDashboard from "@/components/dashboards/ShopStaffDashboard";
import CustomerDashboard from "@/components/dashboards/CustomerDashboard";

const Dashboard = () => {
  const { role } = useAuth();

  if (role === "shop_staff") return <ShopStaffDashboard />;
  if (role === "store_staff") return <StoreStaffDashboard />;
  // admin or no role yet — show full admin dashboard
  return <AdminDashboard />;
};

export default Dashboard;
