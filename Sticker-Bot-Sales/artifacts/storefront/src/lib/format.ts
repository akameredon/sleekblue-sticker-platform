export function formatNGN(amount: number | string | undefined | null): string {
  if (amount == null) return "₦0";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "₦0";
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}

export function formatNumber(n: number | string | undefined | null): string {
  if (n == null) return "0";
  const v = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(v)) return "0";
  return v.toLocaleString("en-NG");
}
