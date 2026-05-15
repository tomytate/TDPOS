-- Product image URI scaffold.
-- Keeps image metadata tenant-scoped with the product row; binary assets stay in
-- Supabase Storage/CDN, not Postgres.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_uri TEXT;

COMMENT ON COLUMN products.image_uri IS
  'Optional product image URI used by mobile expo-image and web catalog previews.';
