/**
 * admin.ts — Admin dashboard data routes.
 *
 * GET  /admin/analytics       — revenue + order analytics (30 days)
 * GET  /admin/ai-metrics      — AI conversation stats + tool usage
 * GET  /admin/orders          — all orders with full pagination
 * PUT  /admin/orders/:id      — update order status
 * GET  /admin/products        — all products (admin view)
 * POST /admin/products        — create product
 * PUT  /admin/products/:id    — update product
 * DELETE /admin/products/:id  — delete product
 * GET  /admin/settings        — shop settings
 * PUT  /admin/settings        — update shop settings
 * GET  /admin/customers       — customer list with spend totals
 */
import { Router, type IRouter } from "express";
import { asc, desc, gte, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../lib/db";
import { requireAdmin } from "./auth";

const router: IRouter = Router();

// All admin endpoints require a verified admin JWT.
router.use(requireAdmin);

// ─── Analytics ───────────────────────────────────────────────────────────────

router.get("/admin/analytics", async (_req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [recentOrders, allOrders] = await Promise.all([
    db.select().from(schema.orders).where(gte(schema.orders.createdAt, thirtyDaysAgo)).orderBy(desc(schema.orders.createdAt)),
    db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt)).limit(500),
  ]);

  // Daily buckets for last 30 days
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

  // Top products by volume
  const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  for (const o of allOrders) {
    for (const it of o.items) {
      if (!productMap[it.productName]) productMap[it.productName] = { name: it.productName, qty: 0, revenue: 0 };
      productMap[it.productName]!.qty += it.quantity;
      productMap[it.productName]!.revenue += it.lineTotal;
    }
  }
  const topProducts = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 8);

  // Status + finish breakdowns
  const statusMap: Record<string, number> = {};
  const finishMap: Record<string, number> = {};
  for (const o of allOrders) {
    statusMap[o.status] = (statusMap[o.status] ?? 0) + 1;
    for (const it of o.items) {
      finishMap[it.finishLabel] = (finishMap[it.finishLabel] ?? 0) + it.quantity;
    }
  }

  const totalRevenue = allOrders.reduce((s, o) => s + Number(o.total), 0);
  const totalOrders = allOrders.length;
  const revenueThisWeek = allOrders
    .filter((o) => new Date(o.createdAt!).getTime() > sevenDaysAgo.getTime())
    .reduce((s, o) => s + Number(o.total), 0);

  // Revenue by month (last 6 months)
  const monthlyMap: Record<string, { month: string; revenue: number; orders: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    monthlyMap[key] = { month: key, revenue: 0, orders: 0 };
  }
  for (const o of allOrders) {
    const key = new Date(o.createdAt!).toISOString().slice(0, 7);
    if (monthlyMap[key]) {
      monthlyMap[key]!.revenue += Number(o.total);
      monthlyMap[key]!.orders++;
    }
  }

  res.json({
    dailyOrders: Object.values(dailyMap),
    monthlyRevenue: Object.values(monthlyMap),
    topProducts,
    statusBreakdown: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
    finishBreakdown: Object.entries(finishMap).map(([finish, qty]) => ({ finish, qty })),
    summary: {
      totalOrders,
      totalRevenue,
      avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      revenueThisWeek,
      ordersThisMonth: recentOrders.length,
      revenueThisMonth: recentOrders.reduce((s, o) => s + Number(o.total), 0),
    },
  });
});

// ─── AI Metrics ───────────────────────────────────────────────────────────────

router.get("/admin/ai-metrics", async (_req, res) => {
  const [convRows, msgRows] = await Promise.all([
    db.select().from(schema.conversations).orderBy(desc(schema.conversations.createdAt)).limit(200),
    db.select().from(schema.messages).orderBy(desc(schema.messages.createdAt)).limit(1000),
  ]);

  // WhatsApp messages
  let waTotal = 0;
  let waInbound = 0;
  let waOutbound = 0;
  try {
    const waRows = await db.select().from(schema.whatsappMessages).limit(1000);
    waTotal = waRows.length;
    waInbound = waRows.filter((m) => m.direction === "inbound").length;
    waOutbound = waRows.filter((m) => m.direction === "outbound").length;
  } catch { /* table may not exist yet */ }

  // Messages per conversation
  const msgsPerConv: Record<number, number> = {};
  for (const m of msgRows) {
    msgsPerConv[m.conversationId] = (msgsPerConv[m.conversationId] ?? 0) + 1;
  }
  const avgMsgsPerConv = convRows.length > 0
    ? Object.values(msgsPerConv).reduce((s, v) => s + v, 0) / convRows.length
    : 0;

  // Conversations in last 7 days
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentConvs = convRows.filter((c) => new Date(c.createdAt).getTime() > weekAgo).length;

  // Tool call frequency (parse tool_call events from message content if stored)
  const assistantMessages = msgRows.filter((m) => m.role === "assistant");

  res.json({
    webChat: {
      totalConversations: convRows.length,
      totalMessages: msgRows.length,
      avgMessagesPerConversation: Math.round(avgMsgsPerConv * 10) / 10,
      conversationsLast7Days: recentConvs,
      assistantMessages: assistantMessages.length,
    },
    whatsApp: {
      totalMessages: waTotal,
      inbound: waInbound,
      outbound: waOutbound,
    },
    recentConversations: convRows.slice(0, 10).map((c) => ({
      id: c.id,
      title: c.title,
      messageCount: msgsPerConv[c.id] ?? 0,
      createdAt: c.createdAt,
    })),
  });
});

