# ContabilidadSys

Sistema contable en React + TypeScript + Vite para control de partidas, libros, balances, reportes, auditoria, cierre contable, configuracion de empresa, login local, usuarios y asistente IA para documentos.

## Estado del sistema

- App SPA con React Router.
- Datos persistidos en el navegador con Zustand/localStorage.
- Catalogo de cuentas base en `src/data/cat_cuentas.json`.
- Reportes PDF y exportacion/importacion JSON.
- Asistente IA con OpenAI Responses API para documentos y ejercicios contables.
- Build de produccion verificada con `pnpm build`.
- Lint verificado con `pnpm lint`.

Para contexto de mantenimiento por IA, lee tambien `AGENTS.md`.

## Desarrollo local

1. Instalar dependencias:
   `pnpm install`

   Tambien funciona con npm porque el repo incluye `package-lock.json`:
   `npm install`

2. Iniciar el servidor:
   `pnpm dev`

3. Verificar antes de subir:
   `pnpm lint`
   `pnpm build`

## Funciones principales

- Dashboard con indicadores financieros.
- Partida de apertura.
- Registro de partidas manuales o asistidas por IA.
- Libro Diario y Libro Mayor.
- Balance de Saldos.
- Catalogo de cuentas.
- Auditoria de descuadres, saldos negativos y movimientos invalidos.
- Estado de Resultados.
- Balance General.
- Cierre contable con tasas configurables.
- Reportes y respaldos.
- Configuracion de empresa y periodo fiscal.
- Login local y administracion de usuarios.

## Asistente IA

La IA vive principalmente en:

- `src/utils/openaiDocumentAnalysis.ts`
- `src/pages/RegistrarPartida.tsx`
- `src/pages/Configuracion.tsx`

Usa por defecto:

`/api/openai/v1/responses`

En desarrollo esa ruta funciona con el proxy de Vite definido en `vite.config.ts`.

En produccion necesitas un backend real, una funcion serverless o una regla del servidor que reenvie esa ruta a OpenAI. Si vas a usar otra ruta en produccion, define:

`VITE_OPENAI_API_URL=https://tu-endpoint/responses`

Importante: nunca pongas una API key fija en el codigo ni en el repositorio. La clave se guarda solo en el navegador del usuario desde Configuracion.

## Despliegue por Git pull

Este proyecto esta preparado para publicacion tipo SPA en hosting Apache.

### Lo que ya queda listo

- React Router funciona en rutas internas gracias a `public/.htaccess`.
- `dist/` no se sube al repo.
- La build de produccion se genera con:
  `pnpm build`

### Flujo recomendado

1. Hacer `push` al repositorio.
2. En el hosting ejecutar `git pull`.
3. Instalar dependencias si hace falta:
   `npm install`
   o
   `pnpm install`
4. Generar la build:
   `npm run build`
   o
   `pnpm build`
5. Publicar el contenido de `dist/` en la carpeta publica del hosting.

Si el hosting apunta directo al repositorio y no a `dist/`, agrega un paso de despliegue que copie el contenido de `dist/` al directorio publico.

## Git

Remote actual:

`origin -> https://github.com/HexedsDev/ContabilidadSYS.git`

Branch actual:

`feature/sistema-pro`
