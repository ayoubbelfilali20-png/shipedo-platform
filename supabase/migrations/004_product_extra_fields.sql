-- Extra fields for the simplified product form
alter table if exists public.products
  add column if not exists product_link text,
  add column if not exists code text,
  add column if not exists variant_code text,
  add column if not exists product_video_link text;

-- Make pricing/stock optional so the simplified form works
alter table if exists public.products
  alter column buying_price drop not null,
  alter column selling_price drop not null;
