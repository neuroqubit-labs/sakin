-- Tenant bazında charge/payment/net mutabakatı
SELECT
  tenant_id,
  SUM(CASE WHEN entry_type = 'CHARGE' THEN amount ELSE 0 END) AS total_charge,
  SUM(CASE WHEN entry_type IN ('PAYMENT','REFUND','WAIVER','ADJUSTMENT') THEN amount ELSE 0 END) AS total_payment_and_adjustment,
  SUM(amount) AS net_balance
FROM ledger_entries
GROUP BY tenant_id
ORDER BY tenant_id;

-- Duplicated webhook event kontrolü
SELECT tenant_id, provider, event_id, COUNT(*)
FROM payment_provider_events
GROUP BY tenant_id, provider, event_id
HAVING COUNT(*) > 1;

-- Tenant-safe provider payment reference duplicate kontrolü
SELECT tenant_id, provider, provider_payment_id, COUNT(*)
FROM payments
WHERE provider_payment_id IS NOT NULL
GROUP BY tenant_id, provider, provider_payment_id
HAVING COUNT(*) > 1;

-- Daire dönem duplicate dues kontrolü
SELECT unit_id, period_month, period_year, COUNT(*)
FROM dues
GROUP BY unit_id, period_month, period_year
HAVING COUNT(*) > 1;
