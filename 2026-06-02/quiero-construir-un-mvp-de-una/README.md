# Trok MVP

MVP mobile-first para validar intercambio de objetos entre personas de la misma ciudad.

## Que incluye esta primera iteracion

- Landing simple.
- Login mock.
- Onboarding con nombre, ciudad, foto y bio.
- Feed tipo Tinder con objetos mock de la misma ciudad.
- Botones para rechazar o marcar interes.
- Match mock cuando existe interes cruzado.
- Chat mock con advertencia de seguridad.
- Publicar objeto con formulario local.
- Perfil, mis objetos y reportes.
- Estructura preparada para planes `free` y `premium`.
- Esquema SQL inicial para Supabase.

## Stack

- Next.js App Router
- React
- Tailwind CSS
- Supabase preparado para auth, database, storage y realtime
- Vercel como deploy objetivo

## Instalacion

```bash
npm install
npm run dev
```

Luego abre:

```txt
http://localhost:3000
```

En esta carpeta generada de Codex, `npm run dev` usa una vista local estable basada en build + start. Si mueves el proyecto a un repo limpio, puedes usar hot reload con:

```bash
npm run dev:hot
```

## Variables de entorno

Copia `.env.example` a `.env.local` cuando conectes Supabase:

```bash
cp .env.example .env.local
```

Variables esperadas:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Supabase

El archivo `supabase/schema.sql` contiene las tablas sugeridas:

- `users`
- `items`
- `item_images`
- `swipes`
- `matches`
- `messages`
- `reports`
- `blocked_users`

Siguiente paso recomendado: crear el proyecto de Supabase, ejecutar el SQL, activar Auth, crear un bucket de Storage para fotos y reemplazar los datos mock por consultas reales.

## Reglas MVP de seguridad

Trok prohibe objetos robados, falsificados o ilegales. Tambien bloquea el intercambio de armas, drogas, documentos oficiales, animales, medicamentos y contenido adulto.

## Planes preparados

`free`:

- Ciudad actual.
- 20 swipes diarios.
- 3 objetos activos.

`premium`:

- Swipes ilimitados.
- Ver otras ciudades.
- Boost de objetos.

Los pagos no estan activos en esta iteracion.
