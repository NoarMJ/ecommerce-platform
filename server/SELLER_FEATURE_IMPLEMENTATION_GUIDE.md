# Seller Feature Implementation Guide

This guide is a step-by-step path for building the seller marketplace feature in this repository. Work one phase at a time, commit each finished phase, and do not deploy a database migration to production until it has been applied and checked in a development database.

## Current project state

The Prisma schema and migration for the seller database foundation have been added:

- `prisma/schema.prisma` defines seller statuses and account types, a `SellerProfile` linked to a user, optional seller ownership on products and order items, and the shop-name snapshot on order items.
- `prisma/migrations/20261113120000_seller_marketplace/migration.sql` creates the seller profile table and adds nullable seller fields to existing product/order-item tables.
- `npx prisma validate` passed.
- The migration has **not** been applied to Neon or another database. Schema validation does not alter a database.

The `User.role` enum remains `customer` / `admin`. A seller is an existing user with a seller profile, so one account can shop and sell. Do not add a `seller` role unless a later authorization design has a specific reason to replace this model.

## Agreed product rules

- Seller applications start as `pending`; the possible statuses are `pending`, `approved`, `rejected`, and `suspended`.
- Seller type is `individual` or `company`.
- Seller permits are outside this MVP.
- Buyers do not need to see the seller’s name. The product page can show an “Approved Seller” badge based on the current seller status.
- A product belongs to at most one seller. Existing products can have no seller (`sellerId = null`) and remain valid.
- An order item stores its seller and the shop name at purchase time so later shop-name edits do not rewrite order history.
- The server, not just the UI, must enforce seller ownership and seller approval.

## Phase 1: Apply and inspect the development migration

Use a development database or a separate Neon development branch. First verify privately that the server `.env` points to that development database. Do not paste database URLs or secrets into chat or commit them.

From the server directory:

```powershell
npx prisma format
npx prisma validate
npx prisma migrate status
npx prisma migrate dev
npx prisma generate
```

`migrate dev` should apply the already-created seller migration to the development database. It may ask to reset a database if it detects migration history drift. Do not approve a reset until you know the database contains no data you need; stop and investigate the drift instead.

After a successful migration, inspect the database and confirm:

- `seller_profiles` exists.
- `products.sellerId` exists and accepts `NULL` for legacy products.
- `order_items.sellerId` and `order_items.sellerShopNameAtPurchase` exist and accept `NULL` for legacy orders.
- Prisma reports the migration as applied with `npx prisma migrate status`.

Do not use `prisma db push` for this tracked project migration. Keep schema changes represented by checked-in migration files.

## Phase 2: Implement seller application backend

Follow the existing backend structure: route -> controller -> service -> repository. Suggested files are:

- `routes/sellerRoutes.js`
- `controllers/sellerController.js`
- `services/seller.service.js`
- `repositories/seller.repository.js`
- Update `server.js` to mount the seller router.

Start with authenticated seller application operations:

- Submit an application for the currently authenticated user.
- Read the current user’s application/profile and status.
- Update allowed shop details while pending, with rules for which fields can change after approval.

Validate all submitted data on the server. Enforce the chosen minimum age from `dateOfBirth`; do not rely on a browser check. Email and phone already belong to the user account, so verify whether the application should reuse those fields or require verified contact details before accepting applications. A user must not be able to create multiple seller profiles for the same account.

For the first MVP pass, keep pending sellers on an application-status page. Do not let them publish products. Decide explicitly before implementation if pending applicants should be allowed to save unpublished drafts; the current product schema has no separate draft/publication status.

## Phase 3: Implement admin seller review

Extend the existing admin route/controller/service pattern rather than creating a second admin system. Add admin-only operations to:

- List and search seller profiles, with status filters.
- Read an application’s details.
- Approve or reject a pending application.
- Suspend an approved seller and reactivate a suspended seller if policy allows.

On review, update the seller status, `reviewedAt`, and `reviewedById`. Store a rejection reason when rejecting. Check permissions on the server using the project’s existing admin authorization middleware. Do not allow an applicant to approve their own profile.

Decide whether rejected applicants may edit and resubmit the same profile or need an explicit resubmission action. Keep that behavior consistent in the API and UI.

## Phase 4: Add seller-owned product operations

Update the existing product service/repository and routes so an approved seller can:

- List only their own products.
- Create a product linked to their seller profile.
- Edit or deactivate only products they own.