// ─── Orders management ────────────────────────────────────────────────────────

router.get("/admin/orders", async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
  const offset = (page - 1) * limit;

  const [rows, [countRow]] = await Promise.all([
    db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.orders),
  ]);

  res.json({
    orders: rows,
    pagination: { page, limit, total: countRow?.count ?? 0, pages: Math.ceil((countRow?.count ?? 0) / limit) },
  });
});

const UpdateOrderBody = z.object({
  status: z.enum(["pending_whatsapp", "confirmed", "in_production", "shipped", "delivered", "cancelled"]),
});

router.put("/admin/orders/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid order ID" }); return; }

  const parse = UpdateOrderBody.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: "Invalid status", issues: parse.error.issues }); return; }

  const [updated] = await db
    .update(schema.orders)
    .set({ status: parse.data.status })
    .where(eq(schema.orders.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Order not found" }); return; }
  res.json(updated);
});

// ─── Products management ──────────────────────────────────────────────────────

router.get("/admin/products", async (_req, res) => {
  const rows = await db.select().from(schema.products).orderBy(asc(schema.products.sortOrder));
  res.json(rows);
});

const ProductBody = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100),
  tagline: z.string().max(200),
  description: z.string().max(2000).optional(),
  categorySlug: z.string(),
  basePrice: z.number().positive(),
  imageUrl: z.string().nullable().optional(),
  isFeatured: z.boolean().optional(),
  isBestseller: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

router.post("/admin/products", async (req, res) => {
  const parse = ProductBody.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: "Validation failed", issues: parse.error.issues }); return; }
  const [row] = await db.insert(schema.products).values({
    ...parse.data,
    basePrice: String(parse.data.basePrice),
    sizes: [],
    finishes: [],
    quantityTiers: [],
    tags: [],
  }).returning();
  res.status(201).json(row);
});

router.put("/admin/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid product ID" }); return; }
  const parse = ProductBody.partial().safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: "Validation failed", issues: parse.error.issues }); return; }
  const data = parse.data;
  const [row] = await db
    .update(schema.products)
    .set({ ...data, ...(data.basePrice !== undefined ? { basePrice: String(data.basePrice) } : {}) })
    .where(eq(schema.products.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(row);
});

router.delete("/admin/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid product ID" }); return; }
  const [deleted] = await db.delete(schema.products).where(eq(schema.products.id, id)).returning({ id: schema.products.id });
  if (!deleted) { res.status(404).json({ error: "Product not found" }); return; }
  res.status(204).end();
});

// ─── Shop settings ────────────────────────────────────────────────────────────

router.get("/admin/settings", async (_req, res) => {
  const [row] = await db.select().from(schema.shopSettings).limit(1);
  if (!row) { res.status(404).json({ error: "Shop settings not found" }); return; }
  res.json(row);
});

const SettingsBody = z.object({
  businessName: z.string().min(2).max(100).optional(),
  tagline: z.string().max(300).optional(),
  whatsappNumber: z.string().min(7).max(20).optional(),
  whatsappDisplay: z.string().max(30).optional(),
  email: z.string().nullable().optional(),
  location: z.string().max(200).optional(),
  hours: z.string().max(200).optional(),
  instagram: z.string().nullable().optional(),
  deliveryNote: z.string().nullable().optional(),
  leadTimeDays: z.number().int().min(1).max(30).optional(),
});

router.put("/admin/settings", async (req, res) => {
  const parse = SettingsBody.safeParse(req.body);
  if (!parse.success) { res.status(400).json({ error: "Validation failed", issues: parse.error.issues }); return; }
  const [existing] = await db.select({ id: schema.shopSettings.id }).from(schema.shopSettings).limit(1);
  if (!existing) { res.status(404).json({ error: "Settings not found" }); return; }
  const [updated] = await db.update(schema.shopSettings).set(parse.data).where(eq(schema.shopSettings.id, existing.id)).returning();
  res.json(updated);
});

// ─── Customers ────────────────────────────────────────────────────────────────

router.get("/admin/customers", async (_req, res) => {
  const orders = await db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt)).limit(1000);

  // Deduplicate by phone, aggregate spend
  const byPhone: Record<string, { name: string; phone: string; email: string | null; orders: number; totalSpent: number; lastOrderAt: string }> = {};
  for (const o of orders) {
    if (!byPhone[o.customerPhone]) {
      byPhone[o.customerPhone] = { name: o.customerName, phone: o.customerPhone, email: o.customerEmail ?? null, orders: 0, totalSpent: 0, lastOrderAt: o.createdAt!.toISOString() };
    }
    byPhone[o.customerPhone]!.orders++;
    byPhone[o.customerPhone]!.totalSpent += Number(o.total);
  }

  const customers = Object.values(byPhone).sort((a, b) => b.totalSpent - a.totalSpent);
  res.json(customers);
});

export default router;
