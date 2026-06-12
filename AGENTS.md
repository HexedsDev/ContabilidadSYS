# Guia para IA y agentes de mantenimiento

Este archivo existe para que una IA pueda continuar el proyecto sin romper reglas contables, rutas, persistencia o despliegue.

## Objetivo del sistema

ContabilidadSys es una SPA contable para Guatemala. Debe ayudar a registrar partidas de diario, generar libros y estados financieros, auditar errores y usar IA para proponer borradores contables desde documentos o ejercicios completos.

## Stack y comandos

- React + TypeScript + Vite.
- Estado global con Zustand persistido en localStorage.
- UI con componentes propios en `src/components/ui`.
- Iconos con `lucide-react`.
- PDF con `jspdf` y `jspdf-autotable`.
- Verificacion obligatoria antes de cerrar cambios:
  - `pnpm lint`
  - `pnpm build`

## Archivos clave

- `src/App.tsx`: rutas principales.
- `src/store/useStore.ts`: catalogo, partidas, empresa, tasas de cierre, IA y selectores financieros.
- `src/store/useAuthStore.ts`: login local y usuarios.
- `src/types/index.ts`: contratos principales.
- `src/data/cat_cuentas.json`: catalogo activo de cuentas.
- `src/utils/openaiDocumentAnalysis.ts`: prompt, schemas y llamadas a OpenAI.
- `src/pages/RegistrarPartida.tsx`: flujo manual, analisis IA y guardado de partidas.
- `src/utils/cierre.ts`: cierre, depreciaciones, ISR, reserva legal y estados finales.
- `src/utils/validation.ts`: validacion segura de respaldos JSON.
- `vite.config.ts`: proxy local `/api/openai` hacia OpenAI.

## Reglas contables que no se deben romper

- Solo cuentas de detalle deben recibir movimientos.
- Toda partida contabilizada debe cuadrar Debe = Haber al centavo.
- Si una partida descuadrada intenta guardarse como `contabilizada`, el store la degrada a `borrador`.
- IVA Guatemala es 12%.
- Facturas de compra: base al gasto/compra/activo y IVA al debe en `1.1.10 IVA por Cobrar`.
- Facturas de venta: base al haber en ventas/ingresos y IVA al haber en `2.1.05 IVA por Pagar`.
- Compras de mercaderia del periodo usan `5.1.01 Compras`, no inventario `1.1.13`.
- Inventario `1.1.13` se usa en apertura o ajustes de inventario, no como compra normal.
- Devolucion sobre ventas usa `5.1.04` al debe y reversa IVA por pagar al debe.
- Devolucion sobre compras usa `4.1.03` al haber y reversa IVA por cobrar al haber.
- Cuota patronal IGSS es gasto.
- Cuota laboral IGSS no es gasto; se retiene al trabajador y va a pasivo.
- No inventar cuentas. Si falta una cuenta, agregarla al catalogo de forma explicita y revisar reportes.

## Reglas para IA/OpenAI

- No llamar `https://api.openai.com` directo desde el navegador en produccion.
- En desarrollo se usa el proxy de Vite: `/api/openai/v1/responses`.
- En produccion se debe configurar `VITE_OPENAI_API_URL` o un backend/proxy equivalente.
- Nunca hardcodear API keys.
- Mantener respuestas de IA en JSON estricto cuando se usen schemas.
- Si se mejora el prompt, conservar:
  - catalogo de cuentas permitido,
  - cuadre obligatorio,
  - reglas de IVA,
  - reglas de planilla IGSS,
  - ejemplos few-shot,
  - validacion posterior en UI.

## Persistencia y seguridad

- La app no tiene backend ni base de datos.
- Los datos del usuario viven en localStorage.
- Los respaldos JSON deben pasar por `validateBackup`.
- No relajar validaciones contra prototype pollution, payloads grandes o referencias a cuentas inexistentes.
- No guardar secretos en archivos del repo.

## UX y arquitectura

- Mantener rutas bajo `/app` protegidas por `ProtectedRoute`.
- Reutilizar componentes de `src/components/ui`.
- Para nuevos botones, usar iconos de `lucide-react` cuando aplique.
- No duplicar logica financiera en paginas si ya existe en `src/utils/cierre.ts`, `src/utils/financial.ts` o selectores del store.
- Mantener reportes y PDF alineados con los calculos de las pantallas.

## Checklist antes de terminar

1. Revisar que la pantalla afectada compile con TypeScript.
2. Ejecutar `pnpm lint`.
3. Ejecutar `pnpm build`.
4. Si se toca IA, probar al menos un caso manual de compra, venta, devolucion o planilla.
5. Si se toca cierre/reportes, comparar Estado de Resultados, Balance General y PDF.
