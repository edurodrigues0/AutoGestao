import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  LayoutDashboard, Wrench, Users, FileText, Settings, CreditCard,
  LogOut, Menu, X, Plus, ClipboardList, ChevronRight
} from "lucide-react";

const adminNavItems = [
  { path: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/admin/add-service", icon: Plus, label: "Registrar Serviço" },
  { path: "/admin/services", icon: ClipboardList, label: "Serviços" },
  { path: "/admin/mechanics", icon: Users, label: "Mecânicos" },
  { path: "/admin/reports", icon: FileText, label: "Relatórios" },
  { path: "/admin/settings", icon: Settings, label: "Configurações" },
  { path: "/admin/billing", icon: CreditCard, label: "Assinatura" },
];

const mechanicNavItems = [
  { path: "/mechanic/dashboard", icon: LayoutDashboard, label: "Início" },
  { path: "/mechanic/add-service", icon: Plus, label: "Registrar" },
  { path: "/mechanic/services", icon: ClipboardList, label: "Meus Serviços" },
  { path: "/mechanic/profile", icon: Settings, label: "Perfil" },
];

export function AdminLayout({ children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <Wrench size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm" style={{ fontFamily: 'Outfit' }}>AutoGestão</p>
            <p className="text-xs text-slate-500 truncate max-w-[120px]">{user?.workspace?.name || "Admin"}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {adminNavItems.map(({ path, icon: Icon, label }) => {
          // Mechanics only see Dashboard and Services in this layout
          const isMechanic = user?.role === "mechanic";
          const allowedForMechanic = ["Dashboard", "Serviços"].includes(label);
          if (isMechanic && !allowedForMechanic) return null;

          const active = location.pathname === path;
          const isRestricted = ["Serviços", "Mecânicos", "Relatórios", "Configurações", "Registrar Serviço"].includes(label);
          const isBlocked = isRestricted && user?.workspace?.status !== "active";

          return (
            <Link
              key={path}
              to={isBlocked ? "#" : path}
              onClick={(e) => {
                if (isBlocked) {
                  e.preventDefault();
                  return;
                }
                setSidebarOpen(false);
              }}
              data-testid={`nav-${label.toLowerCase().replace(/\s/g, '-')}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-fast ${active
                  ? "bg-blue-600 text-white"
                  : isBlocked
                    ? "text-slate-300 cursor-not-allowed opacity-50"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              title={isBlocked ? "Finalize o pagamento para acessar" : ""}
            >
              <Icon size={18} />
              {label}
              {active && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          );
        })}
        {user?.role === "mechanic" && (
          <Link
            to="/mechanic/add-service"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-fast"
          >
            <Plus size={18} />
            Registrar Serviço
          </Link>
        )}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 cursor-pointer" onClick={handleLogout} data-testid="logout-btn">
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-slate-600">{(user?.name || "A")[0].toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role === 'admin' ? 'Administrador' : 'Mecânico'}</p>
          </div>
          <LogOut size={16} className="text-slate-400" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <p className="font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>Menu</p>
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X size={20} className="text-slate-600" />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 md:px-6 gap-4 flex-shrink-0">
          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100"
            onClick={() => setSidebarOpen(true)}
            data-testid="sidebar-toggle"
          >
            <Menu size={20} className="text-slate-600" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>{title}</h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:block text-sm text-slate-500">Olá, {user?.name?.split(" ")[0]}</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export function MechanicLayout({ children, title, showAddButton = true }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-lg mx-auto relative">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Wrench size={15} className="text-white" />
          </div>
          <span className="font-bold text-slate-900 text-sm" style={{ fontFamily: 'Outfit' }}>AutoGestão</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-medium text-slate-900">{user?.name?.split(" ")[0]}</p>
            <p className="text-xs text-slate-400">Mecânico</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-full hover:bg-slate-100"
            data-testid="mechanic-logout-btn"
          >
            <LogOut size={16} className="text-slate-500" />
          </button>
        </div>
      </header>

      {/* Page Title */}
      {title && (
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>{title}</h1>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-slate-200 z-30">
        <div className="flex items-center justify-around py-2">
          {mechanicNavItems.filter((item) => {
            if (item.label === "Início" && (!user?.permissions || !user.permissions.includes("view_all_services"))) return false;
            return true;
          }).map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            const isAdd = path.includes("add-service");
            const isRestricted = ["Registrar", "Meus Serviços"].includes(label);
            const isBlocked = isRestricted && user?.workspace?.status !== "active";

            return (
              <Link
                key={path}
                to={isBlocked ? "#" : path}
                onClick={(e) => {
                  if (isBlocked) {
                    e.preventDefault();
                  }
                }}
                data-testid={`bottom-nav-${label.toLowerCase().replace(/\s/g, '-')}`}
                className={`flex flex-col items-center gap-1 px-4 py-1 transition-opacity ${isBlocked ? "opacity-30 cursor-not-allowed" : ""}`}
                title={isBlocked ? "Pagamento da oficina pendente" : ""}
              >
                {isAdd ? (
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${active ? "bg-blue-700" : (isBlocked ? "bg-slate-400" : "bg-blue-600")} shadow-lg`}>
                    <Icon size={22} className="text-white" />
                  </div>
                ) : (
                  <Icon size={22} className={active ? "text-blue-600" : (isBlocked ? "text-slate-300" : "text-slate-400")} />
                )}
                <span className={`text-xs font-medium ${active ? "text-blue-600" : (isBlocked ? "text-slate-300" : "text-slate-400")}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
