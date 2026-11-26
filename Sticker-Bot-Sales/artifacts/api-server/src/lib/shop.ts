import { db, schema } from "./db";

export async function getShopSettingsRow() {
  const rows = await db.select().from(schema.shopSettings).limit(1);
  if (!rows[0]) {
    throw new Error("Shop configuration is incomplete. An administrator must configure verified business details before customer quotes or orders can be accepted.");
  }
  return rows[0];
}
