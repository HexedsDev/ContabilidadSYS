import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './layouts/Layout';
import { Dashboard } from './pages/Dashboard';
import { RegistrarPartida } from './pages/RegistrarPartida';
import { LibroDiario } from './pages/LibroDiario';
import { LibroMayor } from './pages/LibroMayor';
import { BalanceSaldos } from './pages/BalanceSaldos';
import { CatalogoCuentas } from './pages/CatalogoCuentas';
import { Auditoria } from './pages/Auditoria';
import { Reportes } from './pages/Reportes';
import { EstadoResultados } from './pages/EstadoResultados';
import { BalanceGeneral } from './pages/BalanceGeneral';
import { PartidaApertura } from './pages/PartidaApertura';
import { Configuracion } from './pages/Configuracion';
import { useStore } from './store/useStore';
import { ToastProvider } from './components/ui/Toast';

function App() {
  const initializeStore = useStore(s => s.initializeStore);
  const theme = useStore(s => s.theme);

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

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
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="apertura" element={<PartidaApertura />} />
            <Route path="registrar" element={<RegistrarPartida />} />
            <Route path="diario" element={<LibroDiario />} />
            <Route path="mayor" element={<LibroMayor />} />
            <Route path="balance" element={<BalanceSaldos />} />
            <Route path="catalogo" element={<CatalogoCuentas />} />
            <Route path="auditoria" element={<Auditoria />} />
            <Route path="resultados" element={<EstadoResultados />} />
            <Route path="balance-general" element={<BalanceGeneral />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="configuracion" element={<Configuracion />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
