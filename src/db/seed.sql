-- Money Path — seed idempotente del catálogo de monedas (Etapa 3).
-- Ejecutar después de `npx drizzle-kit push`:
--   psql "$DATABASE_URL" -f src/db/seed.sql

INSERT INTO currencies (code, name, symbol, decimals, is_active) VALUES
  ('MXN', 'Peso mexicano',        '$',  2, true),
  ('BRL', 'Real brasileño',       'R$', 2, true),
  ('COP', 'Peso colombiano',      '$',  0, true),
  ('CLP', 'Peso chileno',         '$',  0, true),
  ('ARS', 'Peso argentino',       '$',  2, true),
  ('PEN', 'Sol peruano',          'S/', 2, true),
  ('USD', 'Dólar estadounidense', 'US$', 2, true)
ON CONFLICT (code) DO NOTHING;
