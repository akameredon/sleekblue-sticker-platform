import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export type StoredObjectAclRule = {
  group: { type: string; id: string };
  permission: "read" | "write";
};

export const objectAcl = pgTable("object_acl", {
  objectPath: text("object_path").primaryKey(),
  ownerId: text("owner_id").notNull(),
  visibility: text("visibility").notNull().default("private"),
  aclRules: jsonb("acl_rules").$type<StoredObjectAclRule[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
