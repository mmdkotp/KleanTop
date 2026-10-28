# KLEANTOP storefront (Part 1)
`npm install && npm run dev`. Copy `.env.example` to `.env` to enable Supabase (anon key only). Without it the store runs on DEMO data and **orders are not saved** (checkout shows an error).
Business rules (shipping, coupons) live in `src/lib/config.js`; demo products in `src/data/products.js`.
