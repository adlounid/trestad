export function normalizePersonalNumber(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidPersonalNumber(value: string): boolean {
  const normalized = normalizePersonalNumber(value);
  if (normalized.length !== 12) return false;
  const datePart = normalized.slice(0, 8);
  const year = Number.parseInt(datePart.slice(0, 4), 10);
  const month = Number.parseInt(datePart.slice(4, 6), 10);
  const day = Number.parseInt(datePart.slice(6, 8), 10);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return false;
  const luhnInput = normalized.slice(2);
  const sum = [...luhnInput].reduce((total, digit, index) => {
    const valueToAdd = Number.parseInt(digit, 10) * (index % 2 === 0 ? 2 : 1);
    return total + (valueToAdd > 9 ? valueToAdd - 9 : valueToAdd);
  }, 0);
  return sum % 10 === 0;
}
