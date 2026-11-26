import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import * as schema from "@workspace/db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const tiers = [
  { minQty: 1, unitPrice: 250, label: "Starter (1-49)" },
  { minQty: 50, unitPrice: 180, label: "Maker pack (50-99)" },
  { minQty: 100, unitPrice: 140, label: "Brand pack (100-249)" },
  { minQty: 250, unitPrice: 110, label: "Bulk (250-499)" },
  { minQty: 500, unitPrice: 85, label: "Wholesale (500+)" },
];

const sizes = [
  { label: "Small", widthMm: 50, heightMm: 50, priceModifier: 1.0 },
  { label: "Medium", widthMm: 75, heightMm: 75, priceModifier: 1.4 },
  { label: "Large", widthMm: 100, heightMm: 100, priceModifier: 1.9 },
  { label: "Custom", widthMm: 0, heightMm: 0, priceModifier: 1.0 },
];

const finishes = [
  { label: "Matte", description: "Soft, premium feel", priceModifier: 1.0 },
  { label: "Gloss", description: "Vibrant and reflective", priceModifier: 1.05 },
  { label: "Holographic", description: "Rainbow shimmer", priceModifier: 1.35 },
];

const categories = [
  { slug: "logo", name: "Logo Stickers", description: "Your brand on every laptop, kit, and box.", icon: "Sparkles", sortOrder: 1 },
  { slug: "kiss-cut", name: "Kiss-Cut Sheets", description: "Multiple stickers on one peel-and-stick sheet.", icon: "Layers", sortOrder: 2 },
  { slug: "die-cut", name: "Die-Cut Singles", description: "Custom shapes, cut to your artwork.", icon: "Scissors", sortOrder: 3 },
  { slug: "holographic", name: "Holographic", description: "Catch the light with rainbow shimmer.", icon: "Star", sortOrder: 4 },
  { slug: "transparent", name: "Transparent", description: "Clear vinyl that lets your design float.", icon: "Eye", sortOrder: 5 },
  { slug: "label", name: "Product Labels", description: "Waterproof labels for jars, bottles, packaging.", icon: "Tag", sortOrder: 6 },
];

const products = [
  {
    slug: "brand-logo-die-cut",
    name: "Brand Logo Die-Cut",
    tagline: "Your logo, perfectly cut to shape",
    description: "Premium 3.2mil vinyl die-cut to your logo's exact contour. Weatherproof, dishwasher-safe, and fade-resistant for 5+ years outdoors. The default choice for founders shipping their first batch of swag.",
    categorySlug: "logo",
    basePrice: "250",
    imageUrl: "https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=800&q=80",
    material: "3.2mil premium vinyl",
    isFeatured: true,
    isBestseller: true,
    rating: "4.9",
    reviewCount: 312,
    tags: ["bestseller", "weatherproof", "logo"],
    sortOrder: 1,
  },
  {
    slug: "kiss-cut-sticker-pack",
    name: "Kiss-Cut Sticker Pack",
    tagline: "Up to 12 designs on one sheet",
    description: "Send us your artwork and we'll arrange up to 12 stickers on a single A6 backing sheet. Peel one at a time, share the rest. Ideal for product inserts and event giveaways.",
    categorySlug: "kiss-cut",
    basePrice: "320",
    imageUrl: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=800&q=80",
    material: "Matte vinyl on glossy backing",
    isFeatured: true,
    isBestseller: false,
    rating: "4.8",
    reviewCount: 184,
    tags: ["multi-pack", "gifting"],
    sortOrder: 2,
  },
  {
    slug: "holographic-shape",
    name: "Holographic Custom Shape",
    tagline: "Rainbow shimmer that turns heads",
    description: "Die-cut holographic vinyl that catches the light at every angle. Adds instant premium energy to merch, packaging, or laptops. Perfect for product launches and limited drops.",
    categorySlug: "holographic",
    basePrice: "380",
    imageUrl: "https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=800&q=80",
    material: "Holographic prismatic vinyl",
    isFeatured: true,
    isBestseller: true,
    rating: "5.0",
    reviewCount: 96,
    tags: ["premium", "holographic", "limited"],
    sortOrder: 3,
  },
  {
    slug: "transparent-die-cut",
    name: "Transparent Die-Cut",
    tagline: "Designs that float on glass",
    description: "Crystal-clear vinyl with full-color print. Looks incredible on car windows, glass storefronts, and clear packaging. Removable without residue.",
    categorySlug: "transparent",
    basePrice: "300",
    imageUrl: "https://images.unsplash.com/photo-1618159056977-a1ca6fcec1da?w=800&q=80",
    material: "Clear gloss vinyl",
    isFeatured: false,
    isBestseller: false,
    rating: "4.7",
    reviewCount: 58,
    tags: ["transparent", "windows"],
    sortOrder: 4,
  },
  {
    slug: "product-label-waterproof",
    name: "Waterproof Product Labels",
    tagline: "Built for jars, bottles, and shower shelves",
    description: "Marine-grade waterproof labels for skincare, candles, food, and beverage. Dishwasher tested. Choose matte or gloss laminate. Minimum order 50.",
    categorySlug: "label",
    basePrice: "200",
    imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80",
    material: "Polypropylene with laminate",
    isFeatured: true,
    isBestseller: false,
    rating: "4.9",
    reviewCount: 142,
    tags: ["waterproof", "labels", "skincare"],
    sortOrder: 5,
  },
  {
    slug: "vinyl-decal-large",
    name: "Large Vinyl Decal",
    tagline: "Wall and storefront-ready signage",
    description: "Single-color vinyl cut decals up to 600mm. Apply to walls, glass, vehicles, or laptops. Includes transfer tape and step-by-step application card.",
    categorySlug: "die-cut",
    basePrice: "1500",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    material: "Cast vinyl, single-color",
    isFeatured: false,
    isBestseller: false,
    rating: "4.8",
    reviewCount: 41,
    tags: ["large", "signage"],
    sortOrder: 6,
  },
  {
    slug: "matte-laptop-pack",
    name: "Matte Laptop Pack",
    tagline: "Curated 6-sticker pack for creators",
    description: "A hand-picked set of 6 of our most popular small designs in soft-touch matte. Great as a freebie for new customers or a gift for designer friends.",
    categorySlug: "kiss-cut",
    basePrice: "1200",
    imageUrl: "https://images.unsplash.com/photo-1572177812156-58036aae439c?w=800&q=80",
    material: "Soft-touch matte vinyl",
    isFeatured: false,
    isBestseller: true,
    rating: "4.9",
    reviewCount: 220,
    tags: ["pack", "matte", "gifting"],
    sortOrder: 7,
  },
  {
    slug: "neon-die-cut",
    name: "Neon Die-Cut",
    tagline: "Fluorescent ink that glows under UV",
    description: "Eye-popping fluorescent ink on white vinyl. Great for events, festivals, and retail merchandising where you need visibility.",
    categorySlug: "die-cut",
    basePrice: "340",
    imageUrl: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&q=80",
    material: "Fluorescent vinyl",
    isFeatured: false,
    isBestseller: false,
    rating: "4.7",
    reviewCount: 33,
    tags: ["neon", "events"],
    sortOrder: 8,
  },
];

