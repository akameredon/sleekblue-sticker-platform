/**
 * payments — tracks Paystack payment attempts and their outcomes.
 * Each payment maps 1:1 to an order via orderId.
 * status lifecycle: pending → success | failed | abandoned
 */
import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { orders } from "./orders";

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  /** Foreign key to orders.id */
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
  /** Paystack reference e.g. "PS-TXN-XXXXX" */
  paystackReference: text("paystack_reference").notNull().unique(),
  /** Paystack access_code for inline popup */
  accessCode: text("access_code"),
  /** Amount in kobo (Paystack unit) */
  amountKobo: numeric("amount_kobo", { precision: 14, scale: 0 }).notNull(),
  currency: text("currency").notNull().default("NGN"),
  status: text("status").notNull().default("pending"),
  /** Raw webhook payload for audit trail */
  webhookPayload: text("webhook_payload"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
