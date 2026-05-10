/**
 * users — customer accounts with hashed passwords and session tracking.
 * Linked to orders via customerPhone (legacy) or userId (new).
 */
import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  /** bcrypt hash — NEVER store plaintext */
  passwordHash: text("password_hash").notNull(),
  /** email verified flag */
  verified: boolean("verified").notNull().default(false),
  /** admin flag — defaults false; set manually in DB for safety */
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  verified: true,
  isAdmin: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
