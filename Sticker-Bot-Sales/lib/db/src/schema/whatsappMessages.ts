/**
 * whatsapp_messages — stores every inbound and outbound WhatsApp message.
 * Used by the two-way AI agent to maintain conversation context per phone number.
 * direction: "inbound" = customer → us, "outbound" = us → customer
 */
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const whatsappMessages = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  /** Customer's WhatsApp number in E.164 format e.g. +2348012345678 */
  fromNumber: text("from_number").notNull(),
  /** "inbound" | "outbound" */
  direction: text("direction").notNull(),
  /** WhatsApp message ID from Meta API */
  waMessageId: text("wa_message_id"),
  /** Message body text */
  body: text("body").notNull(),
  /** Media URL if message contains image/document */
  mediaUrl: text("media_url"),
  /** Status: sent | delivered | read | failed */
  status: text("status").notNull().default("sent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessages).omit({
  id: true,
  createdAt: true,
});

export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;
