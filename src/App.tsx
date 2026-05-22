import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import { useStore } from './store/useStore';
import { useEffect } from 'react';

function App() {
  const { initializeStore } = useStore();

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  return (
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
