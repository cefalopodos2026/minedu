# Informe técnico: "Colegios del Perú", directorio y mapa de instituciones educativas

| | |
|---|---|
| **Proyecto** | Aplicativo web para ubicar y consultar colegios del Perú |
| **Fuente de datos** | ESCALE, Unidad de Estadística del Ministerio de Educación (MINEDU) |
| **Repositorio** | https://github.com/cefalopodos2026/minedu |
| **Aplicación en producción** | **https://minedu-swart.vercel.app** |
| **Base de datos** | Supabase (PostgreSQL administrado), proyecto `minedu`, región São Paulo (sa-east-1) |
| **Despliegue** | Vercel, proyecto `minedu`, despliegue automático desde GitHub (rama `main`) |
| **Fecha** | Noviembre 2026 |

---

## 1. Resumen ejecutivo

El aplicativo permite **ubicar cualquier institución educativa del Perú** de dos formas:

- **Por ubicación geográfica:** departamento, luego provincia y luego distrito, o bien por UGEL.
- **Por nombre o código:** búsqueda por nombre del colegio, código modular o código de local.

Para cada colegio muestra su **ficha completa**:

- Identificación: código modular, código de local, nivel y gestión.
- Contacto: **director**, **teléfono fijo** y **celular** (se pueden marcar desde el celular; el celular también abre WhatsApp), correo y página web.
- Ubicación: dirección, **ubigeo**, DRE y UGEL.
- **Turno** de atención.
- **Alumnado 2025**: total, hombres y mujeres, separado en **alumnado diurno y nocturno**. También muestra docentes y secciones.

Los colegios se ubican en un **mapa interactivo**. Desde la **ubicación actual del celular**, la app traza por las calles la **ruta óptima** hasta uno o varios colegios, en auto o a pie, y la abre en Google Maps para navegar paso a paso. Se pueden seleccionar varios colegios, **compartirlos por WhatsApp** y exportarlos a Excel (CSV). La interfaz se adapta a **PC, tablet y celular**.

La información proviene íntegramente de fuentes **oficiales de ESCALE**:

| Indicador | Valor |
|---|---|
| Servicios educativos | 180,943 |
| Activos | 115,428 |
| Con coordenadas | 179,642 |
| Con teléfono | 38,628 |
| Con teléfono fijo (normalizado con código de ciudad) | 31,194 |
| Con celular | 9,560 |
| Con alumnado 2025 | 112,724 |
| Distritos | 1,892 |
| UGEL / DRE | 248 |
| Alumnos 2025 (servicios activos) | 9,326,129 |

---

## 2. Arquitectura

```
 ┌──────────────────────┐   ETL (Node.js)     ┌───────────────────────┐
 │ ESCALE – MINEDU      │ ─────────────────▶  │ CSV normalizados      │
 │ Padron_web.dbf       │  decodifica CP850,  │ iiee.csv  (180,943)   │
 │ Censo 2025 Padron.dbf│  une por cód.mod.,  │ ubigeo.csv (1,892)    │
 └──────────────────────┘  limpia y valida    └──────────┬────────────┘
                                                         │ COPY / API REST
                                                         ▼
 ┌──────────────────────────────────────────────────────────────────────┐
 │ SUPABASE (PostgreSQL 15+)                                            │
 │  • Tabla iiee + ubigeo, índices B-tree y trigram (pg_trgm)           │
 │  • RLS: lectura pública, sin escritura para el rol anon              │
 │  • Funciones RPC: buscar_iiee, resumen_iiee, puntos_iiee             │
 │  • API REST automática (PostgREST)                                   │
 └──────────────────────────────┬───────────────────────────────────────┘
                                │ HTTPS + clave anon (solo lectura)
                                ▼
 ┌──────────────────────────────────────────────────────────────────────┐
 │ VERCEL: Next.js 16 (React 19, TypeScript, Tailwind CSS 4)            │
 │  • Página estática prerenderizada y servida desde CDN                │
 │  • El navegador consulta Supabase directamente (supabase-js)         │
 │  • Mapa Leaflet + OpenStreetMap / Esri satélite                      │
 └──────────────────────────────────────────────────────────────────────┘
```

Es una arquitectura **serverless y de bajo costo**: no hay un servidor propio que mantener. El frontend es estático en la CDN de Vercel, y la lógica de búsqueda vive en funciones SQL dentro de PostgreSQL, lo que da respuestas rápidas.

---

## 3. Tecnologías utilizadas

