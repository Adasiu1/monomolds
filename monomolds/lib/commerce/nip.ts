export function normalizePolishNip(value: string) {
  return value.toUpperCase().replace(/^PL/, "").replace(/[\s-]/g, "");
}

export function isValidPolishNip(value: string) {
  const nip = normalizePolishNip(value);
  if (!/^\d{10}$/.test(nip)) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  return weights.reduce((sum, weight, index) => sum + weight * Number(nip[index]), 0) % 11 === Number(nip[9]);
}

