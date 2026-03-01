export function maskEmail(email: string | null | undefined) {
  if (!email) return "";

  const [local, domain] = email.split("@");
  if (!local || !domain) return email;

  if (local.length <= 2) {
    return `${local[0] || "*"}*@${domain}`;
  }

  const visibleStart = local.slice(0, 2);
  return `${visibleStart}${"*".repeat(Math.max(2, local.length - 2))}@${domain}`;
}

export function normalizeSearchTerm(raw: string) {
  return raw
    .replace(/[\r\n\t]/g, " ")
    .replace(/[%_]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
