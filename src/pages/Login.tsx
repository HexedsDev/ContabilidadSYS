import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookText, FileBarChart2, ShieldCheck, UserRound } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent } from '../components/ui/Card';
import { useAuthStore } from '../store/useAuthStore';
import { useToast } from '../components/ui/toast-context';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const hydrated = useAuthStore(s => s.hydrated);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const login = useAuthStore(s => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const from = useMemo(() => {
    const state = location.state as { from?: string } | null;
    return state?.from ?? '/app';
  }, [location.state]);

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [hydrated, isAuthenticated, from, navigate]);

  if (hydrated && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const result = login(email, password);
    setLoading(false);

    if (!result.success) {
      toast.error('No se pudo iniciar sesión', result.message);
      return;
    }

    toast.success('Sesión iniciada', 'Bienvenido al sistema contable');
    navigate(from, { replace: true });
  };

  return (
    <div className="dark relative min-h-screen overflow-hidden bg-[#0d1014] text-white">
      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="px-4 py-5 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <section className="max-w-xl">
              <Badge variant="outline" className="border-white/10 bg-white/5 text-white/75">
                Sistema contable
              </Badge>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                Ordena tu trabajo contable desde una sola vista
              </h1>
              <p className="mt-5 text-base leading-7 text-white/65">
                Registra partidas, revisa libros, controla saldos y prepara reportes sin ir saltando entre hojas,
                archivos y anotaciones sueltas.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  {
                    icon: BookText,
                    title: 'Partidas',
                    text: 'Captura y seguimiento',
                  },
                  {
                    icon: FileBarChart2,
                    title: 'Reportes',
                    text: 'Balances y exportacion',
                  },
                  {
                    icon: ShieldCheck,
                    title: 'Control',
                    text: 'Auditoria y revision',
                  },
                ].map(item => (
                  <Card key={item.title} className="border-white/10 bg-white/[0.04] text-white">
                    <CardContent className="pt-5">
                      <item.icon className="h-4.5 w-4.5 text-primary-300" />
                      <p className="mt-4 text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm text-white/58">{item.text}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-6 overflow-hidden rounded-sm border border-white/10 bg-white/[0.04]">
                <div className="px-4 py-3 text-sm text-white/62">
                  Un espacio de trabajo pensado para llevar el registro al dia y revisar la informacion con mas calma.
                </div>
              </div>
            </section>

            <section className="mx-auto w-full max-w-md rounded-sm border border-white/10 bg-[#13161c] p-6 shadow-lg">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-white/10">
                  <UserRound className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Acceso al sistema</p>
                  <p className="text-sm text-white/60">Usa tus credenciales asignadas</p>
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="correo@empresa.com"
                  className="text-white placeholder:text-white/35"
                />
                <Input
                  label="Contraseña"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="text-white placeholder:text-white/35"
                />
                <Button fullWidth loading={loading} type="submit">
                  Entrar
                </Button>
              </form>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