async function main() {
  console.log("Seeding shop settings...");
  const existingSettings = await db.select().from(schema.shopSettings).limit(1);
  if (existingSettings.length === 0) {
    await db.insert(schema.shopSettings).values({
      businessName: "Product Label Studio",
      tagline: "Design your product labels easily. We print, cut and package your stickers with Sleekblue Media Houz.",
      // ⚠️ Real WhatsApp number — no + prefix — used by n8n bot and wa.me links
      whatsappNumber: "2348058162036",
      whatsappDisplay: "+234 805 816 2036",
      email: null,
      location: "Serving businesses across Nigeria",
      hours: "Contact us on WhatsApp for current availability",
      currency: "NGN",
      currencySymbol: "₦",
      instagram: null,
      deliveryNote: "Nationwide delivery can be arranged. Delivery fees and timing are confirmed before payment.",
      leadTimeDays: 3,
    });
    console.log("  shop settings seeded");
  } else {
    console.log("  shop settings already exist, skipping");
  }

  console.log("Seeding categories...");
  for (const c of categories) {
    await db
      .insert(schema.categories)
      .values(c)
      .onConflictDoUpdate({
        target: schema.categories.slug,
        set: { name: c.name, description: c.description, icon: c.icon, sortOrder: c.sortOrder },
      });
  }
  console.log(`  ${categories.length} categories upserted`);

  console.log("Seeding products...");
  for (const p of products) {
    await db
      .insert(schema.products)
      .values({ ...p, sizes, finishes, quantityTiers: tiers })
      .onConflictDoUpdate({
        target: schema.products.slug,
        set: {
          name: p.name,
          tagline: p.tagline,
          description: p.description,
          categorySlug: p.categorySlug,
          basePrice: p.basePrice,
          imageUrl: p.imageUrl,
          material: p.material,
          isFeatured: p.isFeatured,
          isBestseller: p.isBestseller,
          rating: p.rating,
          reviewCount: p.reviewCount,
          tags: p.tags,
          sortOrder: p.sortOrder,
          sizes,
          finishes,
          quantityTiers: tiers,
        },
      });
  }
  console.log(`  ${products.length} products upserted`);

  await pool.end();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Avoid unused-import lint
void sql;
