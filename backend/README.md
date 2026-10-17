# سوق الجمعة - Backend

Express API in `backend/`, separate from the Vite frontend in `../frontend`.
It uses the existing Supabase PostgreSQL tables, Supabase Auth users, and SQL
functions; it does not create a parallel database or seed sample data.

## Requirements

- Node.js 18 or newer
- The existing Supabase project with the migrations in
  `../frontend/supabase/migrations` applied
- Cloudinary credentials for new image uploads (existing Supabase image URLs remain readable)

Copy `.env.example` to `.env` and set the existing Supabase project URL and
service-role key, plus Cloudinary credentials when image uploads are enabled.
Never expose the service-role or Cloudinary secrets to the browser. Set
`FRONTEND_ORIGIN` to the deployed frontend origin; the local Vite origin
`http://localhost:5173` is always allowed. Multiple origins may be comma-separated.

## Run

```sh
npm ci
npm run dev
```

The API listens on `http://localhost:3001` by default; production uses Render's
`PORT`. `GET /health` checks process health. Run the frontend separately from
`../frontend` with `npm run dev`. Vite proxies `/api` requests to this server
during development.

Run the backend tests with `npm test`; Render starts the service with `npm start`.

## Data and security notes

PostgreSQL remains the source of truth: `profiles`, `ads`, `favorites`,
`reports`, and `feedback` are not recreated or migrated. Existing Supabase Auth
accounts are reused. The API replaces the existing auth/admin Edge Function
routes and direct frontend table/storage requests. Requests with a user token
are verified with Supabase Auth; ad ownership and admin role are checked by the
API because the server's service-role client bypasses RLS. Keep the existing
RLS policies enabled as defense in depth for other clients.

The existing SQL migrations and the `increment_views` database function remain
in `../frontend/supabase/migrations`; keep them applied. The public `ad-images`
bucket and its policies are retained so already-stored image URLs continue to
work. New uploads use Cloudinary and require the Cloudinary environment values.
The seven-day ad expiry is preserved on create and renew.
The authenticated upload API accepts up to five JPEG, PNG, WebP, or GIF images
of at most 8 MiB each. Cloudinary uploads are stored in per-user folders and
removed when their ad is deleted; existing Supabase image URLs are left intact.