### 3.1 Lenguajes

| Lenguaje | Uso |
|---|---|
| **TypeScript** | Toda la aplicación web: componentes, tipos de datos y cliente de base de datos |
| **JavaScript (Node.js, ESM)** | Scripts de extracción, transformación y carga (ETL), backend de prueba y capturas automatizadas |
| **SQL (PostgreSQL / PL/pgSQL)** | Esquema, índices, políticas de seguridad (RLS) y funciones de búsqueda |
| **CSS (Tailwind CSS 4)** | Estilos responsivos para PC, tablet y celular |
| **HTML / JSX** | Interfaz con React |

### 3.2 Frontend

| Tecnología | Versión | Función |
|---|---|---|
| **Next.js** (App Router, Turbopack) | 16.4.5 | Framework web, build y prerenderizado estático |
| **React** | 19.3 | Interfaz de usuario por componentes |
| **Tailwind CSS** | 4 | Diseño responsivo (*mobile-first*) |
| **Leaflet** | 1.9.4 | Mapa interactivo |
| **Leaflet.markercluster** | 1.5.3 | Agrupación de miles de puntos en el mapa |
| **OpenStreetMap / Esri World Imagery** | — | Capas de calles y satélite |
| **@supabase/supabase-js** | 2.119 | Cliente para consultar la base de datos |

### 3.3 Backend y datos

| Tecnología | Función |
|---|---|
| **Supabase** | PostgreSQL administrado, API REST automática (PostgREST) y seguridad por filas (RLS) |
| **PostgreSQL + pg_trgm** | Búsqueda por texto parcial con índice trigram (GIN) |
| **Node.js 24** | Ejecución del ETL y la carga de datos |
| **pg + pg-copy-streams** | Carga masiva con `COPY` (180 mil filas en segundos) |
| **PGlite** (Postgres en WebAssembly) | Backend local para probar el esquema y la app sin conexión a la nube |
| **Puppeteer-core + Microsoft Edge** | Pruebas visuales automatizadas en escritorio, tablet y celular (incluida la ruta con GPS simulado) |
| **OSRM sobre OpenStreetMap** (servidor público de FOSSGIS) | Rutas por calles en auto y a pie, y orden óptimo de visita (servicio `trip`) |
| **Geolocation API del navegador** | Ubicación actual del celular o de la PC |

### 3.4 Infraestructura y herramientas

| Herramienta | Función |
|---|---|
| **Vercel** | Hosting, CDN global, HTTPS y despliegue continuo desde GitHub |
| **GitHub** | Repositorio del código fuente |
| **Git** | Control de versiones |
| **ESLint + TypeScript (modo estricto)** | Calidad y verificación estática del código |

---

## 4. Fuentes de datos y proceso ETL

### 4.1 Fuentes oficiales

| Fuente | Archivo | Datos que aporta |
|---|---|---|
| ESCALE: Padrón de servicios educativos (corte 30-10-2026) | `Padron_web.dbf` (287 MB) | Código modular, anexo, código de local, nombre, nivel/modalidad, forma, gestión, dependencia, **director, teléfono, email, web**, dirección, localidad, centro poblado, área, **ubigeo**, departamento, provincia, distrito, DRE, **UGEL**, **latitud/longitud**, **turno**, RUC y promotor (privadas), estado y fechas |
| ESCALE: Censo Educativo 2025 | `Padron.dbf` (144 MB) | **Alumnos (total, hombres, mujeres)**, **docentes**, **secciones**, característica (unidocente o polidocente), VRAEM y zona de frontera |

### 4.2 Transformaciones (`scripts/etl.mjs`)

1. **Lectura DBF propia, sin dependencias**, en streaming para manejar archivos de cientos de MB.
2. **Decodificación de caracteres:** el padrón web usa la página de códigos **CP850 (DOS)**. Se implementó un decodificador para recuperar correctamente las tildes y la ñ ("Mañana", "Pública", "Básica").
3. **Unión** del padrón con el censo por la clave `código modular + anexo`. Coinciden 112,724 de 112,724 registros del censo.
4. **Limpieza de errores en los datos de origen:**
   - fechas inválidas o con día y mes invertidos (por ejemplo `27-05-2008` registrado como mes 27): se corrigen o se dejan vacías;
   - bytes nulos y caracteres de control dentro de los textos: se eliminan.
