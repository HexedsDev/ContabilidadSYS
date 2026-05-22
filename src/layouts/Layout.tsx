import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookPlus, 
  BookText, 
  BookOpen, 
  Scale, 
  ListTree, 
  ShieldAlert, 
  FileText,
  Menu,
  ChevronLeft,
  Trash2,
  TrendingUp,
  PieChart,
  Calculator
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useStore } from '../store/useStore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/apertura', icon: Calculator, label: 'Partida de Apertura' },
  { to: '/registrar', icon: BookPlus, label: 'Registrar Partida' },
  { to: '/diario', icon: BookText, label: 'Libro Diario' },
  { to: '/mayor', icon: BookOpen, label: 'Libro Mayor' },
  { to: '/balance', icon: Scale, label: 'Balance de Saldos' },
  { to: '/resultados', icon: TrendingUp, label: 'Estado de Resultados' },
  { to: '/balance-general', icon: PieChart, label: 'Balance General' },
  { to: '/catalogo', icon: ListTree, label: 'Catálogo de Cuentas' },
  { to: '/auditoria', icon: ShieldAlert, label: 'Auditoría' },
  { to: '/reportes', icon: FileText, label: 'Exportar Reportes' },
];

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const clearData = useStore(state => state.clearData);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "bg-surface border-r border-border-soft flex flex-col transition-all duration-300 ease-in-out",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-4 border-b border-border-soft h-16 flex items-center justify-between">
          {isSidebarOpen ? (
            <div className="flex items-center text-primary-600 overflow-hidden px-2">
              <h1 className="text-xl font-bold tracking-tight whitespace-nowrap">Proyecto Contabilidad</h1>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full text-primary-600">
              <span className="text-xl font-bold">P</span>
            </div>
          )}
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 overflow-x-hidden">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  title={!isSidebarOpen ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive 
                        ? 'bg-primary-50 text-primary-600' 
                        : 'text-text-muted hover:bg-background hover:text-text-main',
                      !isSidebarOpen && 'justify-center px-0'
                    )
                  }
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {isSidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-border-soft">
          <ul className="space-y-1">
            <li>
              <button 
                onClick={() => clearData()}
                title={!isSidebarOpen ? "Borrar Datos" : undefined}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors",
                  !isSidebarOpen && 'justify-center px-0'
                )}
              >
                <Trash2 className="w-5 h-5 shrink-0" />
                {isSidebarOpen && <span className="whitespace-nowrap">Borrar Datos</span>}
              </button>
            </li>
          </ul>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-surface border-b border-border-soft flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-md text-text-muted hover:bg-background transition-colors"
            >
              {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="text-sm font-medium text-text-muted hidden sm:inline">Ciclo Contable: 2026</span>
            <Badge variant="success">En línea</Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-sm">
              AU
            </div>
            <div className="text-sm hidden sm:block">
              <p className="font-medium text-text-main leading-none">Auditor Jefe</p>
              <p className="text-text-muted">auditoria@empresa.com</p>
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function Badge({ children, variant }: { children: React.ReactNode, variant: string }) {
  return (
    <span className={cn(
      "px-2 py-1 text-xs font-semibold rounded-full",
      variant === 'success' ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
    )}>
      {children}
    </span>
  );
}
