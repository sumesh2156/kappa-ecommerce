# KAPPA Admin Panel - Setup

## What was added
- Protected `admin.html` dashboard.
- Add, edit and delete products.
- Product image by URL or image file (max 5 MB).
- Exact stock quantity and Out of Stock display.
- Cart quantity capped by available stock.
- Checkout validates stock inside a MySQL transaction and automatically reduces stock.
- Admin order list with status updates.
- Admin registered-user list (passwords are never returned).
- Product deletion is a safe soft-delete, so old order history is preserved.

## IMPORTANT: before deploying
1. Back up the database if desired.
2. Connect to Railway MySQL and run the contents of `backend/admin_migration.sql` ONCE.
3. In the Railway backend service Variables, add:
   `ADMIN_EMAIL=your-existing-registered-kappa-email@example.com`
   This must be an email that is already registered on KAPPA and has a password.
4. Deploy the updated backend and frontend.
5. Open `/admin.html` on the frontend website and sign in with that KAPPA account's email/password.

## Local admin testing
- Backend: from `backend`, run `npm install` then `node server.js` (requires your `.env` DB variables).
- Frontend: serve the project on localhost. `admin.js` automatically uses `http://localhost:5000` when opened on localhost.

## Image note
Uploaded image files are converted to data URLs and stored in the MySQL `image` LONGTEXT column. This avoids Railway's ephemeral filesystem. For a larger production store, use object storage/CDN instead.

## Do not run migration twice
The migration adds `stock` and `is_active`; running the exact ALTER twice will produce duplicate-column errors.
