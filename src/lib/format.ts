export function inr(value: number): string {
  return "₹" + Math.round(value).toLocaleString("en-IN");
}

export function discountPct(price: number, comparePrice?: number | null): number {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}

export function deliveryEstimate(pin: string, baseDays: number): string {
  const metro = /^(11|40|56|60|70|50|38|41)/.test(pin);
  const days = baseDays + (metro ? 0 : 3);
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export function isServiceable(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

export function codAvailable(pin: string): boolean {
  return isServiceable(pin) && Number(pin[5]) % 3 !== 0;
}
