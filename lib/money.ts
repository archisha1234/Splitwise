export function formatINR(paise: number | bigint) {
  const amount = typeof paise === "bigint" ? Number(paise) : paise;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount / 100);
}

export function parseMoneyToPaise(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  return Number.parseInt(whole, 10) * 100 + Number.parseInt((fraction + "00").slice(0, 2), 10);
}

export function generateInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export function toDateInputValue(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
