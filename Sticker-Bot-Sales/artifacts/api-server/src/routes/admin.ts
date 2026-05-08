import { Router, type IRouter } from "express";
import { desc, gte, sql } from "drizzle-orm";
import { db, schema } from "../lib/db";

const router: IRouter = Router();

router.get("/admin/analytics", async (_req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const recentOrders = await db
    .select()
    .from(schema.orders)
    .where(gte(schema.orders.createdAt, thirtyDaysAgo))
    .orderBy(desc(schema.orders.createdAt));

  const allOrders = await db
    .select()
    .from(schema.orders)
    .orderBy(desc(schema.orders.createdAt))
    .limit(100);

  const dailyMap: Record<string, { date: string; orders: number; revenue: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dailyMap[key] = { date: key, orders: 0, revenue: 0 };
  }
  for (const o of recentOrders) {
    const key = new Date(o.createdAt!).toISOString().slice(0, 10);
    if (dailyMap[key]) {
      dailyMap[key]!.orders += 1;
      dailyMap[key]!.revenue += Number(o.total);
    }
  }
  const dailyOrders = Object.values(dailyMap);

  const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  for (const o of allOrders) {
    for (const it of o.items) {
      const key = it.productName;
      if (!productMap[key]) productMap[key] = { name: key, qty: 0, revenue: 0 };
      productMap[key]!.qty += it.quantity;
      productMap[key]!.revenue += it.lineTotal;
    }
  }
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8);

  const statusMap: Record<string, number> = {};
  for (const o of allOrders) {
    const s = o.status ?? "unknown";
    statusMap[s] = (statusMap[s] ?? 0) + 1;
  }
  const statusBreakdown = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

  const finishMap: Record<string, number> = {};
  for (const o of allOrders) {
    for (const it of o.items) {
      const f = it.finishLabel;
      finishMap[f] = (finishMap[f] ?? 0) + it.quantity;
    }
  }
  const finishBreakdown = Object.entries(finishMap).map(([finish, qty]) => ({ finish, qty }));

  const totalRevenue = allOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const totalOrders = allOrders.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const revenueThisWeek = recentOrders
    .filter((o) => new Date(o.createdAt!).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000)
    .reduce((sum, o) => sum + Number(o.total), 0);

  res.json({
    dailyOrders,
    topProducts,
    statusBreakdown,
    finishBreakdown,
    summary: {
      totalOrders,
      totalRevenue,
      avgOrderValue,
      revenueThisWeek,
      ordersThisMonth: recentOrders.length,
    },
  });
});

export default router;
