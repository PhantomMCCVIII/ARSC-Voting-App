import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Users,
  BookUser,
  Settings,
  LogOut,
  ChevronLeft,
  Layers,
  LucideIcon,
  PackageCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SidebarItem {
  title: string;
  icon: LucideIcon;
  path: string;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const [location] = useLocation();
  const { logout } = useAuth();

  const sidebarItems: SidebarItem[] = [
    { title: "Dashboard", icon: LayoutDashboard, path: "/admin" },
    { title: "Partylists", icon: Layers, path: "/admin/partylists" },
    { title: "Positions", icon: PackageCheck, path: "/admin/positions" },
    { title: "Candidates", icon: BookUser, path: "/admin/candidates" },
    { title: "Students", icon: Users, path: "/admin/students" },
    { title: "Settings", icon: Settings, path: "/admin/settings" },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" 
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-primary text-white flex flex-col transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-primary-700">
          <h2 className="text-xl font-medium">Admin Dashboard</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="md:hidden text-white hover:text-white hover:bg-primary-700"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {sidebarItems.map((item) => (
              <li key={item.path}>
                <Link href={item.path}>
                  <a
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-md hover:bg-primary-700 transition-colors",
                      location === item.path && "bg-primary-700"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-primary-700">
          <Button 
            variant="ghost" 
            className="flex w-full items-center gap-3 text-white hover:text-white hover:bg-primary-700"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </Button>
        </div>
      </div>
    </>
  );
}
