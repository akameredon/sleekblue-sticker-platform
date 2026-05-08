import type { Order } from "@workspace/db/schema";

export function formatNGN(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export function buildWhatsappMessage(
  order: Order,
  businessName: string,
): string {
  const lines: string[] = [];
  lines.push(`Hi ${businessName}! I'd like to place a sticker order.`);
  lines.push("");
  lines.push(`Order ref: ${order.reference}`);
  lines.push(`Name: ${order.customerName}`);
  lines.push(`Phone: ${order.customerPhone}`);
  if (order.customerEmail) lines.push(`Email: ${order.customerEmail}`);
  if (order.deliveryMethod) lines.push(`Delivery: ${order.deliveryMethod}`);
  if (order.deliveryAddress) lines.push(`Address: ${order.deliveryAddress}`);
  lines.push("");
  lines.push("Items:");
  for (const item of order.items) {
    const dims =
      item.widthMm && item.heightMm
        ? ` (${item.widthMm}x${item.heightMm}mm)`
        : "";
    lines.push(
      `- ${item.quantity} x ${item.productName} — ${item.sizeLabel}${dims}, ${item.finishLabel} @ ${formatNGN(item.unitPrice)} = ${formatNGN(item.lineTotal)}`,
    );
    if (item.notes) lines.push(`  note: ${item.notes}`);
  }
  lines.push("");
  lines.push(`Subtotal: ${formatNGN(order.subtotal)}`);
  if (Number(order.deliveryFee) > 0)
    lines.push(`Delivery: ${formatNGN(order.deliveryFee)}`);
  lines.push(`Total: ${formatNGN(order.total)}`);
  if (order.notes) {
    lines.push("");
    lines.push(`Notes: ${order.notes}`);
  }
  if (order.artworkUrls && order.artworkUrls.length > 0) {
    lines.push("");
    lines.push("Artwork files:");
    for (const url of order.artworkUrls) {
      lines.push(`- ${url}`);
    }
  }
  lines.push("");
  lines.push("Please confirm and let me know next steps. Thank you!");
  return lines.join("\n");
}

export function buildWhatsappUrl(
  whatsappNumber: string,
  message: string,
): string {
  const digits = whatsappNumber.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
