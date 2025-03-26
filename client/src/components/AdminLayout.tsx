import { useState, useEffect } from "react";
import AdminSidebar from "./AdminSidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const { user, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user || !isAdmin) {
      setLocation("/");
    }
  }, [user, isAdmin, setLocation]);

  // Handle responsive layout
  useEffect(() => {
    const checkScreenSize = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);
      setIsSidebarOpen(!isMobileView);
    };

    // Initial check
    checkScreenSize();

    // Add event listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  return (
    <div className="min-h-screen flex bg-neutral">
      {/* Sidebar for desktop and tablet */}
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Main content */}
      <div 
        className={`transition-all duration-300 ease-in-out flex-1 ${
          isSidebarOpen ? 'md:ml-64' : 'ml-0'
        }`}
      >
        {/* Mobile header with hamburger menu */}
        <header className="md:hidden bg-white shadow-md p-4 flex justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle sidebar"
          >
            <Menu />
          </Button>
          <h1 className="text-xl font-medium">Admin Dashboard</h1>
        </header>
        
        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
