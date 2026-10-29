import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, FileText, Settings, LogOut, Award, Receipt, MessageSquare } from 'lucide-react';
import logo from '../../assets/img/Logo.png';


const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: Users, label: 'Patients', path: '/admin/patients' },
  { icon: Calendar, label: 'Appointments', path: '/admin/appointments' },
  { icon: MessageSquare, label: 'Chatbot', path: '/admin/chatbot' },
  { icon: Award, label: 'Loyalty', path: '/admin/loyalty' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="fixed h-full w-72 bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100">
      <div className="h-20 flex items-center px-8 border-b border-gray-700/50">
        <Link to="/admin/dashboard" className="flex items-center space-x-3 group">
          <div className="p-2 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-all duration-300">
            <img 
              src={logo}
              alt="Logo" 
              className="h-8 w-8"
            />
          </div>
          <span className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
          Dr. A. Van Niekerk
          </span>
        </Link>
      </div>
      
      <nav className="mt-8 flex flex-col h-[calc(100%-5rem)]">
        <div className="flex-1 px-4">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center px-4 py-3 mb-2 rounded-xl transition-all duration-200
                  ${isActive 
                    ? 'bg-gradient-to-r from-blue-500/20 to-blue-500/10 text-blue-400 shadow-lg shadow-blue-500/10' 
                    : 'hover:bg-gray-800/50 hover:translate-x-1'
                  }
                `}
              >
                <div className={`
                  p-2 rounded-lg mr-3
                  ${isActive 
                    ? 'bg-blue-500/20' 
                    : 'bg-gray-800/30'
                  }
                `}>
                  <item.icon className={`
                    h-5 w-5 transition-transform duration-200
                    ${isActive ? 'scale-110' : 'scale-100'}
                  `} />
                </div>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
        
        <div className="px-4 mb-8">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 rounded-xl
              text-red-400 hover:bg-red-500/10 hover:text-red-300
              transition-all duration-200 group"
          >
            <div className="p-2 rounded-lg mr-3 bg-red-500/10 group-hover:bg-red-500/20">
              <LogOut className="h-5 w-5" />
            </div>
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;