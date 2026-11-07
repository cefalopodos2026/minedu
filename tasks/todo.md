# Plan: Base en Supabase + repositorio GitHub + despliegue en Vercel

Objetivo: publicar el aplicativo "Colegios del Perú" (ya construido y probado en local). Se usarán Supabase para la base de datos, GitHub (`https://github.com/cefalopodos2026/minedu.git`) para el código y Vercel para el despliegue.

## Requisitos previos (los completa el usuario en `C:\DONET\MINEDU\.env`, que nunca se sube a git)
- [x] **Supabase**: creado desde el Marketplace de Vercel (integración oficial `minedu`, región São Paulo). Las variables se conectaron al proyecto automáticamente.
- [x] **Vercel**: sesión iniciada con GitHub (cuenta cefalopodos2026) mediante el flujo de dispositivo; no hace falta token.
- [x] Repositorio GitHub público autorizado por el usuario (ingreso a Supabase y Vercel con la cuenta GitHub).

## Tareas
1. [x] **Git local**: `git init`, revisar `.gitignore` (.env, .env.local, tokens, data/raw, data/out, node_modules, .pglite, .vercel) y hacer el commit inicial con el estado actual.
2. [x] **Verificar que no se filtren secretos**: revisar con `git ls-files` y buscar claves antes de cualquier push.
3. [x] **Supabase, esquema**: ejecutar `supabase/schema.sql` (tabla `iiee`, `ubigeo`, índices, RLS de solo lectura y funciones RPC).
4. [x] **Supabase, datos**: cargar `data/out/iiee.csv` (180,943 filas) y `ubigeo.csv` (1,892) con `scripts/load.mjs`.
5. [x] **Supabase, verificación**: contar filas, probar las RPC con la clave anon (búsqueda, resumen, puntos) y confirmar que la clave anon **no puede escribir**.
6. [x] **GitHub**: agregar el remoto `origin` y subir la rama `main` (solo después de la tarea 2).
7. [x] **Vercel**: crear el proyecto con Root Directory `web`, cargar las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, desplegar en producción y conectarlo al repositorio de GitHub si es posible.
8. [x] **Verificación final**: abrir la URL de producción en escritorio y celular (capturas), probar filtros, ficha, teléfono y mapa, y revisar que no haya errores de consola.
9. [x] **Informe.md**: informe profesional del proyecto (arquitectura, lenguajes, frontend, backend, datos, seguridad y despliegue).
10. [x] **Revisión**: añadir la sección de revisión a este archivo y hacer el commit final.

### Nuevos pedidos del usuario (07-11-2026)
11. [x] **Teléfonos fijo y celular**: unir los números del Padrón web 2026 (prioridad, el más reciente) con los del Censo 2025, eliminar duplicados, clasificar cada número como **fijo** o **celular** y añadir el código de ciudad a los fijos que no lo tengan. Se crean las columnas `telefono_fijo` y `celular`. La ficha muestra cada tipo con su botón para llamar, y los celulares con su botón de WhatsApp.
12. [x] **Mi ubicación y ruta óptima**: obtener la ubicación del celular (GPS del navegador) y trazar en el mapa de calles la ruta hasta un colegio o varios. Con varios colegios se calcula el **orden óptimo de visita**. El modo puede ser auto o a pie y se muestran distancia y tiempo. Un botón abre la navegación paso a paso en Google Maps.
13. [x] **Compartir por WhatsApp**: enviar el colegio o los seleccionados (datos clave, teléfonos y ubicación) y la ruta.
14. [x] **Presentación ágil en celular**: barra inferior con Lista / Mapa / Ruta, botones grandes y acciones rápidas en la ficha.

### Pedido: modalidades, códigos, dirección exacta y alumnado por turno
Clasificación oficial por el código `NIV_MOD` del padrón:

| Modalidad | Subnivel | Códigos |
|---|---|---|
| Educación Básica Regular (EBR) | Inicial / Primaria / Secundaria | A1–A5 / B0 / F0 |
| Educación Básica Especial (EBE) | Inicial / Primaria / General | E1 / E2 / E0 |
| Educación Básica Alternativa (EBA) | Inicial e Intermedio / Avanzado / General / Primaria de adultos / Secundaria de adultos | D1 / D2 / D0 / C0 / G0 |
| Educación Técnico-Productiva (ETP) | CETPRO / Educación ocupacional | L0 / L1–L9 |
| Educación Superior | Tecnológica / Pedagógica / Artística | T0, S0 / K0, P0 / M0 |

15. [x] **ETL y esquema**: crear las columnas `modalidad` y `subnivel`, derivadas de `nivel_cod`.
16. [x] **SQL**:
    - nuevo filtro `p_modalidad`;
    - el resumen agrega el **alumnado por cada turno** (Mañana, Tarde, Noche, Mañana-Tarde, Mañana-Noche, Tarde-Noche, Mañana-Tarde-Noche) y el **número de servicios y alumnos por modalidad**.
17. [x] **Lista de resultados**: mostrar el código modular, el **código de local**, la **dirección exacta** y la modalidad y subnivel.
18. [x] **Filtros**: agregar un filtro "Modalidad", que hace que el filtro "Nivel" muestre solo los niveles de esa modalidad.
19. [x] **Resumen y ficha**:
    - tablas "Alumnado por turno" y "Por modalidad" en el resumen;
    - en la ficha: modalidad, subnivel, **dirección exacta** completa y alumnado del local por cada turno.
20. [x] **Publicar**:
    - recargar Supabase y verificarla;
    - pruebas en escritorio y celular;
    - CSV y WhatsApp con los campos nuevos;
    - actualizar Informe y README, hacer commit, push y verificar en producción.

