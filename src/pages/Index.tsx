import { useAuth } from "@/context/AuthContext";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import StoreStaffDashboard from "@/components/dashboards/StoreStaffDashboard";
import ShopStaffDashboard from "@/components/dashboards/ShopStaffDashboard";
import CustomerDashboard from "@/components/dashboards/CustomerDashboard";

const Dashboard = () => {
  const { role } = useAuth();

  if (role === "shop_staff") return <ShopStaffDashboard />;
  if (role === "store_staff") return <StoreStaffDashboard />;
  if (role === "admin") return <AdminDashboard />;
  // No role = customer
  return <CustomerDashboard />;
};

export default Dashboard;
