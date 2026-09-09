export interface Currency {
  code: string;
  symbol: string;
  name: string;
  locale: string;
  country: string;
}

export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'BWP', symbol: 'P',  name: 'Botswana Pula',        locale: 'en-BW', country: 'Botswana' },
  { code: 'ZMW', symbol: 'K',  name: 'Zambian Kwacha',       locale: 'en-ZM', country: 'Zambia' },
  { code: 'ZAR', symbol: 'R',  name: 'South African Rand',   locale: 'en-ZA', country: 'South Africa' },
  { code: 'NAD', symbol: 'N$', name: 'Namibian Dollar',      locale: 'en-NA', country: 'Namibia' },
  { code: 'USD', symbol: '$',  name: 'US Dollar (Zimbabwe)', locale: 'en-ZW', country: 'Zimbabwe' },
];

export const DEFAULT_CURRENCY = 'BWP';

export const getCurrency = (code?: string): Currency =>
  SUPPORTED_CURRENCIES.find(c => c.code === code) ??
  SUPPORTED_CURRENCIES.find(c => c.code === DEFAULT_CURRENCY)!;