// utility/currencies.ts
import { getCurrency } from './currencies';

// For values already stored as integer minor units (e.g. thebe in the referral system)
export function formatCurrency(amountInMinorUnits: number, currencyCode?: string): string {
  const { code, locale } = getCurrency(currencyCode);
  const amount = amountInMinorUnits / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    currencyDisplay: 'symbol',
  }).format(amount);
}

// NEW — for values already stored as decimal (e.g. receipt.subtotal = 45.50)
export function formatDecimalCurrency(amount: number, currencyCode?: string): string {
  const { code, locale } = getCurrency(currencyCode);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    currencyDisplay: 'symbol',
  }).format(amount);
}