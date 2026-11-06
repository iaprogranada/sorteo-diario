/**
 * Datos ficticios de prueba para Sorteo Diario.
 * Ejecutar: npm run db:seed   (borra TODO y vuelve a crear)
 */
import { PrismaClient, type ActionType, type RaffleType, type DeliveryType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { generateSeed } from "../src/lib/draw";
import { DEFAULT_SETTINGS } from "../src/lib/settings";
import { madridDate, dayKey, nextPublishTime } from "../src/lib/time";

const prisma = new PrismaClient();
const code = () => randomBytes(4).toString("hex").toUpperCase();
const HOUR = 3_600_000;

type ActionSeed = { type: ActionType; label: string; url?: string; seconds?: number; couponCode?: string; formQuestion?: string };

interface RaffleSeed {
  sponsor: number;
  title: string;
  description: string;
  value: number;
  emoji: string;
  category: string;
  type?: RaffleType;
  delivery?: DeliveryType;
  city?: string;
  unlock: ActionSeed;
  extras?: ActionSeed[];
  maxTotal?: number;
}

const YT = "https://www.youtube.com/watch?v=aqz-KE-bpKQ"; // vídeo de prueba
const IAPRO = "https://iapro.top";

const SPONSORS = [
  { company: "Spa Alhambra Relax", emoji: "💆", web: "https://example.com/spa" },
  { company: "Pádel Pro Shop", emoji: "🎾", web: "https://example.com/padel" },
  { company: "Trattoria Bella Napoli", emoji: "🍝", web: "https://example.com/trattoria" },
  { company: "GamerZone Store", emoji: "🎮", web: "https://example.com/gamer" },
  { company: "Peluquería Estilo & Co", emoji: "💇", web: "https://example.com/pelu" },
  { company: "Clínica Estética Luz", emoji: "✨", web: "https://example.com/estetica" },
  { company: "Moda Urbana", emoji: "🧥", web: "https://example.com/moda" },
  { company: "Libros de Chusi", emoji: "📚", web: IAPRO },
  { company: "IA Pro", emoji: "🤖", web: IAPRO },
  { company: "Hotel Sierra Nevada Resort", emoji: "🏨", web: "https://example.com/hotel" },
];

const LIVE: RaffleSeed[] = [
  { sponsor: 0, title: "Masaje relajante de 60 minutos", description: "Una hora de masaje con aceites esenciales en nuestro spa. Cupón válido 6 meses.", value: 55, emoji: "💆", category: "Bienestar y masajes", delivery: "DIGITAL", unlock: { type: "VIDEO", label: "Mira nuestro spa en 20 segundos", url: YT, seconds: 20 }, extras: [{ type: "VISIT", label: "Visita la web del spa", url: "https://example.com/spa", seconds: 5 }, { type: "FOLLOW", label: "Síguenos en Instagram", url: "https://instagram.com" }] },
  { sponsor: 1, title: "Pala de pádel profesional de carbono", description: "Pala de carbono 3K, perfecta para nivel intermedio-avanzado. Te la enviamos a casa.", value: 149, emoji: "🎾", category: "Deporte", delivery: "SHIPPING", unlock: { type: "VISIT", label: "Visita nuestra tienda online", url: "https://example.com/padel", seconds: 5 }, extras: [{ type: "COUPON", label: "Consigue un 10 % de descuento", couponCode: "SORTEO10" }, { type: "VIDEO", label: "Mira la review de la pala", url: YT, seconds: 15 }] },
  { sponsor: 2, title: "Cena para dos en Trattoria Bella Napoli", description: "Menú degustación para dos personas con vino. Para disfrutar en Madrid.", value: 90, emoji: "🍝", category: "Restaurantes", delivery: "IN_PERSON", city: "Madrid", unlock: { type: "VIDEO", label: "Descubre nuestra cocina", url: YT, seconds: 20 }, extras: [{ type: "FORM", label: "Únete a nuestro club de clientes", formQuestion: "¿Cuál es tu plato italiano favorito?" }] },
  { sponsor: 3, title: "Auriculares gaming inalámbricos 7.1", description: "Sonido envolvente, micrófono desmontable y 30 h de batería. Envío gratis.", value: 89, emoji: "🎧", category: "Tecnología y gaming", delivery: "SHIPPING", unlock: { type: "VISIT", label: "Visita GamerZone", url: "https://example.com/gamer", seconds: 5 }, extras: [{ type: "FOLLOW", label: "Síguenos en TikTok", url: "https://tiktok.com" }, { type: "VIDEO", label: "Mira el unboxing", url: YT, seconds: 15 }] },
  { sponsor: 3, title: "Pack teclado + ratón gaming RGB", description: "Teclado mecánico switches rojos + ratón 16.000 DPI.", value: 120, emoji: "⌨️", category: "Tecnología y gaming", delivery: "SHIPPING", unlock: { type: "VIDEO", label: "Mira el pack en acción", url: YT, seconds: 20 } },
  { sponsor: 4, title: "Corte + color + tratamiento", description: "Servicio completo de peluquería. Cupón digital canjeable en cualquiera de nuestros salones.", value: 75, emoji: "💇", category: "Belleza y estética", delivery: "DIGITAL", unlock: { type: "FOLLOW", label: "Síguenos en Instagram", url: "https://instagram.com" }, extras: [{ type: "VISIT", label: "Reserva online (solo mirar)", url: "https://example.com/pelu", seconds: 5 }] },
  { sponsor: 5, title: "Limpieza facial profunda + hidratación", description: "Tratamiento facial de 75 minutos con diagnóstico de piel.", value: 70, emoji: "✨", category: "Belleza y estética", delivery: "DIGITAL", unlock: { type: "FORM", label: "Déjanos tus datos y te enviamos tu diagnóstico de piel gratis", formQuestion: "¿Qué te preocupa de tu piel?" } },
  { sponsor: 6, title: "Chaqueta bomber edición limitada", description: "Elige tu talla. Te la enviamos a cualquier punto de España.", value: 79, emoji: "🧥", category: "Moda", delivery: "SHIPPING", unlock: { type: "VISIT", label: "Mira la nueva colección", url: "https://example.com/moda", seconds: 5 }, extras: [{ type: "COUPON", label: "15 % de descuento en tu primera compra", couponCode: "BOMBER15" }] },
  { sponsor: 7, title: "Ebook firmado: Apego ansioso y evitativo", description: "El libro de Chusi sobre estilos de apego, en PDF dedicado.", value: 19, emoji: "📖", category: "Libros y formación", delivery: "DIGITAL", unlock: { type: "VIDEO", label: "Mira el vídeo del canal", url: YT, seconds: 20 }, extras: [{ type: "VISIT", label: "Visita la web del libro", url: IAPRO, seconds: 5 }] },
  { sponsor: 8, title: "Chatbot con IA para tu negocio (1 mes)", description: "IA Pro te monta un chatbot que atiende a tus clientes 24/7. Primer mes gratis.", value: 199, emoji: "🤖", category: "Otros", delivery: "DIGITAL", unlock: { type: "VISIT", label: "Descubre IA Pro", url: IAPRO, seconds: 5 }, extras: [{ type: "FORM", label: "Pide una auditoría gratis", formQuestion: "¿Qué tipo de negocio tienes?" }, { type: "VIDEO", label: "Mira cómo funciona", url: YT, seconds: 15 }] },
];

const YESTERDAY: RaffleSeed[] = [
  { sponsor: 0, title: "Circuito termal para dos", description: "Acceso de 90 minutos al circuito de aguas para dos personas.", value: 60, emoji: "♨️", category: "Bienestar y masajes", unlock: { type: "VIDEO", label: "Mira el circuito", url: YT, seconds: 20 } },
  { sponsor: 1, title: "Paletero + 3 botes de bolas", description: "Paletero térmico y bolas de competición.", value: 65, emoji: "🎒", category: "Deporte", delivery: "SHIPPING", unlock: { type: "VISIT", label: "Visita la tienda", url: "https://example.com/padel", seconds: 5 } },
];

const SPECIAL: RaffleSeed = {
  sponsor: 9,
  title: "Fin de semana en hotel 4★ con todo incluido",
  description: "2 noches para dos personas con pensión completa y spa. ¡Sorteo especial: hasta 30 papeletas por persona!",
  value: 290,
  emoji: "🏨",
  category: "Viajes y hoteles",
  type: "SPECIAL",
  delivery: "IN_PERSON",
  city: "Sierra Nevada (Granada)",
  maxTotal: 5000,
  unlock: { type: "VIDEO", label: "Mira el hotel", url: YT, seconds: 20 },
  extras: [
    { type: "VISIT", label: "Visita la web del hotel", url: "https://example.com/hotel", seconds: 5 },
    { type: "FOLLOW", label: "Síguenos en Instagram", url: "https://instagram.com" },
    { type: "FORM", label: "Recibe nuestras ofertas", formQuestion: "¿Cuándo sueles viajar?" },
    { type: "COUPON", label: "Código de reserva directa -10 %", couponCode: "SIERRA10" },
    { type: "VIDEO", label: "Mira las habitaciones", url: YT, seconds: 15 },
  ],
};

const TOMORROW: RaffleSeed[] = [
  { sponsor: 2, title: "Pizza party para 4", description: "4 pizzas artesanas + bebidas.", value: 60, emoji: "🍕", category: "Restaurantes", delivery: "IN_PERSON", city: "Madrid", unlock: { type: "VIDEO", label: "Mira cómo hacemos la masa", url: YT, seconds: 20 } },
  { sponsor: 6, title: "Zapatillas urbanas", description: "Elige modelo y talla.", value: 95, emoji: "👟", category: "Moda", delivery: "SHIPPING", unlock: { type: "VISIT", label: "Mira las zapatillas", url: "https://example.com/moda", seconds: 5 } },
];

const PENDING: RaffleSeed[] = [
  { sponsor: 5, title: "Sesión de depilación láser", description: "Una zona a elegir.", value: 80, emoji: "💫", category: "Belleza y estética", unlock: { type: "VISIT", label: "Visita la clínica", url: "https://example.com/estetica", seconds: 5 } },
  { sponsor: 4, title: "Bono 3 peinados para eventos", description: "Para bodas, comuniones o fiestas.", value: 90, emoji: "👰", category: "Belleza y estética", unlock: { type: "FOLLOW", label: "Síguenos", url: "https://instagram.com" } },
];

const PAST: RaffleSeed[] = [
  { sponsor: 3, title: "Ratón gaming ultraligero", description: "59 g, sensor óptico 26K.", value: 69, emoji: "🖱️", category: "Tecnología y gaming", delivery: "SHIPPING", unlock: { type: "VISIT", label: "Visita GamerZone", url: "https://example.com/gamer", seconds: 5 } },
  { sponsor: 0, title: "Masaje de piedras calientes", description: "75 minutos.", value: 65, emoji: "🪨", category: "Bienestar y masajes", unlock: { type: "VIDEO", label: "Mira el spa", url: YT, seconds: 20 } },
  { sponsor: 2, title: "Brunch para dos", description: "Brunch completo de domingo.", value: 45, emoji: "🥞", category: "Restaurantes", delivery: "IN_PERSON", city: "Madrid", unlock: { type: "VIDEO", label: "Mira nuestro brunch", url: YT, seconds: 20 } },
  { sponsor: 7, title: "Pack 3 ebooks de crecimiento personal", description: "En PDF.", value: 39, emoji: "📚", category: "Libros y formación", unlock: { type: "VISIT", label: "Visita la web", url: IAPRO, seconds: 5 } },
  { sponsor: 6, title: "Sudadera oversize", description: "Edición otoño.", value: 55, emoji: "👕", category: "Moda", delivery: "SHIPPING", unlock: { type: "VISIT", label: "Mira la colección", url: "https://example.com/moda", seconds: 5 } },
];

const FIRST = ["Lucía", "Hugo", "Martina", "Mateo", "Sofía", "Leo", "Julia", "Daniel", "Paula", "Pablo", "Valeria", "Álvaro", "Emma", "Manuel", "Carla", "Javier", "Sara", "Adrián", "Noa", "Diego", "Alba", "Mario", "Lola", "Marcos", "Vega"];
const LAST = ["García", "Martínez", "López", "Sánchez", "Pérez", "Gómez", "Ruiz", "Díaz", "Moreno", "Muñoz", "Romero", "Navarro"];
const PROV = ["Madrid", "Granada", "Sevilla", "Valencia", "Barcelona", "Málaga", "Bizkaia", "Zaragoza", "Murcia", "Asturias"];

function rand<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function createRaffle(s: RaffleSeed, sponsorIds: string[], startAt: Date, endAt: Date, status: "APPROVED" | "PENDING" = "APPROVED") {
  const { secretSeed, seedHash } = generateSeed();
  const actions = [{ ...s.unlock, isUnlock: true, order: 0 }, ...(s.extras ?? []).map((a, i) => ({ ...a, isUnlock: false, order: i + 1 }))];
  return prisma.raffle.create({
    data: {
      sponsorId: sponsorIds[s.sponsor],
      title: s.title,
      description: s.description,
      prizeValue: s.value,
      emoji: s.emoji,
      category: s.category,
      type: s.type ?? "REGULAR",
      status,
      deliveryType: s.delivery ?? "DIGITAL",
      city: s.city,
      startAt,
      endAt,
      maxTotalTickets: s.maxTotal,
      secretSeed,
      seedHash,
      actions: {
        create: actions.map((a) => ({
          type: a.type,
          label: a.label,
          url: a.url,
          seconds: a.seconds ?? 0,
          couponCode: a.couponCode,
          formQuestion: a.formQuestion,
          isUnlock: a.isUnlock,
          order: a.order,
        })),
      },
    },
    include: { actions: true },
  });
}

/** Simula participación: usuarios que desbloquean y consiguen papeletas */
async function simulateParticipation(raffle: Awaited<ReturnType<typeof createRaffle>>, userIds: string[], maxPerUser: number) {
  const participants = userIds.filter(() => Math.random() < 0.5);
  let n = 0;
  const unlock = raffle.actions.find((a) => a.isUnlock)!;
  for (const userId of participants) {
    const count = Math.min(maxPerUser, 3 + Math.floor(Math.random() * (maxPerUser - 2)));
    await prisma.actionCompletion.create({ data: { actionId: unlock.id, userId, completedAt: new Date() } });
    await prisma.ticket.createMany({
      data: Array.from({ length: count }, (_, i) => ({ raffleId: raffle.id, userId, number: n + i + 1, source: i < 3 ? "UNLOCK" : "WILDCARD" })),
    });
    n += count;
  }
  await prisma.raffle.update({ where: { id: raffle.id }, data: { ticketCount: n } });
}

async function main() {
  console.log("🧹 Borrando datos…");
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.prizeDelivery.deleteMany(),
    prisma.draw.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.ticket.deleteMany(),
    prisma.actionCompletion.deleteMany(),
    prisma.raffleAction.deleteMany(),
    prisma.raffle.deleteMany(),
    prisma.sponsor.deleteMany(),
    prisma.wildcardEntry.deleteMany(),
    prisma.loginEvent.deleteMany(),
    prisma.session.deleteMany(),
    prisma.adView.deleteMany(),
    prisma.adBanner.deleteMany(),
    prisma.user.deleteMany(),
    prisma.setting.deleteMany(),
  ]);

  await prisma.setting.create({ data: { key: "app", value: DEFAULT_SETTINGS as unknown as object } });
  const pw = await bcrypt.hash("test1234", 10);
  const now = new Date();
  const today = dayKey(now);
  const [y, m, d] = today.split("-").map(Number);
  const today8 = madridDate(y, m, d, 8);
  const todayStart = today8 <= now ? today8 : madridDate(y, m, d, 0, 5);

  console.log("👤 Admin y patrocinadores…");
  await prisma.user.create({
    data: {
      email: "admin@sorteodiario.test",
      name: "Chusi (Admin)",
      role: "ADMIN",
      passwordHash: await bcrypt.hash("admin1234", 10),
      referralCode: code(),
      phoneVerified: true,
      sponsor: { create: { companyName: "Sorteo Diario", logoEmoji: "🎟️", website: IAPRO } },
    },
  });
  const sponsorIds: string[] = [];
  for (const [i, s] of SPONSORS.entries()) {
    const u = await prisma.user.create({
      data: {
        email: `patrocinador${i + 1}@test.com`,
        name: `Contacto ${s.company}`,
        role: "SPONSOR",
        passwordHash: pw,
        referralCode: code(),
        sponsor: { create: { companyName: s.company, logoEmoji: s.emoji, website: s.web } },
      },
      include: { sponsor: true },
    });
    sponsorIds.push(u.sponsor!.id);
  }

  console.log("👥 50 usuarios…");
  const userIds: string[] = [];
  for (let i = 1; i <= 50; i++) {
    const u = await prisma.user.create({
      data: {
        email: `usuario${i}@test.com`,
        name: `${rand(FIRST)} ${rand(LAST)}`,
        passwordHash: pw,
        phone: `6${String(10000000 + i).padStart(8, "0")}`,
        phoneVerified: true,
        province: rand(PROV),
        referralCode: code(),
        registerIp: `10.0.0.${i <= 3 ? 1 : i}`, // 3 cuentas desde la misma IP (para el panel antifraude)
        deviceId: `device-${i}`,
      },
    });
    userIds.push(u.id);
    await prisma.wildcardEntry.create({ data: { userId: u.id, amount: 10, reason: "WELCOME", dayKey: today } });
  }
  // Un usuario "limpio" para probar el flujo desde cero (sin papeletas, con 10 comodines)
  const demo = await prisma.user.create({
    data: { email: "demo@test.com", name: "Usuario Demo", passwordHash: pw, phone: "699999999", phoneVerified: true, province: "Granada", referralCode: "DEMO2026" },
  });
  await prisma.wildcardEntry.create({ data: { userId: demo.id, amount: 10, reason: "WELCOME", dayKey: today } });

  console.log("🎁 Sorteos…");
  for (const [i, s] of LIVE.entries()) {
    const hours = [24, 48, 72][i % 3];
    const r = await createRaffle(s, sponsorIds, todayStart, new Date(today8.getTime() + hours * HOUR));
    await simulateParticipation(r, userIds, 10);
  }
  for (const s of YESTERDAY) {
    const start = new Date(today8.getTime() - 24 * HOUR);
    const r = await createRaffle(s, sponsorIds, start, new Date(start.getTime() + 48 * HOUR));
    await simulateParticipation(r, userIds, 10);
  }
  const sp = await createRaffle(SPECIAL, sponsorIds, new Date(today8.getTime() - 24 * HOUR), new Date(today8.getTime() + 6 * 24 * HOUR));
  await simulateParticipation(sp, userIds, 30);
  const tomorrow8 = nextPublishTime(now, 8);
  for (const s of TOMORROW) await createRaffle(s, sponsorIds, tomorrow8, new Date(tomorrow8.getTime() + 24 * HOUR));
  for (const s of PENDING) await createRaffle(s, sponsorIds, tomorrow8, new Date(tomorrow8.getTime() + 48 * HOUR), "PENDING");
  for (const [i, s] of PAST.entries()) {
    const start = new Date(today8.getTime() - (4 + i) * 24 * HOUR);
    const r = await createRaffle(s, sponsorIds, start, new Date(start.getTime() + 24 * HOUR));
    await simulateParticipation(r, userIds, 10);
  }

  console.log("📣 Banners…");
  await prisma.adBanner.createMany({
    data: [
      { advertiser: "IA Pro", title: "Chatbots con IA para tu negocio", text: "Atiende a tus clientes 24/7", emoji: "🤖", color: "#7c3aed", linkUrl: IAPRO, position: "LEFT", videoUrl: YT, videoSeconds: 15 },
      { advertiser: "Libros de Chusi", title: "Entiende tu estilo de apego", text: "El ebook que te ayuda a sanar", emoji: "💜", color: "#db2777", linkUrl: IAPRO, position: "RIGHT", videoUrl: YT, videoSeconds: 15 },
      { advertiser: "Reseñas NFC", title: "Consigue más reseñas en Google", text: "Placas NFC: una reseña en 3 segundos", emoji: "⭐", color: "#0891b2", linkUrl: IAPRO, position: "RIGHT" },
      { advertiser: "IA Pro", title: "Reformas virtuales con IA para inmobiliarias", text: "Vende pisos más rápido con vídeos antes/después", emoji: "🏠", color: "#059669", linkUrl: IAPRO, position: "FOOTER", videoUrl: YT, videoSeconds: 15 },
    ],
  });

  console.log("✅ Datos de prueba creados");
  console.log("   Admin:        admin@sorteodiario.test / admin1234");
  console.log("   Patrocinador: patrocinador1@test.com … patrocinador10@test.com / test1234");
  console.log("   Usuarios:     usuario1@test.com … usuario50@test.com / test1234");
  console.log("   Demo limpio:  demo@test.com / test1234");
  console.log("   (Los sorteos pasados se cierran y sortean solos al abrir la web)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
