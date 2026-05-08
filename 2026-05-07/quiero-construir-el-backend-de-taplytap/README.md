# TaplyTap Backend MVP

Backend funcional para placas NFC/QR de TaplyTap con Next.js, Supabase, TypeScript y Tailwind CSS.

## Qué incluye

- Ruta pública `GET /user/[code]` para buscar la placa, registrar scan y redirigir.
- Ruta pública `GET /activate/[code]` para activar placas inactivas.
- Panel `GET /admin` protegido por Supabase Auth y lista de emails autorizados.
- Creación de códigos QR únicos en lote desde admin o CLI.
- Tracking básico de scans en `scan_events`.
- Validación de código, URL HTTPS, email, origen de formularios y variables de entorno.

## Estructura

```txt
app/
  user/[code]/page.tsx              # escaneo y redirección
  activate/[code]/page.tsx          # formulario de activación
  admin/page.tsx                    # panel admin
  api/activate/[code]/route.ts      # activación segura
  api/admin/qr-codes/batch/route.ts # creación en lote
  api/qr-codes/[code]/scan/route.ts # tracking manual opcional
lib/
  supabase/                         # clientes Supabase
  auth.ts                           # protección admin
  qr.ts                             # generación de códigos
  security.ts                       # validaciones
supabase/schema.sql                 # esquema de base de datos
scripts/generate-qr-codes.ts        # CLI para crear códigos
```

## Supabase

1. Crea un proyecto en Supabase.
2. Abre SQL Editor.
3. Ejecuta `supabase/schema.sql`.
4. En Authentication, habilita magic links por email.
5. Agrega el dominio local y el dominio de Vercel en Auth URL Configuration.

El MVP usa `SUPABASE_SERVICE_ROLE_KEY` solo en servidor para operaciones públicas controladas, porque las rutas deben consultar QR y registrar scans sin exponer permisos en el cliente.

## Variables de entorno

Copia `.env.example` a `.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPPORT_EMAIL=soporte@taplytap.io
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_EMAILS=admin@taplytap.io
```

`ADMIN_EMAILS` acepta varios correos separados por coma.

## Correr localmente

```bash
npm install
npm run dev
```

Luego abre `http://localhost:3000`.

## Crear códigos QR

Desde el panel admin puedes crear un lote.

También puedes usar CLI:

```bash
npm run generate:qr -- 50 qr-codes.json
```

Eso crea 50 códigos inactivos y opcionalmente escribe sus URLs en JSON.

## Deploy en Vercel

1. Sube el repositorio a GitHub.
2. Importa el proyecto en Vercel.
3. Configura las mismas variables de entorno.
4. Cambia `NEXT_PUBLIC_SITE_URL` al dominio final, por ejemplo `https://taplytap.io`.
5. En Supabase Auth, agrega `https://taplytap.io/auth/callback` como redirect URL permitido.
6. Deploy.

## Flujo MVP

1. Admin crea códigos inactivos.
2. Cada placa se imprime con `https://taplytap.io/user/[code]`.
3. Al escanear:
   - `active`: registra scan y redirige a `destination_url`.
   - `inactive`: registra scan y manda a `/activate/[code]`.
   - `blocked`: registra scan y muestra soporte.
   - no existe: muestra error.

## Seguridad

- No hay datos hardcodeados.
- Las credenciales viven en variables de entorno.
- La service role key nunca se usa en componentes cliente.
- Los códigos deben cumplir `^[a-z0-9_-]{4,64}$`.
- Las URLs destino deben ser HTTPS en producción.
- El panel admin requiere login y correo en `ADMIN_EMAILS`.
- Las tablas tienen RLS habilitado y no exponen lecturas/escrituras directas a cliente; el MVP opera datos desde rutas servidor controladas.
