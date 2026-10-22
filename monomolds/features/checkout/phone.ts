export const PHONE_COUNTRIES = [
  { code: "PL", name: "Polska", flag: "🇵🇱", callingCode: "48" },
  { code: "DE", name: "Niemcy", flag: "🇩🇪", callingCode: "49", trunkPrefix: true },
  { code: "GB", name: "Wielka Brytania", flag: "🇬🇧", callingCode: "44", trunkPrefix: true },
  { code: "CZ", name: "Czechy", flag: "🇨🇿", callingCode: "420", trunkPrefix: true },
  { code: "SK", name: "Słowacja", flag: "🇸🇰", callingCode: "421", trunkPrefix: true },
  { code: "UA", name: "Ukraina", flag: "🇺🇦", callingCode: "380", trunkPrefix: true },
  { code: "LT", name: "Litwa", flag: "🇱🇹", callingCode: "370", trunkPrefix: true },
  { code: "LV", name: "Łotwa", flag: "🇱🇻", callingCode: "371" },
  { code: "EE", name: "Estonia", flag: "🇪🇪", callingCode: "372" },
  { code: "FR", name: "Francja", flag: "🇫🇷", callingCode: "33", trunkPrefix: true },
  { code: "IT", name: "Włochy", flag: "🇮🇹", callingCode: "39" },
  { code: "ES", name: "Hiszpania", flag: "🇪🇸", callingCode: "34" },
  { code: "NL", name: "Holandia", flag: "🇳🇱", callingCode: "31", trunkPrefix: true },
  { code: "SE", name: "Szwecja", flag: "🇸🇪", callingCode: "46", trunkPrefix: true },
  { code: "NO", name: "Norwegia", flag: "🇳🇴", callingCode: "47", trunkPrefix: true },
  { code: "US", name: "Stany Zjednoczone", flag: "🇺🇸", callingCode: "1" },
] as const;

export type PhoneCountryCode = (typeof PHONE_COUNTRIES)[number]["code"];

export function isPhoneCountryCode(value: string): value is PhoneCountryCode {
  return PHONE_COUNTRIES.some((country) => country.code === value);
}

export function normalizeCheckoutPhone(countryCode: string, input: string): string | null {
  const country = PHONE_COUNTRIES.find((option) => option.code === countryCode);
  if (!country) return null;

  const trimmedInput = input.trim();
  let digits = trimmedInput.replace(/\D/g, "");
  if (trimmedInput.startsWith("+") || trimmedInput.startsWith("00")) {
    const internationalDigits = trimmedInput.startsWith("00") ? digits.slice(2) : digits;
    if (!internationalDigits.startsWith(country.callingCode)) return null;
    digits = internationalDigits.slice(country.callingCode.length);
  }
  if ("trunkPrefix" in country && country.trunkPrefix && digits.startsWith("0")) digits = digits.slice(1);

  const internationalNumber = `${country.callingCode}${digits}`;
  if (!/^\d{9,15}$/.test(internationalNumber)) return null;
  return `+${internationalNumber}`;
}
