import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookText,
  BookOpen,
  Scale,
  ShieldCheck,
  FileText,
  ReceiptText,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';

const features = [
  {
    icon: ReceiptText,
    title: 'Registrar partidas',
    text: 'Captura asientos, guarda borradores y completa movimientos con una vista clara de debe y haber.',
  },
  {
    icon: BookText,
    title: 'Libro diario',
    text: 'Consulta el detalle cronologico de las operaciones y vuelve a cualquier partida cuando haga falta revisarla.',
  },
  {
    icon: BookOpen,
    title: 'Libro mayor',
    text: 'Sigue el movimiento por cuenta para revisar saldos, detectar diferencias y trabajar con mas orden.',
  },
  {
    icon: Scale,
    title: 'Balances y reportes',
    text: 'Genera balance de saldos, estado de resultados, balance general y exportaciones listas para entregar.',
  },
  {
    icon: ShieldCheck,
    title: 'Auditoria',
    text: 'Mantiene alertas, observaciones y seguimiento para revisar inconsistencias antes del cierre.',
  },
  {
    icon: FileText,
    title: 'Respaldo',
    text: 'Permite exportar e importar la informacion del sistema para conservar configuraciones y movimientos.',
  },
];

export function Landing() {
  const navigate = useNavigate();
  const detailsRef = useRef<HTMLElement>(null);

  return (
    <div className="dark min-h-screen bg-[#0d1014] text-white">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-sm border border-white/10 bg-white/5">
              <img src="/logo.svg" alt="ContabilidadSys" className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">ContabilidadSys</p>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/55">Sistema contable</p>
            </div>
          </div>

          <Button
            variant="outline"
            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
            onClick={() => navigate('/login')}
          >
            Iniciar sesion
          </Button>
        </div>
      </header>

      <main>
        <section className="border-b border-white/10">
          <div className="mx-auto max-w-7xl px-4 pt-40 pb-24 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/45">
              Sistema contable · Guatemala
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Contabilidad clara, de la partida de apertura al cierre
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/65">
              Registra partidas con el IVA separado, lleva los libros al día y genera Estado de
              Resultados y Balance General con ISR y reserva legal calculados automáticamente.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={() => navigate('/login')}>Iniciar sesión</Button>
              <Button
                variant="outline"
                className="border-white/15 bg-transparent text-white hover:bg-white/10"
                onClick={() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                Ver funciones
              </Button>
            </div>
          </div>
        </section>

        <section ref={detailsRef} className="bg-[#10141b]">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/45">Que puede hacer el sistema</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Pensado para el trabajo diario del contador</h2>
              <p className="mt-4 text-base leading-7 text-white/65">
                El sistema reune las tareas mas comunes en un solo flujo: registrar movimientos, revisar cuentas,
                controlar saldos, detectar observaciones y preparar reportes para seguimiento o entrega.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {features.map(feature => (
                <Card key={feature.title} className="border-white/10 bg-white/[0.04] text-white">
                  <CardContent className="pt-6">
                    <feature.icon className="h-5 w-5 text-primary-300" />
                    <h3 className="mt-5 text-base font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/62">{feature.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#0d1014]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>ContabilidadSys para registro, control y reportes contables.</p>
          <button className="text-left text-white/75 hover:text-white transition-colors" onClick={() => navigate('/login')}>
            Ir al login
          </button>
        </div>
      </footer>
    </div>
  );
}
