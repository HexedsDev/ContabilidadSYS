# ContabilidadSys

Sistema contable en React + TypeScript + Vite con libros, balances, reportes, auditoria, configuracion de empresa, login local y panel de usuarios.

## Desarrollo local

1. Instala dependencias:
   `pnpm install`
2. Inicia el servidor:
   `pnpm dev`
3. Verifica antes de subir:
   `pnpm build`
   `pnpm lint`

## Despliegue por Git pull

Este proyecto esta preparado para una publicacion tipo SPA en hosting Apache.

### Lo que ya queda listo

- React Router funciona en rutas internas gracias a `public/.htaccess`.
- `dist/` no se sube al repo.
- La build de produccion se genera con:
  `pnpm build`

### Flujo recomendado

1. Hacer `push` al repositorio.
2. En el hosting ejecutar `git pull`.
3. En el hosting instalar dependencias si hace falta:
   `npm install`
   o
   `pnpm install`
4. Generar la build:
   `npm run build`
   o
   `pnpm build`
5. Publicar el contenido de `dist/` en la carpeta publica del hosting.

Si el hosting apunta directo al repositorio y no a `dist/`, hay que agregar un paso de despliegue que copie el contenido de `dist/` al directorio publico.

## Nota importante sobre IA

El analisis con OpenAI usa por defecto la ruta:

`/api/openai/v1/responses`

En desarrollo funciona con el proxy de Vite. En produccion necesitas un backend real o un proxy del servidor que reenvie esa ruta a OpenAI.

Si vas a usar otra ruta en produccion, define:

`VITE_OPENAI_API_URL=https://tu-endpoint/responses`

## Git

Remote actual:

`origin -> https://github.com/MarkUmes/SistemaContable.git`

Branch actual:

`feature/sistema-pro`

