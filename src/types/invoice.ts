export function invoiceTotals(amounts: string[], taxRate: string) {
  const cents = amounts.reduce((sum, amount) => {
    const value = Number(amount);
    return sum + (Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : 0);
  }, 0);
  const rate = Number(taxRate);
  const tax = Math.round(cents * (Number.isFinite(rate) ? Math.min(100, Math.max(0, rate)) : 0) / 100);
  return { subtotal: cents / 100, tax: tax / 100, total: (cents + tax) / 100 };
}
export const money = (amount: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(amount) ? amount : 0);
