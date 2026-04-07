CREATE OR REPLACE FUNCTION ledger_entries_append_only_guard()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entries is append-only';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ledger_entries_no_update ON ledger_entries;
CREATE TRIGGER trg_ledger_entries_no_update
BEFORE UPDATE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION ledger_entries_append_only_guard();

DROP TRIGGER IF EXISTS trg_ledger_entries_no_delete ON ledger_entries;
CREATE TRIGGER trg_ledger_entries_no_delete
BEFORE DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION ledger_entries_append_only_guard();
