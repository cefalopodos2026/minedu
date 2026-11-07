# Plan: Base en Supabase + repositorio GitHub + despliegue en Vercel

Objetivo: publicar el aplicativo "Colegios del Perú" (ya construido y probado en local). Se usarán Supabase para la base de datos, GitHub (`https://github.com/cefalopodos2026/minedu.git`) para el código y Vercel para el despliegue.

## Requisitos previos (los completa el usuario en `C:\DONET\MINEDU\.env`, que nunca se sube a git)
- [ ] **Supabase**. Elegir una opción:
  - Opción A: crear el proyecto en supabase.com y completar `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - Opción B: completar `SUPABASE_ACCESS_TOKEN` (supabase.com → Account → Access Tokens) para que Claude cree el proyecto por la API.
- [x] **Vercel**: sesión iniciada con GitHub (cuenta cefalopodos2026) mediante el flujo de dispositivo; no hace falta token.
- [x] Repositorio GitHub público autorizado por el usuario (ingreso a Supabase y Vercel con la cuenta GitHub).

## Tareas
1. [x] **Git local**: `git init`, revisar `.gitignore` (.env, .env.local, tokens, data/raw, data/out, node_modules, .pglite, .vercel) y hacer el commit inicial con el estado actual.
2. [x] **Verificar que no se filtren secretos**: revisar con `git ls-files` y buscar claves antes de cualquier push.
3. [ ] **Supabase, esquema**: ejecutar `supabase/schema.sql` (tabla `iiee`, `ubigeo`, índices, RLS de solo lectura y funciones RPC).
4. [ ] **Supabase, datos**: cargar `data/out/iiee.csv` (180,943 filas) y `ubigeo.csv` (1,892) con `scripts/load.mjs`.
5. [ ] **Supabase, verificación**: contar filas, probar las RPC con la clave anon (búsqueda, resumen, puntos) y confirmar que la clave anon **no puede escribir**.
6. [x] **GitHub**: agregar el remoto `origin` y subir la rama `main` (solo después de la tarea 2).
7. [ ] **Vercel**: crear el proyecto con Root Directory `web`, cargar las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, desplegar en producción y conectarlo al repositorio de GitHub si es posible.
8. [ ] **Verificación final**: abrir la URL de producción en escritorio y celular (capturas), probar filtros, ficha, teléfono y mapa, y revisar que no haya errores de consola.
9. [x] **Informe.md**: informe profesional del proyecto (arquitectura, lenguajes, frontend, backend, datos, seguridad y despliegue).
10. [ ] **Revisión**: añadir la sección de revisión a este archivo y hacer el commit final.

### Nuevos pedidos del usuario (07-11-2026)
11. [x] **Teléfonos fijo y celular**: unir los números del Padrón web 2026 (prioridad, el más reciente) con los del Censo 2025, eliminar duplicados, clasificar cada número como **fijo** o **celular** y añadir el código de ciudad a los fijos que no lo tengan. Se crean las columnas `telefono_fijo` y `celular`. La ficha muestra cada tipo con su botón para llamar, y los celulares con su botón de WhatsApp.
12. [ ] **Mi ubicación y ruta óptima**: obtener la ubicación del celular (GPS del navegador) y trazar en el mapa de calles la ruta hasta un colegio o varios. Con varios colegios se calcula el **orden óptimo de visita**. El modo puede ser auto o a pie y se muestran distancia y tiempo. Un botón abre la navegación paso a paso en Google Maps.
13. [ ] **Compartir por WhatsApp**: enviar el colegio o los seleccionados (datos clave, teléfonos y ubicación) y la ruta.
14. [ ] **Presentación ágil en celular**: barra inferior con Lista / Mapa / Ruta, botones grandes y acciones rápidas en la ficha.

Se hará un commit antes y después de cada tarea importante.

## Revisión
_(se completará al terminar)_