5. **Normalización de búsqueda:** el nombre se guarda en mayúsculas y sin tildes, para que "jose" encuentre "JOSÉ".
6. **Teléfonos fijo y celular** (`scripts/telefonos.mjs`):
   - se unen los números del padrón 2026, que tiene prioridad por ser el más reciente, con los del Censo 2025, que aportan 826 colegios más;
   - se eliminan los duplicados;
   - cada número se clasifica: es **celular** si tiene 9 dígitos y empieza con 9; si no, es **fijo**;
   - a los fijos sin código de ciudad se les añade el que corresponde al departamento (por ejemplo `427545` en Áncash pasa a `043-427545`).
7. **Clasificación del turno:** *Diurno* (mañana o tarde), *Nocturno* (solo noche) o *Día y noche* (por ejemplo Mañana-Tarde-Noche). Con esto se calcula el **alumnado diurno y nocturno**. También se informa el **alumnado por cada turno** exacto: Mañana, Tarde, Noche, Mañana-Tarde, Mañana-Noche, Tarde-Noche y Mañana-Tarde-Noche.
8. **Modalidad y nivel:** se derivan del código oficial `NIV_MOD` del padrón. Los 180,943 servicios quedan clasificados, sin excepción:

| Modalidad | Nivel / ciclo | Códigos ESCALE | Servicios |
|---|---|---|---|
| Educación Básica Regular (EBR) | Inicial · Primaria · Secundaria | A1–A5 · B0 · F0 | 100,070 · 48,096 · 19,367 |
| Educación Básica Especial (EBE) | Inicial · Primaria · General | E1 · E2 · E0 | 420 · 500 · 328 |
| Educación Básica Alternativa (EBA) | Inicial e Intermedio · Avanzado · General · Primaria y Secundaria de adultos | D1 · D2 · D0 · C0 · G0 | 1,205 · 1,822 · 120 · 955 · 907 |
| Educación Técnico-Productiva (ETP) | CETPRO · Educación ocupacional | L0 · L1–L9 | 2,715 · 2,365 |
| Educación Superior | Tecnológica · Pedagógica · Artística | T0, S0 · K0, P0 · M0 | 1,618 · 406 · 49 |

9. **Dirección exacta:** se compone la vía y el número, la localidad, el centro poblado, el distrito, la provincia y el departamento, eliminando las partes repetidas.

---

## 5. Base de datos (Supabase)

### 5.1 Modelo

- **`iiee`**: 57 columnas, una fila por servicio educativo. La clave primaria es `id = cod_mod-anexo`. Incluye las columnas `modalidad`, `subnivel`, `telefono_fijo` y `celular`. El esquema es idempotente: con `alter table ... add column if not exists` agrega columnas nuevas también a bases ya creadas.
- **`ubigeo`**: catálogo de distritos con departamento y provincia.

### 5.2 Índices

- B-tree por código modular, código de local, ubigeo, departamento, provincia y UGEL.
- **GIN trigram** sobre el nombre normalizado, para búsqueda por texto parcial.
- Índice compuesto para ordenar por ubicación y nombre.

### 5.3 Funciones RPC

| Función | Devuelve |
|---|---|
| `buscar_iiee(filtros, límite, desplazamiento)` | Lista paginada de colegios |
| `resumen_iiee(filtros)` | Totales: colegios, locales, alumnos, alumnado diurno, nocturno y mixto, docentes, secciones y colegios con teléfono. Además, **alumnado y servicios por cada turno** (`por_turno`) y **por modalidad y nivel** (`por_modalidad`) |
| `puntos_iiee(filtros, máximo)` | Coordenadas compactas para el mapa (hasta 15,000 puntos) |

Los filtros disponibles son departamento, provincia, distrito, UGEL, texto o código, **modalidad**, **nivel/ciclo**, nivel detallado, gestión, turno, estado y área.

### 5.4 Seguridad

- **Inicio de sesión obligatorio** con **Supabase Auth**. Las contraseñas se guardan cifradas en Supabase, nunca en el código ni en el repositorio. Hay dos usuarios:

  | Usuario | Rol | Uso |
  |---|---|---|
  | `donet` | **maestro** | Usuario principal del aplicativo |
  | `prueba` | **consulta** | Usuario de consulta |

  Las contraseñas están solo en `.env`, que git ignora, y se cargan con `scripts/crear-usuarios.mjs`. El nombre de usuario se convierte en un correo interno (`usuario@usuarios.donet.local`).
