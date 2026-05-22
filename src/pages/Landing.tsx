import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookText,
  BookOpen,
  Scale,
  ShieldCheck,
  FileText,
  ReceiptText,
  Mouse,
} from 'lucide-react';
import { ParticleTextEffect } from '../components/ui/particle-text-effect';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { motion } from 'framer-motion';

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
    <div className="dark min-h-screen bg-[#040712] text-white">
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
        <section className="relative min-h-screen overflow-hidden">
          <div className="absolute inset-0">
            <ParticleTextEffect
              words={['CONTABILIDAD', 'ORDEN', 'CONTROL', 'CIERRE']}
              className="absolute inset-0 h-full w-full !rounded-none !border-0 !bg-transparent opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#040712]/10 via-[#040712]/28 to-[#040712] pointer-events-none" />
          </div>

          <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-end justify-center px-4 pb-10 pt-28 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center gap-5">
              <motion.button
                type="button"
                onClick={() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="flex flex-col items-center gap-2 text-white/62 hover:text-white transition-colors"
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                aria-label="Desplazarse hacia abajo"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/5">
                  <Mouse className="h-4 w-4" />
                </div>
                <span className="text-[11px] uppercase tracking-[0.25em]">Scroll</span>
              </motion.button>
            </div>
          </div>
        </section>

        <section ref={detailsRef} className="border-t border-white/10 bg-[#060b16]">
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
                <Card key={feature.title} className="border-white/10 bg-white/5 text-white backdrop-blur">
                  <CardContent className="pt-6">
                    <feature.icon className="h-5 w-5 text-emerald-300" />
                    <h3 className="mt-5 text-base font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/62">{feature.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#040712]">
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
