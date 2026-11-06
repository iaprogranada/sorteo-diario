# 🎟️ Sorteo Diario

Plataforma de sorteos **gratuitos** diarios patrocinados por marcas y negocios. Un proyecto de **IA Pro**.

- Los usuarios participan gratis: desbloquean cada sorteo con una acción del patrocinador (ver un vídeo, visitar su web, seguirle, dejar sus datos, ver un cupón) y consiguen papeletas.
- Los patrocinadores ponen el premio (por ahora < 300 €) y a cambio reciben visualizaciones, visitas y leads.
- Ingresos extra con banners en los laterales y el faldón.
- Sorteo **verificable**: huella SHA-256 publicada al inicio + aleatoriedad pública de [drand](https://drand.love) al cierre.

## Reglas configurables (Admin → Ajustes)

| Concepto | Valor por defecto |
|---|---|
| Papeletas máx. por persona | Regular 10 · Especial 30 · Premium ilimitadas |
| Desbloquear | +3 papeletas |
| Acción extra (máx. 5 por sorteo) | +1 papeleta |
| Duración | Regular 24/48/72 h · Especial hasta 7 días |
| Comodines | Bienvenida +10 · Perfil +5 · Entrada diaria +2 · Racha 7 días +5 · Amigo +5 (5/día) · Vídeo anunciante +1 (5/día) · Compartir +1 (3/día) |
| Tope diario de comodines | 25 (bienvenida y perfil no cuentan) |
| Plazo para aceptar el premio | 7 días, después pasa al suplente |

## Cómo se elige al ganador

1. Al crear el sorteo se genera una clave secreta y se publica `sha256(clave)`.
2. Cada papeleta recibe un número correlativo (#1, #2, …) dentro de su sorteo.
3. Al cerrar se toma la primera ronda de drand emitida después de la hora de cierre.
4. `papeleta = HMAC-SHA256(clave, "aleatoriedad:contador") mod total + 1`. El contador 0 da el ganador; los siguientes, 2 suplentes (personas distintas).
5. La página `/verificar/[id]` permite recalcularlo en el navegador.

## Tecnología

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · PostgreSQL · Prisma · Vitest · Playwright.

## Puesta en marcha (local)

```bash
cp .env.example .env          # y ajusta DATABASE_URL / SESSION_SECRET
npm install
npm run db:migrate
npm run db:seed               # datos ficticios (BORRA la base de datos)
npm run dev
```

Cuentas de prueba (después del seed):

| Rol | Email | Contraseña |
|---|---|---|
| Admin | admin@sorteodiario.test | admin1234 |
| Patrocinadores | patrocinador1@test.com … patrocinador10@test.com | test1234 |
| Usuarios | usuario1@test.com … usuario50@test.com | test1234 |
| Usuario limpio | demo@test.com | test1234 |

### Modo pruebas

- `ENABLE_TEST_CLOCK=true`: en **Admin** se puede adelantar el reloj (+1 h, +1 día, +7 días…) para comprobar cierres y premios sin esperar.
- `DRAND_MODE=mock`: aleatoriedad simulada. En producción `DRAND_MODE=live`.
- `SMS_MODE` distinto de `live`: el código SMS se muestra en pantalla (siempre `123456`).
- Admin → Sorteos → «Cerrar y sortear ya» para forzar un sorteo.

## Pruebas

```bash
npm test            # unitarias (usa la BD sorteo_test)
npm run test:e2e    # recorridos completos en navegador (recarga los datos ficticios)
```

## Producción (pendiente)

- Base de datos: Supabase o Neon. Hosting: Vercel.
- Cron: `GET /api/cron/tick` con cabecera `Authorization: Bearer $CRON_SECRET` cada 5 min (`vercel.json`; en el plan gratuito de Vercel usar un cron externo).
- SMS real (Twilio) en `registerAction`. Email real (Resend) en `src/lib/notify.ts`.
- Revisar con un abogado las bases legales, la privacidad y la fiscalidad (`/legal/*` son borradores).
