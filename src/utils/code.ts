export function generateCode(len = 8) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // exclude ambiguous chars
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}