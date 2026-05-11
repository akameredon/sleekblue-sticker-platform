/**
 * auth.ts — Customer authentication routes.
 *
 * POST /auth/register  — create account
 * POST /auth/login     — get JWT token
 * GET  /auth/me        — get current user (requires Bearer token)
 * PUT  /auth/me        — update name/phone
 *
 * All passwords are hashed with PBKDF2. Tokens are HS256 JWTs (30-day expiry).
 */
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../lib/db";
import { signToken, verifyToken, hashPassword, verifyPassword, extractToken } from "../lib/auth";

const router: IRouter = Router();

// ─── Validation schemas ───────────────────────────────────────────────────────

const RegisterBody = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.email("Invalid email"),
  phone: z.string().min(7, "Invalid phone").max(20),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

const LoginBody = z.object({
  email: z.email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

const UpdateProfileBody = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(7).max(20).optional(),
});

// ─── Middleware ───────────────────────────────────────────────────────────────

/** Attach authenticated user to req.user — returns 401 if invalid */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req.headers.authorization);
  if (!token) { res.status(401).json({ error: "Authentication required" }); return; }
  const payload = verifyToken(token);
  if (!payload || typeof payload.userId !== "number") {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  // Attach to request for downstream handlers
  (req as Request & { user: { id: number; isAdmin: boolean } }).user = {
    id: payload.userId as number,
    isAdmin: Boolean(payload.isAdmin),
  };
  next();
}

/** Like requireAuth but also checks isAdmin flag */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, async () => {
    const r = req as Request & { user: { id: number; isAdmin: boolean } };
    if (!r.user?.isAdmin) { res.status(403).json({ error: "Admin access required" }); return; }
    next();
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/** POST /auth/register */
router.post("/auth/register", async (req, res) => {
  const parse = RegisterBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed", issues: parse.error.issues });
    return;
  }
  const { name, email, phone, password } = parse.data;

  // Check duplicate email
  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase()))
    .limit(1);
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(schema.users)
    .values({ name, email: email.toLowerCase(), phone, passwordHash })
    .returning({ id: schema.users.id, name: schema.users.name, email: schema.users.email, isAdmin: schema.users.isAdmin });

  const token = signToken({ userId: user!.id, isAdmin: user!.isAdmin });
  res.status(201).json({ token, user: { id: user!.id, name: user!.name, email: user!.email, isAdmin: user!.isAdmin } });
});

/** POST /auth/login */
router.post("/auth/login", async (req, res) => {
  const parse = LoginBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed", issues: parse.error.issues });
    return;
  }
  const { email, password } = parse.data;

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase()))
    .limit(1);

  // Use same error message for both "not found" and "wrong password" — prevents user enumeration
  const INVALID = "Invalid email or password";
  if (!user) { res.status(401).json({ error: INVALID }); return; }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) { res.status(401).json({ error: INVALID }); return; }

  const token = signToken({ userId: user.id, isAdmin: user.isAdmin });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
});

/** GET /auth/me — returns current user's profile + their orders */
router.get("/auth/me", requireAuth, async (req, res) => {
  const { id } = (req as Request & { user: { id: number } }).user;
  const [user] = await db
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, phone: schema.users.phone, isAdmin: schema.users.isAdmin, createdAt: schema.users.createdAt })
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
});

/** PUT /auth/me — update name and/or phone */
router.put("/auth/me", requireAuth, async (req, res) => {
  const { id } = (req as Request & { user: { id: number } }).user;
  const parse = UpdateProfileBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Validation failed", issues: parse.error.issues });
    return;
  }
  const updates: Partial<{ name: string; phone: string; updatedAt: Date }> = {};
  if (parse.data.name) updates.name = parse.data.name;
  if (parse.data.phone) updates.phone = parse.data.phone;
  updates.updatedAt = new Date();

  const [updated] = await db
    .update(schema.users)
    .set(updates)
    .where(eq(schema.users.id, id))
    .returning({ id: schema.users.id, name: schema.users.name, email: schema.users.email, phone: schema.users.phone });
  res.json(updated);
});

export default router;
