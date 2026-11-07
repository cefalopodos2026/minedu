# Colegios del Perú: directorio y mapa (fuente ESCALE – MINEDU)

Aplicativo web para ubicar instituciones educativas del Perú por **departamento → provincia → distrito**, UGEL, nivel, gestión, turno o **nombre / código modular**. Muestra la ficha completa de cada colegio y su ubicación en el mapa. Funciona en PC, tablet y celular.

- **Frontend:** Next.js 16 + Tailwind + Leaflet (OpenStreetMap / satélite Esri). Se despliega en **Vercel**.
- **Base de datos:** **Supabase** (Postgres), con lectura pública protegida por RLS y funciones RPC de búsqueda.

## Datos oficiales utilizados

| Fuente | Archivo | Aporta |
|---|---|---|
| ESCALE – Padrón de servicios educativos (corte 30-10-2026) | `Padron_web_20261030.zip` → `Padron_web.dbf` | código modular, anexo, código de local, nombre, nivel/modalidad, gestión, **director, teléfono, email, web**, dirección, centro poblado, área, **ubigeo**, dpto/prov/dist, DRE, **UGEL**, **coordenadas**, **turno** (mañana/tarde/noche), estado, RUC/promotor (privadas) |
| ESCALE – Censo Educativo 2025 | `00_Padron.zip` → `Padron.dbf` | **alumnos (total, hombres, mujeres)**, docentes, secciones, característica (unidocente/polidocente), VRAEM, frontera |

- Padrón: https://escale.minedu.gob.pe/uee/-/document_library_display/GMv7/view/958881
- Censo 2025: https://escale.minedu.gob.pe/documents/inicio/Bases%20de%20datos/A.%20Censo%20Educativo/2025/

Resultado: **180,943 servicios educativos** (115,428 activos), 179,642 georreferenciados, 37,802 con teléfono, 112,724 con alumnado 2025, 1,892 distritos y 248 UGEL/DRE.

**Alumnado día/noche.** Cada servicio educativo (código modular + anexo) tiene un turno. La app lo agrupa en *Diurno* (mañana o tarde), *Nocturno* (solo noche) y *Día y noche* (por ejemplo Mañana-Tarde-Noche), y suma los alumnos de cada grupo, tanto en el resumen del filtro como por **local escolar** (todos los servicios que funcionan en el mismo local).

## Estructura

```
data/raw/        archivos oficiales descargados (no se suben a git)
data/out/        iiee.csv y ubigeo.csv generados por el ETL
scripts/         etl.mjs (DBF → CSV), load.mjs (carga a Supabase), dev-mock.mjs (backend local de prueba)
supabase/        schema.sql (tabla, índices, RLS y funciones RPC)
web/             aplicación Next.js (raíz del proyecto en Vercel)
```

## 1. Regenerar los datos (cuando ESCALE publique un nuevo corte)

```bash
# descargar el nuevo Padron_web_AAAAMMDD.zip y descomprimir en data/raw/padron/
cd scripts
npm install
npm run etl          # genera data/out/iiee.csv y data/out/ubigeo.csv
```

## 2. Crear y cargar la base en Supabase

1. Cree un proyecto en https://supabase.com (el plan gratuito alcanza: unos 200 MB).
2. Copie la **cadena de conexión** en *Project Settings → Database → Connection string → URI*. Use la de *Session pooler*, que funciona sobre IPv4.
3. Ejecute la carga. Crea el esquema y copia los datos en aproximadamente 1 minuto:

```bash
cd scripts
# PowerShell:  $env:DATABASE_URL="postgresql://postgres.xxxx:CLAVE@aws-0-xx.pooler.supabase.com:5432/postgres"
DATABASE_URL="postgresql://..." npm run load
```

> **SSL verificado:** Supabase firma sus certificados con su propia autoridad raíz, incluida en `supabase/prod-ca-2021.crt`. Para que la conexión quede cifrada **y** verificada, agregue a la URL `?sslmode=verify-full&sslrootcert=../supabase/prod-ca-2021.crt`.
>
> **Verificación:** `node verificar-supabase.mjs <archivo .env>` comprueba con la clave pública que las búsquedas funcionen y que **no** se pueda escribir.

*Alternativa sin cadena de conexión:* pegue `supabase/schema.sql` en el **SQL Editor** de Supabase y luego ejecute
`SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... npm run load`.

## 3. Ejecutar en local

```bash
cd web
cp .env.example .env.local     # complete URL y anon key de Supabase
npm install
npm run dev                    # http://localhost:3000
```

Para probar sin Supabase: `cd scripts && node dev-mock.mjs` levanta un backend local con PGlite en el puerto 54321. Luego use `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321` en `.env.local`.

## 4. Desplegar en Vercel

1. Suba el repositorio a GitHub e impórtelo en https://vercel.com/new.
2. **Root Directory:** `web`.
3. Variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://xxxx.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = clave *anon / publishable* (Project Settings → API)
4. Pulse **Deploy**.

También puede desplegar desde la terminal: `cd web && npx vercel --prod`.

## Funcionalidades

- Filtros en cascada Departamento → Provincia → Distrito, más UGEL, gestión, turno (diurno/nocturno/día y noche), área y estado.
- **Modalidad y nivel**: Educación Básica Regular (Inicial, Primaria, Secundaria), Básica Especial, Básica Alternativa, Técnico-Productiva y Superior (Tecnológica, Pedagógica, Artística), según el código oficial `NIV_MOD`.
- Cada colegio muestra su **código modular**, **código de local** y **dirección exacta**.
- **Alumnado por cada turno** (Mañana, Tarde, Noche y combinaciones), en el resumen del filtro y por local escolar en la ficha.
- Búsqueda por nombre (sin importar tildes ni mayúsculas), por código modular o por código de local.
- Resumen del filtro: número de colegios y locales, alumnos 2025, alumnado diurno, nocturno y mixto, docentes y colegios con teléfono.
- **Ruta óptima desde mi ubicación** (GPS del celular) hasta uno o varios colegios, en auto o a pie, trazada por las calles. Muestra tiempo y distancia, y el botón *Navegar* la abre en Google Maps.
- **Compartir por WhatsApp** un colegio, los seleccionados o la ruta.
- Ficha completa del colegio: director, **teléfono fijo y celular** (llamar o abrir WhatsApp), correo, web, dirección, ubigeo, UGEL, coordenadas, turno, alumnos H/M, docentes, secciones y los demás servicios del mismo local con su turno y alumnado. Incluye enlaces a Google Maps y "Cómo llegar".
- Mapa con agrupación de puntos, colores por turno y capas de calles o satélite. Los colegios **seleccionados** aparecen como pines numerados y se pueden ver solos en el mapa.
- Selección múltiple que se conserva en el navegador. Exporta a CSV (compatible con Excel) los resultados o los seleccionados.
- Enlaces compartibles: los filtros y la ficha abierta quedan en la URL.

> El director y el teléfono son los registrados por las IIEE en el padrón oficial de ESCALE. Algunos colegios no los tienen o están desactualizados; en ese caso conviene consultar a la UGEL.
