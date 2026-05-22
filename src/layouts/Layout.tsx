import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
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
  X,
  Trash2,
  TrendingUp,
  PieChart,
  Calculator,
  Sun,
  Moon,
  Monitor,
  Database,
  Sparkles,
  Settings,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useStore, type ThemeMode } from '../store/useStore';
import { Badge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/toast-context';
import { motion, AnimatePresence } from 'framer-motion';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  section?: string;
}

const navItems: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', section: 'General' },
  { to: '/apertura', icon: Calculator, label: 'Partida de Apertura', section: 'Operación' },
  { to: '/registrar', icon: BookPlus, label: 'Registrar Partida', section: 'Operación' },
  { to: '/diario', icon: BookText, label: 'Libro Diario', section: 'Libros' },
  { to: '/mayor', icon: BookOpen, label: 'Libro Mayor', section: 'Libros' },
  { to: '/balance', icon: Scale, label: 'Balance de Saldos', section: 'Estados' },
  { to: '/resultados', icon: TrendingUp, label: 'Estado de Resultados', section: 'Estados' },
  { to: '/balance-general', icon: PieChart, label: 'Balance General', section: 'Estados' },
  { to: '/catalogo', icon: ListTree, label: 'Catálogo de Cuentas', section: 'Configuración' },
  { to: '/auditoria', icon: ShieldAlert, label: 'Auditoría', section: 'Configuración' },
  { to: '/reportes', icon: FileText, label: 'Exportar Reportes', section: 'Configuración' },
  { to: '/configuracion', icon: Settings, label: 'Empresa', section: 'Configuración' },
];

const groupedNav = navItems.reduce<Record<string, NavItem[]>>((acc, item) => {
  const sec = item.section ?? 'Otros';
  if (!acc[sec]) acc[sec] = [];
  acc[sec].push(item);
  return acc;
}, {});

const themeOptions: { value: ThemeMode; icon: React.ElementType; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Claro' },
  { value: 'dark', icon: Moon, label: 'Oscuro' },
  { value: 'system', icon: Monitor, label: 'Sistema' },
];

