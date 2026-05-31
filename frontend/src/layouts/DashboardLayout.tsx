import { useNavigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, User as UserIcon } from 'lucide-react';

export function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-indigo-700 text-white flex flex-col shadow-lg shrink-0">
        <div className="p-4 border-b border-indigo-600">
          <h2 className="text-xl font-bold">LevelUP</h2>
          <p className="text-indigo-200 text-sm">Feedback Game</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {/* Navigation links will go here based on roles */}
          <div className="px-4 py-2 bg-indigo-800 rounded-lg font-medium text-sm">
            Dashboard Inicial
          </div>
        </nav>
        
        <div className="p-4 border-t border-indigo-600 bg-indigo-800/50">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-indigo-600 p-2 rounded-full">
              <UserIcon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-indigo-300 truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg transition-colors text-sm"
          >
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
        <Outlet />
      </main>
    </div>
  );
}