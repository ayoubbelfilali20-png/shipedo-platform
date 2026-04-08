-- Per-seller token used by Google Apps Script to push new rows from a Sheet
alter table public.sellers
  add column if not exists sheet_ingest_token text unique;

create index if not exists sellers_sheet_ingest_token_idx
  on public.sellers (sheet_ingest_token);
