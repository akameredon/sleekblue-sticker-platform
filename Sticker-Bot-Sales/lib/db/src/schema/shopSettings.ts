import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const shopSettings = pgTable("shop_settings", {
  id: serial("id").primaryKey(),
  businessName: text("business_name").notNull(),
  tagline: text("tagline").notNull(),
  whatsappNumber: text("whatsapp_number").notNull(),
  whatsappDisplay: text("whatsapp_display").notNull(),
  email: text("email"),
  location: text("location").notNull(),
  hours: text("hours").notNull(),
  currency: text("currency").notNull().default("NGN"),
  currencySymbol: text("currency_symbol").notNull().default("₦"),
  instagram: text("instagram"),
  deliveryNote: text("delivery_note"),
  leadTimeDays: integer("lead_time_days").notNull().default(3),
});

export const insertShopSettingsSchema = createInsertSchema(shopSettings).omit({
  id: true,
});

export type ShopSettings = typeof shopSettings.$inferSelect;
export type InsertShopSettings = z.infer<typeof insertShopSettingsSchema>;