- **El rol va dentro del token firmado** (`app_metadata.rol`). Solo el servidor puede asignarlo con la clave de servicio; el usuario no puede modificarlo.
- **Row Level Security:** la tabla y las funciones responden **solo** a usuarios autenticados cuyo rol sea `maestro` o `consulta`.
  - **Sin sesión**, la clave pública recibe *permiso denegado* (42501).
  - Un usuario que se registrara por su cuenta **no tendría rol** y vería 0 registros. Se probó en producción con un usuario temporal, que luego se eliminó.
  - Nadie puede insertar, modificar ni borrar con la clave pública.
- La clave de servicio y la cadena de conexión **nunca** llegan al navegador ni al repositorio: están en `.env` y `.env.supabase`, que git ignora.
- **Marca y estilo:** diseño institucional sobrio, blanco con acento rojo y títulos en negro.
  - La pantalla de inicio tiene una banda roja, un encabezado blanco con el título en negro y una tarjeta de acceso.
  - La app tiene una cabecera blanca con franja roja.
  - Se cita "MINEDU – datos oficiales ESCALE" como fuente. El emblema es propio (birrete) y **no** reproduce el logotipo oficial del Ministerio, cuyo uso requiere autorización. El pie dice "© 2026 APLICACIONES DONET – Soluciones Empresariales".

---

## 6. Funcionalidades del aplicativo

| Módulo | Detalle |
|---|---|
| **Filtros geográficos** | Departamento → Provincia → Distrito en cascada, y UGEL |
| **Modalidad y nivel** | **EBR** (Inicial, Primaria, Secundaria), **Básica Especial**, **Básica Alternativa**, **Técnico-Productiva** y **Superior** (Tecnológica, Pedagógica, Artística). El nivel/ciclo depende de la modalidad elegida |
| **Filtros adicionales** | Nivel detallado de ESCALE (21), gestión pública o privada, turno (diurno, nocturno, día y noche), área urbana o rural, estado activo o inactivo |
| **Datos en la lista** | Modalidad y nivel, **dirección exacta**, **código modular**, **código de local**, turno, teléfonos, director y alumnos |
| **Alumnado por turno** | En el resumen, tablas de alumnado por **cada turno** y por modalidad y nivel. En la ficha, alumnado del local escolar por turno y por servicio |
| **Búsqueda** | Por nombre (ignora tildes y mayúsculas), código modular o código de local |
| **Resumen** | Indicadores del filtro actual: colegios, locales, alumnos, alumnado diurno, nocturno y mixto, docentes y colegios con teléfono |
| **Ficha del colegio** | Barra de acciones rápidas (Elegir, Ruta, Mapa, WhatsApp, Enlace); identificación; contacto (director, fijo y celular para llamar, WhatsApp al celular, correo, web); ubicación con enlaces a Google Maps y "Cómo llegar", alumnado y docentes 2025, y servicios del mismo local con sus turnos y totales día/noche |
| **Mapa** | Puntos agrupados, color por turno, capas de calles o satélite, pines numerados para los seleccionados y vista de solo seleccionados |
| **Mi ubicación y ruta óptima** | GPS del celular; ruta trazada por las calles hasta uno o varios colegios (hasta 25) en el **orden óptimo de visita**; auto o a pie; tiempo y distancia total y por tramo; botón **Navegar**, que abre Google Maps |
| **Compartir por WhatsApp** | Un colegio, los seleccionados o la ruta, con nombre, código, dirección, director, teléfonos, alumnos, enlace de ubicación y enlace de la ruta |
| **Selección múltiple** | Se conserva en el navegador; se puede exportar, ver en el mapa, enviar por WhatsApp o usar para trazar la ruta |
| **Exportación** | CSV compatible con Excel en español (separador `;`, con BOM UTF-8), de los resultados (hasta 20,000) o de los seleccionados |
| **Enlaces compartibles** | Los filtros y la ficha abierta quedan en la URL |
| **Inicio de sesión** | Pantalla de inicio con usuario y contraseña (mostrar u ocultar); la sesión se mantiene al recargar; en la cabecera aparecen el usuario, el rol (Usuario maestro / Consulta) y el botón **Salir** |
| **Diseño responsivo** | PC: panel lateral y mapa. Tablet y celular: barra inferior Lista / Mapa / Ruta, ficha a pantalla completa y botones grandes |

---

## 7. Calidad y pruebas

