import assert from 'node:assert/strict';
import { invoiceTotals, money } from '../src/types/invoice.ts';

assert.deepEqual(invoiceTotals(['1000.10', '', '0.20'], '7.5'), { subtotal: 1000.3, tax: 75.02, total: 1075.32 });
assert.deepEqual(invoiceTotals(['0.1', '0.2'], '0'), { subtotal: 0.3, tax: 0, total: 0.3 });
assert.deepEqual(invoiceTotals([], '0'), { subtotal: 0, tax: 0, total: 0 });
assert.deepEqual(invoiceTotals(['100'], '100'), { subtotal: 100, tax: 100, total: 200 });
assert.ok(money(1000.1).includes('1,000.10'));
console.log('PASS: invoice currency rounding, tax, empty rows, and NGN formatting.');
