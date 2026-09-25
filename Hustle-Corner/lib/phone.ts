const SA_MOBILE_RE = /^\+27[678]\d{8}$/;

/** Normalizes common South African mobile number formats to E.164 (+27XXXXXXXXX). Returns null if it doesn't look like a valid SA mobile number. */
export function normalizeSaWhatsappNumber(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, "");

  let candidate: string;
  if (digits.startsWith("+27")) {
    candidate = digits;
  } else if (digits.startsWith("0027")) {
    candidate = `+27${digits.slice(4)}`;
  } else if (digits.startsWith("27")) {
    candidate = `+${digits}`;
  } else if (digits.startsWith("0")) {
    candidate = `+27${digits.slice(1)}`;
  } else {
    return null;
  }

  return SA_MOBILE_RE.test(candidate) ? candidate : null;
}
