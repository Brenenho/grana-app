import * as logic from './lib/finance-logic';
import { BUCKET_CONFIG } from './types';

const txs = [
  { amount: -1030, bucket: 'fixo', type: 'despesa', category: 'Moradia' },
  { amount: -33, bucket: 'fixo', type: 'despesa', category: 'Telecom' },
  { amount: -110, bucket: 'fixo', type: 'despesa', category: 'Assinaturas' },
  { amount: -220, bucket: 'fixo', type: 'despesa', category: 'Areia' }
];

const cats = [
  { name: 'Moradia', bucket: 'fixo', monthly_limit: 1000 },
  { name: 'Mercado', bucket: 'fixo', monthly_limit: 500 },
  { name: 'Telecom', bucket: 'fixo', monthly_limit: 100 },
  { name: 'Assinaturas', bucket: 'fixo', monthly_limit: 100 },
  { name: 'Transporte', bucket: 'fixo', monthly_limit: 300 },
  { name: 'Areia', bucket: 'fixo', monthly_limit: 220 },
  { name: 'Delivery', bucket: 'livre', monthly_limit: 200 }
];

const res = logic.calcBuckets(4200, txs as any, cats as any);
console.log(res);

const totalAvail = res.reduce((s, b) => s + b.remaining, 0);
console.log("totalAvail:", totalAvail);
