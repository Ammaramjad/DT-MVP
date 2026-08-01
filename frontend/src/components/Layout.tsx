import React, { type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  ChartBarIcon,
  BeakerIcon,
  LightBulbIcon,
  CircleStackIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Forecasts', href: '/forecasts', icon: ChartBarIcon },
    { name: 'Scenarios', href: '/scenarios', icon: BeakerIcon },
    { name: 'Recommendations', href: '/recommendations', icon: LightBulbIcon },
    { name: 'Data Health', href: '/data-health', icon: CircleStackIcon },
  ];

  // Add Settings only for admin users
  if (user?.role === 'admin') {
    navigation.push({ name: 'Settings', href: '/settings', icon: Cog6ToothIcon });
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-600">AI Digital Twin</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <div className="font-medium text-gray-900">{user?.full_name}</div>
                <div className="text-gray-500">{user?.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm min-h-screen">
          <nav className="mt-5 px-2 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon
                    className={`mr-3 h-6 w-6 ${
                      isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};
