import { Router, type IRouter } from "express";
import { count, gte, sql } from "drizzle-orm";
import {
  GetShopInfoResponse,
  GetShopStatsResponse,
} from "@workspace/api-zod";
import { db, schema } from "../lib/db";
import { getShopSettingsRow } from "../lib/shop";

const router: IRouter = Router();
const sqlDistinctPhones = sql`distinct ${schema.orders.customerPhone}`;

router.get("/shop/info", async (_req, res) => {
  const settings = await getShopSettingsRow();
  const data = GetShopInfoResponse.parse({
    businessName: settings.businessName,
    tagline: settings.tagline,
    whatsappNumber: settings.whatsappNumber,
    whatsappDisplay: settings.whatsappDisplay,
    email: settings.email ?? undefined,
    location: settings.location,
    hours: settings.hours,
    currency: settings.currency,
    currencySymbol: settings.currencySymbol,
    instagram: settings.instagram ?? undefined,
    deliveryNote: settings.deliveryNote ?? undefined,
    leadTimeDays: settings.leadTimeDays,
  });
  res.json(data);
});

router.get("/shop/stats", async (_req, res) => {
  const settings = await getShopSettingsRow();
  const [{ value: totalProducts }] = await db
    .select({ value: count() })
    .from(schema.products);
  const [{ value: totalCategories }] = await db
    .select({ value: count() })
    .from(schema.categories);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [{ value: ordersThisWeek }] = await db
    .select({ value: count() })
    .from(schema.orders)
    .where(gte(schema.orders.createdAt, sevenDaysAgo));

  const [{ value: totalOrders }] = await db
    .select({ value: count() })
    .from(schema.orders);
  const [{ value: happyCustomers }] = await db
    .select({ value: count(sqlDistinctPhones) })
    .from(schema.orders);

  const data = GetShopStatsResponse.parse({
    totalProducts,
    totalCategories,
    ordersThisWeek,
    happyCustomers,
    averageLeadTimeDays: settings.leadTimeDays,
  });
  res.json(data);
});

export default router;
