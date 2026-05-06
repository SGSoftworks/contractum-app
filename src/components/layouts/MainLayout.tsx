import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Link as LinkIcon, Settings, LogOut, Menu, X, Users } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Contratos', href: '/contracts', icon: FileText },
  { name: 'Blockchain', href: '/blockchain', icon: LinkIcon },
  { name: 'Auditoría', href: '/audit', icon: FileText },
  { name: 'Usuarios', href: '/users', icon: Users },
  { name: 'Configuración', href: '/settings', icon: Settings },
];

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { profile, signOut } = useAuthStore();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/80 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - Ahora usa Deep Background (#0B2A4A que es primary-900) */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-primary-900 border-r border-primary-800 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:flex lg:flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-24 shrink-0 items-center justify-center border-b border-primary-800 bg-primary-900 relative">
          <img src="/logoAzul.png" alt="Contractum Logo" className="h-16 w-auto object-contain mix-blend-lighten drop-shadow-md" />
          <button className="absolute right-4 lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-6 w-6 text-primary-200 hover:text-white" />
          </button>
        </div>
        
        <nav className="flex flex-1 flex-col px-4 py-6">
          <ul role="list" className="flex flex-1 flex-col gap-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex gap-x-3 rounded-xl p-3 text-sm leading-6 font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-800 text-white font-semibold shadow-sm ring-1 ring-primary-700/50'
                        : 'text-primary-200 hover:bg-primary-800/50 hover:text-white'
                    }`}
                  >
                    <item.icon className={`h-5 w-5 shrink-0 transition-colors ${isActive ? 'text-secondary-400' : 'text-primary-400 group-hover:text-secondary-400'}`} />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
          
          {/* User Profile Footer */}
          <div className="mt-auto pt-6 border-t border-primary-800">
            <div className="flex items-center gap-x-4 px-3 py-3 rounded-xl hover:bg-primary-800/50 transition-colors cursor-pointer">
              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-secondary-500 to-secondary-400 flex items-center justify-center text-primary-900 font-bold shadow-sm">
                {profile?.full_name ? profile.full_name.substring(0, 2).toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{profile?.full_name || 'Usuario'}</p>
                <p className="text-xs text-primary-300 truncate capitalize">{profile?.role?.replace('_', ' ') || 'Sin Rol'}</p>
              </div>
              <button onClick={() => signOut()} className="text-primary-400 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-primary-800">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col lg:pl-0 min-w-0">
        {/* Top Navbar */}
        <div className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button type="button" className="-m-2.5 p-2.5 text-slate-700 lg:hidden hover:bg-slate-100 rounded-md transition-colors" onClick={() => setSidebarOpen(true)}>
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 justify-between items-center">
            <h1 className="text-xl font-semibold text-primary-800 truncate">
               {navigation.find(n => location.pathname === n.href || (n.href !== '/' && location.pathname.startsWith(n.href)))?.name || 'Contractum'}
            </h1>
          </div>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
