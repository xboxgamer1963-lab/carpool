// Strip everything but digits so tel: and wa.me links are well-formed.
export function digitsOnly(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

export function telHref(phone: string): string {
  return `tel:+${digitsOnly(phone)}`;
}

export function whatsappHref(phone: string, message?: string): string {
  const base = `https://wa.me/${digitsOnly(phone)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
