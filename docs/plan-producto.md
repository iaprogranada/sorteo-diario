# Sorteo Diario — Plan de producto

> Documento acordado entre Chusi (IA Pro) y Claude en la sesión de planificación y construcción (2026-11-06).
> Fuente de verdad del producto junto con el código. Lo legal está **pendiente de revisar con un abogado**.

## 1. La idea
Cada mañana se publican sorteos nuevos de premios que ponen los patrocinadores (cenas, masajes, peluquería, estética, tecnología, libros, viajes…). Para participar hay que **desbloquear** el sorteo con una acción que elige el patrocinador: ver su vídeo, visitar su web, seguirle, dejar sus datos o ver un cupón. El patrocinador gana visitas, visualizaciones, leads y visibilidad.

## 2. Análisis legal y decisiones (resumen de la conversación)
- **Idea original descartada:** que los usuarios recargaran créditos de pago (p. ej. 5 € = 20 participaciones). En España, pagar —aunque sea con créditos comprados— por participar en un sorteo es una **rifa** regulada por la Ley 13/2011 del Juego. Hacerlo online exige **licencia de la DGOJ**: sociedad específica, avales, plataforma homologada y auditorías, con costes de cientos de miles de euros. Sin licencia, las sanciones muy graves llegan a millones.
- **Modelo elegido:** la participación es **100 % gratuita**. Se trata como una «combinación aleatoria con fines publicitarios», que no requiere licencia. Obligaciones: bases legales, RGPD (consentimiento separado para ceder datos a cada patrocinador), LSSI/cookies y fiscalidad de los premios.
- **Tope de valor del premio: < 300 €** mientras la plataforma no despegue, para no tener que gestionar retenciones ni ingresos a cuenta del IRPF en especie. Se priorizan cupones digitales al estilo Groupon (masaje, estética, peluquería, cena para dos) y productos que envía el patrocinador (p. ej. periféricos gaming).
- **Nunca se dan papeletas por dejar reseñas:** Google y la normativa de consumo prohíben las reseñas incentivadas.
- Los premios grandes (coche, viaje) quedan para el futuro como sorteos **premium**, con revisión legal y fiscal propia.
- 💡 Pendiente de abogado y gestor: bases definitivas, posible depósito notarial en premios grandes, tributación de las combinaciones aleatorias.

## 3. Modelo de negocio
- **Patrocinadores:** gratis al principio para tener catálogo. Después, tarifas orientativas que hay que validar:
  - Sorteo puntual: 49–149 €.
  - Destacado: +50–100 €.
  - Plan mensual: 299–599 €/mes.
  - Grandes sorteos: a medida.
- **Banners publicitarios:** laterales izquierdo y derecho y faldón inferior, para marcas que solo quieren aparecer. También vídeos de anunciantes en «Gana comodines».
- **Venta cruzada IA Pro:** a cada patrocinador se le ofrecen redes, vídeos con IA, chatbots y placas NFC.
- **Captación:** campaña en Meta, primeros patrocinadores que lo difundan, referidos y los canales de Chusi.

## 4. Tipos de sorteo
| Tipo | Duración | Máx. papeletas por persona |
|---|---|---|
| Regular | 24, 48 o 72 h | 10 |
| Especial | hasta 7 días | 30 |
| Premium (futuro) | a medida | ilimitadas |

- Se llama «diario» porque **cada día** aparecen sorteos nuevos. Se publican a las 8:00 y cada uno cierra en su propio plazo.
- Tope opcional de papeletas totales: si se agotan, el sorteo cierra antes.

## 5. Papeletas y ganador
- **Numeración propia por sorteo**, empezando en #1. Cada papeleta conseguida recibe el siguiente número libre. No hay rango fijo: el rango final es 1…total de papeletas, así que no sobran números vacíos.
- **Sorteo verificable:**
  1. Al crear el sorteo se publica `sha256(clave secreta)`.
  2. Al cerrar se usa la primera ronda pública de **drand** posterior al cierre.
  3. `papeleta = HMAC-SHA256(clave, "aleatoriedad:contador") mod total + 1`.
  4. El contador 0 da el ganador. Se eligen 2 suplentes, que deben ser personas distintas.
  5. La página «Verifica este sorteo» lo recalcula en el navegador.
- El ganador tiene 7 días para aceptar el premio. Si no lo hace, pasa al suplente.

## 6. Cómo se ganan papeletas (generoso, con topes diarios)
- **Desbloquear:** +3 papeletas en ese sorteo.
- **Acciones extra del patrocinador** (hasta 5): +1 cada una. Se pueden completar aunque se haya llegado al tope; en ese caso no dan papeleta, pero el patrocinador gana la interacción.
- **Comodines:** papeletas libres que se reparten entre sorteos ya desbloqueados.

| Tarea | Comodines | Límite |
|---|---|---|
| Bienvenida (verificar teléfono) | +10 | una vez |
| Completar perfil | +5 | una vez |
| Entrar cada día | +2 | 1/día |
| Racha de 7 días | +5 | cada 7 días |
| Invitar a un amigo verificado | +5 | 5/día |
| Ver vídeo de anunciante | +1 | 5/día |
| Compartir sorteo | +1 | 3/día |
| **Tope diario total** | **25** | bienvenida y perfil no cuentan |

Todo se puede ajustar desde Admin → Ajustes.

## 7. Roles
- **Usuario:** portada, ficha del sorteo, desbloquear, papeletas, comodines, perfil, invitaciones y premios.
- **Patrocinador:** alta, creación de sorteos (revisados por el admin), estadísticas por acción, leads en CSV y entrega del premio.
- **Admin:**
  - Aprobar y rechazar sorteos.
  - Ajustes, banners, premios y suplentes.
  - Antifraude (misma IP o dispositivo), usuarios.
  - Reloj de pruebas.

## 8. Tecnología
Next.js 15 + TypeScript + Tailwind 4 + PostgreSQL + Prisma. Pruebas con Vitest y Playwright.

Para producción:
- Vercel + Supabase o Neon.
- Cron cada 5 minutos.
- Twilio para SMS y Resend para email.

## 9. Fases
1. ✅ Construcción del MVP con datos ficticios y pruebas: 24 unitarias y 3 E2E (2026-11-06).
2. Revisión legal: bases, privacidad, contrato con patrocinadores y consulta fiscal.
3. Publicación: dominio, hosting, base de datos, SMS y email reales, drand en modo `live`.
4. Beta con los primeros patrocinadores reales. Se mide: usuarios activos, participaciones, coste por visita y coste por lead.
5. Monetización: planes de pago para patrocinadores y sorteos especiales grandes.

## 10. Riesgos
- **El huevo y la gallina:** sin usuarios no hay patrocinadores y al revés. Respuesta: primeros patrocinadores gratis y tráfico propio.
- **Fraude y multicuentas:** SMS, límites por IP y dispositivo, panel antifraude y revisión antes de entregar el premio.
- **Usuarios que solo buscan premio:** acciones de calidad (vídeo controlado, leads con interés) e informes honestos.

## Capturas
Ver [`docs/capturas/`](capturas/): inicio, sorteo especial, gana comodines, perfil, crear sorteo, panel del patrocinador, admin, verificar e inicio en móvil.
