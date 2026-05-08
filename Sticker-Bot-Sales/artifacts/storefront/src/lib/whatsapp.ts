export function whatsappUrl(phoneE164Digits: string, text: string): string {
  const phone = phoneE164Digits.replace(/\D/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
