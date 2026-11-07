# Informe técnico: "Colegios del Perú", directorio y mapa de instituciones educativas

| | |
|---|---|
| **Proyecto** | Aplicativo web para ubicar y consultar colegios del Perú |
| **Fuente de datos** | ESCALE, Unidad de Estadística del Ministerio de Educación (MINEDU) |
| **Repositorio** | https://github.com/cefalopodos2026/minedu |
| **Base de datos** | Supabase (PostgreSQL administrado) |
| **Despliegue** | Vercel |
| **Fecha** | Noviembre 2026 |

---

## 1. Resumen ejecutivo

El aplicativo permite **ubicar cualquier institución educativa del Perú** de dos formas:

- **Por ubicación geográfica:** departamento, luego provincia y luego distrito, o bien por UGEL.
- **Por nombre o código:** búsqueda por nombre del colegio, código modular o código de local.

Para cada colegio muestra su **ficha completa**:

- Identificación: código modular, código de local, nivel y gestión.
- Contacto: **director**, **teléfono** (se puede marcar desde el celular), correo y página web.
- Ubicación: dirección, **ubigeo**, DRE y UGEL.
- **Turno** de atención.
- **Alumnado 2025**: total, hombres y mujeres, separado en **alumnado diurno y nocturno**. También muestra docentes y secciones.

Los colegios se ubican en un **mapa interactivo**. Se pueden seleccionar varios para verlos juntos y exportar la información a Excel (CSV). La interfaz se adapta a **PC, tablet y celular**.

La información proviene íntegramente de fuentes **oficiales de ESCALE**:

| Indicador | Valor |
|---|---|
| Servicios educativos | 180,943 |
| Activos | 115,428 |
| Con coordenadas | 179,642 |
| Con teléfono | 37,802 |
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
| **Puppeteer-core + Microsoft Edge** | Pruebas visuales automatizadas en escritorio, tablet y celular |

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
6. **Clasificación del turno:** *Diurno* (mañana o tarde), *Nocturno* (solo noche) o *Día y noche* (por ejemplo Mañana-Tarde-Noche). Con esto se calcula el **alumnado diurno y nocturno**.

---

## 5. Base de datos (Supabase)

### 5.1 Modelo

- **`iiee`**: 53 columnas, una fila por servicio educativo. La clave primaria es `id = cod_mod-anexo`.
- **`ubigeo`**: catálogo de distritos con departamento y provincia.

### 5.2 Índices

- B-tree por código modular, código de local, ubigeo, departamento, provincia y UGEL.
- **GIN trigram** sobre el nombre normalizado, para búsqueda por texto parcial.
- Índice compuesto para ordenar por ubicación y nombre.

### 5.3 Funciones RPC

| Función | Devuelve |
|---|---|
| `buscar_iiee(filtros, límite, desplazamiento)` | Lista paginada de colegios |
| `resumen_iiee(filtros)` | Totales: colegios, locales, alumnos, alumnado diurno, nocturno y mixto, docentes, secciones y colegios con teléfono |
| `puntos_iiee(filtros, máximo)` | Coordenadas compactas para el mapa (hasta 15,000 puntos) |

Los filtros disponibles son departamento, provincia, distrito, UGEL, texto o código, nivel, gestión, turno, estado y área.

### 5.4 Seguridad

- **Row Level Security** activado. El rol público (`anon`) solo tiene permiso de **lectura** y no puede insertar, modificar ni borrar.
- La clave de servicio y la cadena de conexión **nunca** llegan al navegador ni al repositorio: están en `.env`, que git ignora.

---

## 6. Funcionalidades del aplicativo

| Módulo | Detalle |
|---|---|
| **Filtros geográficos** | Departamento → Provincia → Distrito en cascada, y UGEL |
| **Filtros adicionales** | Nivel/modalidad (21), gestión pública o privada, turno (diurno, nocturno, día y noche), área urbana o rural, estado activo o inactivo |
| **Búsqueda** | Por nombre (ignora tildes y mayúsculas), código modular o código de local |
| **Resumen** | Indicadores del filtro actual: colegios, locales, alumnos, alumnado diurno, nocturno y mixto, docentes y colegios con teléfono |
| **Ficha del colegio** | Identificación, contacto (director, teléfono marcable, correo, web), ubicación con enlaces a Google Maps y "Cómo llegar", alumnado y docentes 2025, y servicios del mismo local con sus turnos y totales día/noche |
| **Mapa** | Puntos agrupados, color por turno, capas de calles o satélite, pines numerados para los seleccionados y vista de solo seleccionados |
| **Selección múltiple** | Se conserva en el navegador; se puede exportar y ver en el mapa |
| **Exportación** | CSV compatible con Excel en español (separador `;`, con BOM UTF-8), de los resultados (hasta 20,000) o de los seleccionados |
| **Enlaces compartibles** | Los filtros y la ficha abierta quedan en la URL |
| **Diseño responsivo** | PC: panel lateral y mapa. Tablet y celular: pestañas Lista/Mapa y ficha a pantalla completa |

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

| Paso | Herramienta |
|---|---|
| Código fuente | GitHub, `cefalopodos2026/minedu`, rama `main` |
| Base de datos | Supabase: `supabase/schema.sql` + `scripts/load.mjs` |
| Aplicación | Vercel, *Root Directory* `web`, variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

**Actualización de datos:** cuando ESCALE publique un nuevo padrón, basta con descargarlo y ejecutar `npm run etl` y luego `npm run load` en la carpeta `scripts`. La aplicación no necesita cambios.

---

## 9. Limitaciones conocidas

- **Director y teléfono** son los registrados por cada IIEE en el padrón oficial. En unas 3 de cada 4 instituciones el teléfono no está registrado, y algunos datos pueden estar desactualizados; para confirmarlos se recomienda consultar a la UGEL.
- El **alumnado** corresponde al **Censo Educativo 2025**, que es la última cifra oficial cerrada. Los servicios creados después o inactivos no tienen matrícula.
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
