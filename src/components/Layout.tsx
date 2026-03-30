import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  Package, 
  IndianRupee,
  FileBarChart,
  Settings, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  FileText,
  HardHat
} from 'lucide-react';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { APP_LOGO_URL, APP_NAME } from '../constants/branding';
import ComingSoonModal from './ComingSoonModal';

interface LayoutProps {
  children: React.ReactNode;
  user?: any;
}

export default function Layout({ children, user }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/app', icon: LayoutDashboard },
    { name: 'Orders', path: '/app/orders', icon: FileText },
    { name: 'Vehicles', path: '/app/vehicles', icon: Truck, restricted: true },
    { name: 'Drivers', path: '/app/drivers', icon: Users, restricted: true },
    { name: 'Trips', path: '/app/shipments', icon: Package },
    { name: 'LR Management', path: '/app/lrs', icon: FileText },
    { name: 'Expenses', path: '/app/expenses', icon: IndianRupee },
    { name: 'Business Reports', path: '/app/reports', icon: FileBarChart },
    { name: 'Account Details', path: '/app/settings', icon: Settings },
  ];

  const handleNavClick = (e: React.MouseEvent, item: any) => {
    if (user?.role === 'CHA' && item.restricted) {
      e.preventDefault();
      setIsComingSoonOpen(true);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <ComingSoonModal 
        isOpen={isComingSoonOpen} 
        onClose={() => setIsComingSoonOpen(false)} 
      />

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-primary border-r border-white/10 transition-all duration-300 ease-in-out",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-white rounded-lg p-1">
                <img 
                  src={APP_LOGO_URL} 
                  alt={APP_NAME} 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              {isSidebarOpen && (
                <span className="font-black text-xl tracking-tight text-white">{APP_NAME}</span>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const isRestricted = user?.role === 'CHA' && item.restricted;
              
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={(e) => handleNavClick(e, item)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative",
                    isActive 
                      ? "bg-accent text-white shadow-lg shadow-accent/20" 
                      : "text-white/60 hover:bg-white/10 hover:text-white",
                    isRestricted && "opacity-50"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "text-white/40 group-hover:text-white")} />
                  {isSidebarOpen && (
                    <div className="flex items-center justify-between flex-1">
                      <span className="font-bold text-sm tracking-tight">{item.name}</span>
                      {isRestricted && <HardHat className="w-3 h-3 text-white/40" />}
                    </div>
                  )}
                  {!isSidebarOpen && (
                    <div className="absolute left-14 bg-accent text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {item.name} {isRestricted ? '(Coming Soon)' : ''}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-white/10">
            {user ? (
              <div 
                onClick={() => navigate('/app/settings')}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-xl bg-white/5 cursor-pointer hover:bg-white/10 transition-all",
                  !isSidebarOpen && "justify-center"
                )}
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-xs border border-white/20">
                  {user.companyName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                </div>
                {isSidebarOpen && (
                   <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{user.companyName || 'My Account'}</p>
                    <p className="text-[10px] text-white/40 truncate">{user.email}</p>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLogout();
                      }}
                      className="text-[10px] text-red-400 hover:text-red-300 font-bold transition-colors flex items-center gap-1 mt-0.5"
                    >
                      <LogOut className="w-3 h-3" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-all",
                  !isSidebarOpen && "justify-center"
                )}
              >
                <Users className="w-5 h-5 shrink-0" />
                {isSidebarOpen && <span className="font-medium text-sm">Sign In</span>}
              </Link>
            )}
          </div>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-20 bg-white border border-zinc-200 rounded-full p-1 shadow-sm hover:bg-zinc-50 transition-colors"
        >
          {isSidebarOpen ? <X className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300 ease-in-out min-h-screen",
        isSidebarOpen ? "pl-64" : "pl-20"
      )}>
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