Nota: el censo informa el alumnado **por servicio educativo**, y cada servicio tiene un solo turno. Por eso el "alumnado por turno" suma los alumnos de los servicios de cada turno. Un servicio "Mañana-Tarde" se cuenta en ese turno combinado, porque el censo no lo separa por mañana y tarde.

### Pedido: inicio de sesión (usuario maestro y usuario de consulta) y marca APLICACIONES DONET
21. [x] **Credenciales fuera del código**: los usuarios y contraseñas (`donet` maestro, `prueba` consulta) se guardan en `.env`, que está en `.gitignore`. Nunca van al repositorio.
22. [x] **Supabase Auth**:
    - el script `scripts/crear-usuarios.mjs` crea o actualiza los usuarios con la clave de servicio;
    - el rol (`maestro` / `consulta`) se guarda en `app_metadata`, que solo puede asignar el servidor;
    - el nombre de usuario se convierte en un correo interno (`usuario@usuarios.donet.local`).
23. [ ] **Base protegida**:
    - RLS y permisos de las funciones solo para usuarios **autenticados con rol** (se quita el acceso anónimo);
    - si alguien se registrara por su cuenta, no vería datos, porque no tendría rol.
24. [x] **Pantalla de inicio**:
    - colores institucionales (rojo y blanco), título "Colegios del Perú · MINEDU (datos ESCALE)";
    - campos Usuario / Contraseña (mostrar u ocultar) y botón "Iniciar sesión";
    - pie "© 2026 APLICACIONES DONET – Soluciones Empresariales";
    - la sesión se mantiene al recargar; en la cabecera aparecen el usuario, el rol y el botón "Salir".
25. [x] **Backend local de pruebas** (`dev-mock.mjs`): inicio de sesión simulado y `auth.jwt()` simulado, para seguir probando sin la nube.
26. [ ] **Publicar**:
    - aplicar el esquema en Supabase, crear los usuarios y verificar que **sin sesión no hay datos** y que con cada usuario sí los hay;
    - pruebas en escritorio y celular;
    - Informe y README, commit, push y verificación en producción.

Se hará un commit antes y después de cada tarea importante.

## Revisión

**Resultado:** el aplicativo está publicado en **https://minedu-swart.vercel.app**. Los datos están en Supabase y el código en https://github.com/cefalopodos2026/minedu.

### Cambios realizados
- **Git y seguridad**
  - Repositorio local con `.gitignore` reforzado: `.env*`, tokens, claves y datos pesados.
  - Escaneo de secretos antes de cada push.
  - Autor de los commits configurado como `cefalopodos2026` (configuración local del repositorio).
- **Supabase**
  - Creado desde el Marketplace de Vercel (región São Paulo).
  - Esquema, índices, RLS de solo lectura y funciones RPC.
  - 180,943 servicios educativos y 1,892 distritos cargados por conexión **SSL verificada** con la CA raíz de Supabase.
- **Vercel**
  - Proyecto `minedu` con raíz `web`, conectado a GitHub, que despliega en cada push a `main`.
  - Las variables de Supabase las inyecta la integración.
- **Teléfonos fijo y celular**
  - Se unen el padrón 2026 (prioridad) y el Censo 2025, se eliminan duplicados y se añade el código de ciudad a los fijos.
  - Hay 38,628 colegios con teléfono: 31,194 con fijo y 9,560 con celular.
- **Mi ubicación y ruta óptima**
  - GPS y OSRM/OpenStreetMap: orden óptimo de visita, auto o a pie, tiempo y distancia, y navegación en Google Maps.
  - Hay un límite de 30 s ante demoras del servicio público.
- **WhatsApp:** permite enviar un colegio, los seleccionados o la ruta, con teléfonos, ubicación y enlaces.
- **Celular:** barra Lista / Mapa / Ruta, acciones rápidas en la ficha y botón "Mi ubicación".
- **Documentación:** `Informe.md` y `README.md` actualizados.

### Problemas encontrados y su causa raíz
- **Fechas inválidas y bytes NUL** en el DBF de ESCALE: se corrigen en el ETL (`etl.mjs` y `dbf.mjs`).
- **Error del mapa en el celular** (coordenadas NaN): ocurría al centrar el mapa mientras estaba oculto. Ahora la acción queda pendiente hasta que el mapa se vuelve visible.
- **Fijos sin código de ciudad en el Censo** (por ejemplo `427545`): se completa el código según el departamento.
- **Error SSL al cargar en Supabase** (`SELF_SIGNED_CERT_IN_CHAIN`): en lugar de desactivar la verificación, se usa `verify-full` con la CA raíz pública de Supabase (`supabase/prod-ca-2021.crt`).
- **Rutas lentas** (0.8 s a 10 s en el servidor público): se muestran mensajes por fase y se corta a los 30 s con un mensaje claro.
- **Autor de git incorrecto** (`pecepeperu2026-ops`, de la configuración global): se fijó `cefalopodos2026` en el repositorio y se corrigieron los commits aún no subidos.
- **Botón de WhatsApp desbordado en la ficha del celular**: ahora pasa a la línea siguiente.

### Pendientes y observaciones
- Los 2 primeros commits, que ya estaban en GitHub, conservan el autor `pecepeperu2026-ops`. Cambiarlos requiere reescribir el historial remoto (*force push*), que solo se hará si el usuario lo pide.
- Las rutas usan el servidor público y gratuito de OSRM. Para un uso masivo conviene uno propio.
- Para actualizar los datos cuando ESCALE publique un nuevo padrón: `npm run etl` y `npm run load` en `scripts/`.