export function Layout() {
  const collapsed = useStore(s => s.sidebarCollapsed);
  const toggleSidebar = useStore(s => s.toggleSidebar);
  const theme = useStore(s => s.theme);
  const setTheme = useStore(s => s.setTheme);
  const clearData = useStore(s => s.clearData);
  const loadFakeData = useStore(s => s.loadFakeData);
  const entries = useStore(s => s.entries);
  const alerts = useStore(s => s.alerts);
  const empresa = useStore(s => s.empresa);

  const toast = useToast();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  const activeAlertCount = alerts.filter(a => !a.resuelta).length;

  // Close overlays on route change — syncing to an external system (router)
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setMobileOpen(false);
    setThemeOpen(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [location.pathname]);

  const handleClear = () => {
    clearData();
    setConfirmOpen(false);
    toast.success('Datos restablecidos', 'Las partidas y alertas fueron eliminadas');
  };

  const handleLoadDemo = () => {
    if (entries.length > 0) {
      toast.warning('Ya hay datos', 'Borra los datos actuales para cargar el demo');
      return;
    }
    loadFakeData();
    toast.success('Datos de demo cargados', '10 partidas de ejemplo agregadas');
  };

  const renderNav = (sidebarCollapsed: boolean) => (
    <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
      {Object.entries(groupedNav).map(([section, items]) => (
        <div key={section}>
          {!sidebarCollapsed && (
            <p className="px-3 text-[10px] font-semibold tracking-widest text-text-subtle uppercase mb-2">
              {section}
            </p>
          )}
          <ul className="space-y-0.5">
            {items.map(item => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-white'
                        : 'text-text-muted hover:bg-surface-soft hover:text-text-main',
                      sidebarCollapsed && 'justify-center px-0'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="nav-active"
                          className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary-600"
                        />
                      )}
                      <item.icon className="w-4.5 h-4.5 shrink-0" style={{ width: 18, height: 18 }} />
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                      {!sidebarCollapsed && item.to === '/auditoria' && activeAlertCount > 0 && (
                        <Badge variant="error" size="sm" className="ml-auto">
                          {activeAlertCount}
                        </Badge>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex h-screen bg-background text-text-main overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex bg-surface border-r border-border-soft flex-col transition-[width] duration-300 ease-out',
          collapsed ? 'w-[72px]' : 'w-[260px]'
        )}
      >
        <div className={cn('h-16 border-b border-border-soft flex items-center', collapsed ? 'justify-center px-2' : 'px-5 justify-between')}>
          {collapsed ? (
            <img src="/logo.svg" alt="Sistema Contable" className="w-9 h-9 shrink-0" />
          ) : (
            <div className="flex items-center gap-2.5 min-w-0">
              <img src="/logo.svg" alt="Sistema Contable" className="w-9 h-9 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold tracking-tight text-text-main truncate">Contabilidad</p>
                <p className="text-[10px] uppercase tracking-widest text-text-subtle">Sistema</p>
              </div>
            </div>
          )}
        </div>

        {renderNav(collapsed)}

        <div className="p-3 border-t border-border-soft space-y-1">
          <button
            onClick={handleLoadDemo}
            title={collapsed ? 'Cargar demo' : undefined}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-100/10 transition-colors',
              collapsed && 'justify-center px-0'
            )}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Cargar demo</span>}
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            title={collapsed ? 'Borrar datos' : undefined}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-medium text-error hover:bg-error-soft transition-colors',
              collapsed && 'justify-center px-0'
            )}
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Borrar datos</span>}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="md:hidden fixed inset-0 bg-slate-950/60 z-40 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-surface border-r border-border-soft flex flex-col"
            >
              <div className="h-16 px-5 border-b border-border-soft flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img src="/logo.svg" alt="Sistema Contable" className="w-9 h-9 shrink-0" />
                  <p className="text-sm font-bold tracking-tight">Contabilidad</p>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-2 rounded-md hover:bg-surface-soft">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {renderNav(false)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-surface/80 backdrop-blur border-b border-border-soft flex items-center px-4 sm:px-6 justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-md text-text-muted hover:bg-surface-soft transition-colors"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={toggleSidebar}
              className="hidden md:inline-flex p-2 rounded-md text-text-muted hover:bg-surface-soft transition-colors"
              aria-label="Colapsar barra lateral"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Badge variant="outline" size="md">
              {empresa.ciclo}
            </Badge>
            <Badge variant="default" size="md" className="hidden sm:inline-flex">
              <Database className="w-3 h-3" />
              {entries.length} partidas
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme switcher */}
            <div className="relative">
              <button
                onClick={() => setThemeOpen(v => !v)}
                className="p-2 rounded-md text-text-muted hover:bg-surface-soft transition-colors ring-focus"
                aria-label="Cambiar tema"
              >
                {theme === 'dark' ? <Moon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} /> : theme === 'light' ? <Sun className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} /> : <Monitor className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />}
              </button>
              <AnimatePresence>
                {themeOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setThemeOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 mt-2 w-44 bg-surface border border-border-soft rounded-sm shadow-lg overflow-hidden z-40 py-1"
                    >
                      {themeOptions.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setTheme(opt.value);
                            setThemeOpen(false);
                          }}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                            theme === opt.value
                              ? 'bg-primary-50 text-primary-700 dark:text-primary-300'
                              : 'text-text-main hover:bg-surface-soft'
                          )}
                        >
                          <opt.icon className="w-4 h-4" />
                          {opt.label}
                          {theme === opt.value && <span className="ml-auto text-xs">✓</span>}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="hidden sm:flex items-center gap-2.5 pl-2 ml-1 border-l border-border-soft">
              <div className="text-right">
                <p className="text-xs font-semibold text-text-main leading-none truncate max-w-[180px]">
                  {empresa.razon_social}
                </p>
                <p className="text-[10px] text-text-muted mt-0.5">NIT {empresa.nit}</p>
              </div>
              <div className="w-9 h-9 rounded bg-primary-600 text-white flex items-center justify-center font-bold text-sm">
                {empresa.razon_social.slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
        </div>
      </main>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleClear}
        title="¿Borrar todos los datos?"
        message="Esta acción eliminará todas las partidas y alertas registradas. El catálogo de cuentas se restablecerá al original."
        confirmText="Sí, borrar todo"
        variant="danger"
      />
    </div>
  );
}