Never accept a trusted `sellerId` from the request body. Derive it from the authenticated user’s approved seller profile. Return forbidden/not found for attempts to change another seller’s product. Keep admin product management working for existing products with no seller.

Update public product queries so:

- Existing platform products with no seller remain visible under current rules.
- Seller-owned products are visible only when active and their seller profile is approved.
- Suspended or unapproved sellers’ products are not returned to buyers.

The “Approved Seller” badge should come from the returned seller approval state or a server-computed boolean, never from a seller-editable product field.

## Phase 5: Preserve seller information on orders

Update order creation so each new order item copies the product’s seller profile ID and current shop name into `sellerId` and `sellerShopNameAtPurchase` in the same transaction that creates the order. Keep both fields nullable for existing platform products.

Add seller order queries that return only order items belonging to the logged-in seller. Return only customer and delivery details needed to fulfill those items. Do not give sellers access to a customer’s unrelated orders or other sellers’ items in a multi-seller order.

Admin order views can use the seller links to trace which seller supplied each item. Customer order history should continue to work for legacy and seller-owned items.

## Phase 6: Build the frontend journeys

Use the existing React Router, Material UI, and RTK Query setup. Suggested pages:

- Public `SellerLandingPage` linked from the homepage “Become a seller” call to action.
- Authenticated `SellerApplicationPage` for contact/age, shop details, and final review.
- `SellerApplicationStatus` for pending/rejected/suspended states.
- A seller dashboard with overview, products, product form, orders, and shop profile sections.
- Admin dashboard Customers and Sellers sections, with the seller review actions.
- `ApprovedSellerBadge` on product details only when the server reports an approved seller.

Add route guards for authenticated seller pages and approved-seller actions. A route guard improves navigation but is not security by itself; the backend checks remain mandatory. Handle loading, empty, validation, permission, and server-error states on every page.

## Phase 7: Verify behavior

Add unit coverage for seller rules and API/end-to-end coverage for the full workflow. At minimum verify:

- A customer can submit one seller application and starts pending.
- Underage or invalid applications are rejected by server validation.
- A seller cannot approve themselves or access another seller’s products/orders.
- Pending/rejected/suspended sellers cannot publish products.
- An approved seller can manage only their own products.
- Public catalog hides products from unapproved/suspended sellers and shows the approved badge for approved sellers.
- New order items preserve seller ID and shop-name snapshot.
- A seller sees only their own items from multi-seller orders.
- Existing products/orders with null seller fields still work.
- Admin customer, product, category, order, and administrator-account functionality still works.

Run checks from the project root (or the corresponding package directory):

```powershell
npm --prefix client run lint
npm --prefix client test
npm --prefix client run build
npm --prefix server run lint
npm --prefix server test
npm --prefix server run test:e2e
```

Also manually test in a browser: customer registration/login, application submission, admin approval, seller product creation/editing, buyer product page/badge, checkout, order history, and seller order visibility. Test rejected and suspended states as well as the happy path.

## Phase 8: Commit and deploy safely

Use a feature branch and make small commits, for example:

```text
feat(db): add seller profile and order ownership fields
feat(api): add seller application and approval workflow
feat(api): scope seller products and orders by owner
feat(ui): add seller application and dashboard pages
test(seller): cover approval and ownership rules
```

Push and wait for the GitHub Actions checks to pass. Apply the migration to a staging/development Neon branch first and verify the app against it. Only then apply it to production Neon.

In production, use `npx prisma migrate deploy` with the Render service’s production database environment, or configure it as a deployment migration step. `migrate deploy` applies checked-in migrations; it does not generate a migration. Ensure it runs before new server code relies on the new fields. Do not run `migrate dev` against production, and never commit `.env` files or production URLs.

After deployment, verify the migration status, seller application creation, admin approval, catalog visibility, order snapshots, logs, and existing customer/admin flows.

## Personal development loop

For every phase:

1. Write down the expected behavior and the files likely to change.
2. Read the existing route/service/page that owns similar behavior.
3. Make one small, focused change.
4. Validate the schema or run the relevant checks.
5. Inspect the diff and confirm no secrets, unrelated formatting, or accidental files were added.
6. Commit with a message describing the layer and behavior.
7. Move to the next phase only after the current acceptance checks pass.

When asking for review, share the phase, intended behavior, changed file list or diff, commands run and results, and any error text. Never include passwords, JWT secrets, database URLs, Cloudinary secrets, or M-Pesa credentials.
