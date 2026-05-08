import { db, schema } from "./db";

export async function getShopSettingsRow() {
  const rows = await db.select().from(schema.shopSettings).limit(1);
  if (rows[0]) return rows[0];
  // Seed default settings if none exist (idempotent fallback)
  const [created] = await db
    .insert(schema.shopSettings)
    .values({
      businessName: "Sticker Lab",
      tagline:
        "Premium die-cut vinyl stickers, made in Lagos. Designed to outlast your laptop.",
      whatsappNumber: "2348000000000",
      whatsappDisplay: "+234 800 000 0000",
      email: "hello@stickerlab.ng",
      location: "Lekki, Lagos",
      hours: "Mon–Sat, 9am–6pm WAT",
      currency: "NGN",
      currencySymbol: "₦",
      instagram: "@stickerlab.ng",
      deliveryNote: "Pickup free in Lekki. Doorstep delivery quoted on chat.",
      leadTimeDays: 3,
    })
    .returning();
  return created!;
}
