const BUCKET_CONFIG = {
  fixo: { pct: 0.50 },
  reserva: { pct: 0.10 },
  empreendedor: { pct: 0.15 },
  livre: { pct: 0.25 },
};

const buckets = Object.keys(BUCKET_CONFIG).map((bucket) => {
  const cfg = BUCKET_CONFIG[bucket];
  const salary = 4200;
  const total = Math.round(salary * cfg.pct);
  let txSpent = 0;
  if (bucket === "fixo") txSpent = 1393;
  
  let projected = Math.round(txSpent);
  if (bucket === "fixo") {
    projected = 1893;
  } else {
    projected = Math.round(txSpent);
  }

  const remaining = Math.max(0, total + 0 - 0 - projected);
  return { bucket, remaining };
});

console.log(buckets);
console.log("Total:", buckets.reduce((acc, b) => acc + b.remaining, 0));
