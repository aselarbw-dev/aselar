// src/utils/phoneFormat.ts

export const SUPPORTED_COUNTRIES = {
  BW: { name: 'Botswana', dialCode: '267' },
  ZA: { name: 'South Africa', dialCode: '27' },
  ZM: { name: 'Zambia', dialCode: '260' },
  KE: { name: 'Kenya', dialCode: '254' },
  TZ: { name: 'Tanzania', dialCode: '255' },
  ZW: { name: 'Zimbabwe', dialCode: '263' },
  MW: { name: 'Malawi', dialCode: '265' },
} as const;

export type CountryCode = keyof typeof SUPPORTED_COUNTRIES;

/**
 * Converts a locally-entered phone number into E.164 format for Twilio/SMS.
 * Replaces every hardcoded "+267${number}" call site in the app.
 */
export function formatPhoneForSMS(rawNumber: string, countryCode: CountryCode): string {
  if (!rawNumber) throw new Error('Phone number is required');

  let cleaned = rawNumber.trim().replace(/[^\d+]/g, '');

  // Already E.164 (starts with +) — trust it, don't touch it
  if (cleaned.startsWith('+')) return cleaned;

  const country = SUPPORTED_COUNTRIES[countryCode];
  if (!country) throw new Error(`Unsupported country code: ${countryCode}`);

  // Strip a leading local "0" (e.g. 0670550289 -> 670550289)
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);

  return `+${country.dialCode}${cleaned}`;
}