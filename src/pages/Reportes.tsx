import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { FileText, Download, FileJson, BookText, BookOpen, Scale } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useStore } from '../store/useStore';
import { 
  exportLibroDiarioPDF, 
  exportLibroMayorPDF, 
  exportBalanceSaldosPDF, 
  exportEstadoResultadosPDF, 
  exportBalanceGeneralPDF 
} from '../utils/pdfExport';

export function Reportes() {
  const { entries, accounts } = useStore();

  const handleExportJSON = () => {
    const dataStr = JSON.stringify({ entries, accounts }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'respaldo_contable.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Reportes Financieros</h1>
        <p className="text-text-muted mt-1">Generación y exportación de información contable.</p>
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-4">Libros Principales</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookText className="w-5 h-5 text-primary-500" />
              Libro Diario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-muted mb-4 h-10">
              Registro cronológico de todas las transacciones financieras.
            </p>
            <Button variant="outline" className="w-full" onClick={() => exportLibroDiarioPDF(entries, accounts)}>
              <Download className="w-4 h-4 mr-2" /> Exportar PDF
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary-500" />
              Libro Mayor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-muted mb-4 h-10">
              Movimientos y saldos detallados por cada cuenta contable.
            </p>
            <Button variant="outline" className="w-full" onClick={() => exportLibroMayorPDF(entries, accounts)}>
              <Download className="w-4 h-4 mr-2" /> Exportar PDF
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary-500" />
              Balance de Saldos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-muted mb-4 h-10">
              Resumen de saldos deudores y acreedores para verificación.
            </p>
            <Button variant="outline" className="w-full" onClick={() => exportBalanceSaldosPDF(entries, accounts)}>
              <Download className="w-4 h-4 mr-2" /> Exportar PDF
            </Button>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-4">Estados Financieros</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              Estado de Resultados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-muted mb-4 h-10">
              Ingresos, costos y gastos del periodo, determinando la utilidad o pérdida.
            </p>
            <Button variant="outline" className="w-full" onClick={() => exportEstadoResultadosPDF(entries, accounts)}>
              <Download className="w-4 h-4 mr-2" /> Exportar PDF
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              Balance General
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-muted mb-4 h-10">
              Situación financiera: Activos, Pasivos y Patrimonio en una fecha.
            </p>
            <Button variant="outline" className="w-full" onClick={() => exportBalanceGeneralPDF(entries, accounts)}>
              <Download className="w-4 h-4 mr-2" /> Exportar PDF
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="w-5 h-5 text-secondary-500" />
              Respaldo de Datos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-muted mb-4 h-10">
              Exportar toda la información de la base de datos local en formato JSON.
            </p>
            <Button variant="outline" className="w-full" onClick={handleExportJSON}>
              <Download className="w-4 h-4 mr-2" /> Exportar JSON
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
