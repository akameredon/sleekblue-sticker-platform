import { db, schema } from "./db";

export async function getShopSettingsRow() {
  const rows = await db.select().from(schema.shopSettings).limit(1);
  if (rows[0]) return rows[0];
  // Safe fallback settings. Production must be explicitly reviewed in Admin before launch.
  const [created] = await db
    .insert(schema.shopSettings)
    .values({
      businessName: "Product Label Studio",
      tagline: "Design your product labels easily. We print, cut and package your stickers with Sleekblue Media Houz.",
      whatsappNumber: "2348058162036",
      whatsappDisplay: "+234 805 816 2036",
      email: null,
      location: "Serving businesses across Nigeria",
      hours: "Contact us on WhatsApp for current availability",
      currency: "NGN",
      currencySymbol: "₦",
      instagram: null,
      deliveryNote: "Nationwide delivery can be arranged. Delivery fees and timing are confirmed before payment.",
      leadTimeDays: 3,
    })
    .returning();
  return created!;
}
