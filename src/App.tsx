import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { AdminUsuarios } from './pages/AdminUsuarios';
import { Layout } from './layouts/Layout';
import { Dashboard } from './pages/Dashboard';
import { RegistrarPartida } from './pages/RegistrarPartida';
import { ResolverEjercicio } from './pages/ResolverEjercicio';
import { LibroDiario } from './pages/LibroDiario';
import { LibroMayor } from './pages/LibroMayor';
import { BalanceSaldos } from './pages/BalanceSaldos';
import { CatalogoCuentas } from './pages/CatalogoCuentas';
import { Auditoria } from './pages/Auditoria';
import { Reportes } from './pages/Reportes';
import { EstadoResultados } from './pages/EstadoResultados';
import { BalanceGeneral } from './pages/BalanceGeneral';
import { Cierre } from './pages/Cierre';
import { PartidaApertura } from './pages/PartidaApertura';
import { Configuracion } from './pages/Configuracion';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore } from './store/useAuthStore';
import { useStore } from './store/useStore';
import { ToastProvider } from './components/ui/Toast';

function App() {
  const initializeStore = useStore(s => s.initializeStore);
  const theme = useStore(s => s.theme);

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  useEffect(() => {
    const markHydrated = () => {
      if (!useAuthStore.getState().hydrated) {
        useAuthStore.setState({ hydrated: true });
      }
    };

    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      markHydrated();
    });

    if (useAuthStore.persist.hasHydrated()) {
      markHydrated();
    } else {
      void Promise.resolve(useAuthStore.persist.rehydrate()).catch(() => {
        markHydrated();
      });
    }

    const fallbackTimer = window.setTimeout(() => {
      if (!useAuthStore.persist.hasHydrated()) {
        markHydrated();
      }
    }, 400);

    return () => {
      unsubscribe();
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const isDark =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.classList.toggle('dark', isDark);
    };
    apply();
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [theme]);

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="apertura" element={<PartidaApertura />} />
              <Route path="registrar" element={<RegistrarPartida />} />
              <Route path="ejercicio" element={<ResolverEjercicio />} />
              <Route path="diario" element={<LibroDiario />} />
              <Route path="mayor" element={<LibroMayor />} />
              <Route path="balance" element={<BalanceSaldos />} />
              <Route path="catalogo" element={<CatalogoCuentas />} />
              <Route path="auditoria" element={<Auditoria />} />
              <Route path="resultados" element={<EstadoResultados />} />
              <Route path="balance-general" element={<BalanceGeneral />} />
              <Route path="cierre" element={<Cierre />} />
              <Route path="reportes" element={<Reportes />} />
              <Route path="configuracion" element={<Configuracion />} />
              <Route
                path="admin/usuarios"
                element={
                  <ProtectedRoute requiredRole="super_admin">
                    <AdminUsuarios />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