- **TypeScript estricto** y **ESLint** (reglas de React 19) sin errores.
- **Build de producción** (`next build`) exitoso y página prerenderizada como estática.
- **Pruebas de datos:** el esquema SQL y las funciones se validaron con las 180,943 filas reales en PGlite. Por ejemplo:
  - búsqueda "san jose" en Lima;
  - búsqueda por código `0415638`;
  - colegios nocturnos de Arequipa;
  - 1,801 puntos en San Juan de Lurigancho.
- **Pruebas visuales automatizadas** en tres tamaños de pantalla, sin errores de consola:
  - escritorio, 1440×900;
  - tablet, 820×1180;
  - celular, 390×844.
- Durante las pruebas se detectaron y **corrigieron en su causa raíz** tres problemas:
  - fechas inválidas en el padrón;
  - bytes nulos en los textos;
  - un error del mapa al abrir la ficha con el mapa oculto en el celular.

---

## 8. Despliegue

| Paso | Herramienta | Estado |
|---|---|---|
| Código fuente | GitHub, `cefalopodos2026/minedu`, rama `main` | Publicado |
| Base de datos | Supabase creado desde el Marketplace de Vercel (integración oficial), región São Paulo. Esquema y datos cargados con `supabase/schema.sql` + `scripts/load.mjs`, por conexión **SSL verificada** (`sslmode=verify-full` con la CA raíz de Supabase) | 180,943 IIEE + 1,892 distritos |
| Aplicación | Vercel, *Root Directory* `web`. La integración inyecta las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **https://minedu-swart.vercel.app** |
| Despliegue continuo | Cada `git push` a `main` publica una nueva versión de producción | Activo |

**Verificación en producción**, automatizada con `scripts/verificar-supabase.mjs`, `scripts/screenshot.mjs` y `scripts/prueba-ruta.mjs`:

- **Lectura con la clave pública:** el resumen, la búsqueda por nombre y por código, los puntos del mapa y la ficha funcionan.
- **Seguridad:** insertar, modificar y borrar con la clave pública quedan **bloqueados** (RLS).
- **Navegador:** escritorio, tablet y celular funcionan sin errores de consola. Con GPS simulado, la ruta óptima a 3 colegios da 22 min en auto y 2 h 44 min a pie, y también funcionan el enlace de navegación de Google Maps, el mensaje de WhatsApp y los teléfonos fijo y celular.

**Actualización de datos:** cuando ESCALE publique un nuevo padrón, basta con descargarlo y ejecutar `npm run etl` y luego `npm run load` en la carpeta `scripts`. La aplicación no necesita cambios.

---

## 9. Limitaciones conocidas

- **Director y teléfono** son los registrados por cada IIEE en el padrón oficial (corte 30-10-2026, el más reciente publicado) y en el Censo 2025. En unas 3 de cada 4 instituciones el teléfono no está registrado, y algunos datos pueden estar desactualizados; para confirmarlos se recomienda consultar a la UGEL.
- El **alumnado** corresponde al **Censo Educativo 2025**, que es la última cifra oficial cerrada. Los servicios creados después o inactivos no tienen matrícula.
- Las **rutas** usan el servidor público y gratuito de OSRM/OpenStreetMap. Calculan tiempos sin tráfico y a veces tardan unos segundos (la app espera hasta 30 s). Para un uso intensivo conviene un servidor de rutas propio.
- La separación **diurno/nocturno** se basa en el turno declarado de cada servicio. Para los servicios con turno mixto (día y noche), el censo no separa cuántos alumnos asisten en cada turno, por eso se reportan aparte como "Día y noche".

---

## 10. Estructura del repositorio

```
├── CLAUDE.md                 Reglas de trabajo del proyecto
├── Informe.md                Este informe
├── README.md                 Guía de instalación, carga y despliegue
├── tasks/todo.md             Plan de tareas y revisión
├── supabase/schema.sql       Esquema, índices, RLS y funciones RPC
├── scripts/                  ETL y utilidades (Node.js)
│   ├── dbf.mjs, cp850.mjs    Lector DBF y decodificador CP850
│   ├── etl.mjs               DBF → CSV
│   ├── load.mjs              Carga a Supabase
│   ├── dev-mock.mjs          Backend local de pruebas (PGlite)
│   └── screenshot.mjs        Pruebas visuales automatizadas
└── web/                      Aplicación Next.js (se despliega en Vercel)
    └── src/
        ├── app/              Layout, página y estilos globales
        ├── components/       App, Ficha, MapView, ClientApp
        ├── lib/              Cliente Supabase, tipos, formato y geografía
        └── data/             Catálogos de ubigeo, UGEL y niveles
```
