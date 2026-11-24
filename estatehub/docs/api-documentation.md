# EstateHub API Documentation

Base URL (development): `http://localhost:5000/api` (the React dev server also proxies it at `http://localhost:5173/api`).

All responses use this shape:

```json
{ "success": true, "message": "OK", "data": { } }
{ "success": false, "message": "What went wrong", "errors": { "price": "Price must be greater than 0." } }
```

Authentication uses an **HTTP-only cookie** (`estatehub_token`) set by login/register. Browser requests must send credentials (`credentials: 'include'`). Passwords are hashed with bcrypt (bcryptjs) and never returned.

Status codes: `200` ok, `201` created, `400` validation error, `401` not logged in, `403` not allowed, `404` not found, `409` conflict, `429` too many attempts.

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | none | API + MySQL check |

## Authentication (rate limited: 20 requests / 15 min)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | none | Create a client or broker account and log in |
| POST | `/auth/login` | none | Log in |
| POST | `/auth/logout` | none | Clear the cookie |
| GET | `/auth/me` | any user | Current user (+ `brokerProfile` for brokers) |
| PATCH | `/auth/me` | any user | Update own name, phone and (brokers) company, bio, service areas |

`POST /auth/register` body:

```json
{ "fullName": "Rahim Uddin", "email": "rahim@example.com", "password": "Secret123",
  "role": "broker", "phone": "01700000000", "companyName": "Rahim Realty" }
```

`role` can only be `client` or `broker`. Sending `admin` returns `400`. Admins are created directly in the database.
`PATCH /auth/me` rejects unknown fields (for example `role`) with `400`.

Success response (register/login):

```json
{ "success": true, "message": "Logged in.",
  "data": { "user": { "id": 2, "fullName": "Rahim Uddin", "email": "rahim@example.com", "phone": null, "avatarUrl": null, "role": "broker" } } }
```

## Properties

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/properties` | none | Search approved + available listings |
| GET | `/properties/locations` | none | City/area pairs that have listings, with counts |
| GET | `/properties/mine` | broker | The broker's own listings (all statuses, includes private address) |
| GET | `/properties/:id` | optional | Details, images, similar listings. Unapproved listings are only visible to the owner and admins (others get `404`) |
| POST | `/properties` | broker | Create a listing (starts as `pending`) |
| PATCH | `/properties/:id` | owner broker or admin | Update fields. Editing public fields of an approved listing sets it back to `pending` |
| DELETE | `/properties/:id` | owner broker or admin | Delete listing and its images |
| POST | `/properties/:id/images` | owner broker or admin | Upload images (multipart field `images`, JPG/PNG/WebP, 5 MB each, max 12 per listing) |
| PATCH | `/properties/:id/images/:imageId/primary` | owner broker or admin | Set the main photo |
| DELETE | `/properties/:id/images/:imageId` | owner broker or admin | Remove a photo |

`GET /properties` query parameters (all optional): `q` (keyword), `city`, `area`, `category` (`land|apartment|house|commercial`), `purpose` (`sale|rent`), `minPrice`, `maxPrice`, `minSize`, `maxSize`, `bedrooms` (minimum), `sort` (`newest|price_asc|price_desc`), `page` (default 1), `limit` (default 12, max 50).

Example: `GET /properties?area=Uttara&category=apartment&purpose=sale&maxPrice=8000000&sort=price_asc`

```json
{ "success": true, "message": "OK", "data": {
  "items": [ { "id": 1, "title": "Modern 3-Bed Apartment in Uttara", "category": "apartment", "purpose": "sale",
               "price": 7500000, "currency": "BDT", "size": 1450, "sizeUnit": "sqft", "bedrooms": 3, "bathrooms": 3,
               "city": "Dhaka", "area": "Uttara", "approvalStatus": "approved", "availabilityStatus": "available",
               "isDemo": true, "primaryImage": "https://...", "createdAt": "...",
               "broker": { "id": 2, "name": "Rahim Uddin (Demo)", "avatarUrl": null, "companyName": "Demo Realty Ltd.", "verified": true } } ],
  "pagination": { "page": 1, "limit": 12, "total": 1, "totalPages": 1 } } }
```

`POST /properties` body:

```json
{ "title": "Modern 3-Bed Apartment", "description": "At least 20 characters of description.",
  "category": "apartment", "purpose": "sale", "price": 7500000, "size": 1450,
  "bedrooms": 3, "bathrooms": 2, "city": "Dhaka", "area": "Uttara", "addressLine": "optional private address" }
```

Notes:
- The public response never includes `addressLine`. Only the owner and admins receive it.
- Land cannot have bedrooms/bathrooms.
- `similar` (in `GET /properties/:id`) uses a transparent rule: same category and purpose, price within ±40%, same area first, then same city, then closest price.

## Brokers (public)

Only brokers whose verification status is `approved` and whose account is active are returned. Email, phone and password data are never included.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/brokers` | none | Verified brokers. Query: `q` (name/company), `area` (service area), `page`, `limit` (max 50) |
| GET | `/brokers/:id` | none | One broker with `listings` (approved + available), `reviews` (visible) and `ratingBreakdown` |
| GET | `/brokers/:id/reviews` | none | Paginated visible reviews + `summary` `{average, count, breakdown{1..5}}`. Query `page`, `limit` (max 50). 404 if the broker is not verified |

Each broker has `averageRating` (null when there are no reviews), `reviewCount` and `activeListings`, all computed from the database.

## Public homepage data

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/public/stats` | none | Real counts: `activeListings`, `verifiedBrokers`, `byCategory`, and `topAreas` (areas ordered by active listing count, with a photo from a listing) |
| GET | `/public/reviews/recent?limit=3` | none | Latest visible reviews. Demo reviews have `"isDemo": true` so the UI labels them as sample content |

More endpoints (comments, messages, favorites, reviews, notifications, admin, AI) are added in later phases.

## Phase 4 – Interaction (all responses use `{success, message, data}`)

### Comments (public on a listing)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/comments?propertyId=&page=&limit=` | optional | Visible comments on an approved listing. Each has `canEdit` / `canDelete` for the viewer |
| POST | `/comments` | client, or the listing's broker | `{propertyId, body}`. Max 1000 chars. Same text within 60 s gives 409. Notifies the broker (bell + email) |
| PATCH | `/comments/:id` | author | `{body}`. 403 if a moderator hid it |
| DELETE | `/comments/:id` | author, or admin (audit logged) | |
| GET | `/comments/mine` | broker | Comments on my listings. Opening it clears `new_comment` notifications |

### Favorites (clients only)
| GET | `/favorites` | client | Saved properties still public |
|---|---|---|---|
| GET | `/favorites/ids` | client | Ids only (used for the hearts) |
| POST | `/favorites` | client | `{propertyId}`. Saving twice is harmless |
| DELETE | `/favorites/:propertyId` | client | |

### Private messages
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/conversations` | client, broker | My conversations + `unreadTotal` |
| POST | `/conversations` | client | `{propertyId` or `brokerId, body}`. Reuses an existing conversation. Only verified, active brokers |
| GET | `/conversations/:id` | participant | Thread (latest 200). Strangers get 404. Admins read-only, logged in `audit_logs` |
| POST | `/conversations/:id/messages` | participant | `{body}` max 2000 chars |
| POST | `/conversations/:id/read` | participant | Marks the other side's messages as read |

Clients appear to others as "First L.". Only the first unread message from a sender creates a bell entry and an email; emails never contain message text.

### Reviews and ratings (clients)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/reviews/eligibility/:brokerId` | client | `{eligible, review}`. Eligible once the client has messaged the broker |
| POST | `/reviews` | client | `{brokerId, rating 1-5, body 10-1000 chars}`. One per broker (409 on repeat) |
| PATCH | `/reviews/:id` | author | 403 if hidden by a moderator |
| DELETE | `/reviews/:id` | author | |

### Notifications
| GET | `/notifications?limit=` | any | `{items, unreadCount}` |
|---|---|---|---|
| POST | `/notifications/:id/read` | owner | |
| POST | `/notifications/read-all` | any | |

## Phase 5 – EstateAI (public, rate limited to 20 messages per minute per IP)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/ai/status` | none | `{mode: "llm" \| "rules"}`. Says whether smart mode (LLM key) is on. Never returns keys or provider details |
| POST | `/ai/chat` | none | Body `{message (1-500 chars), context?, apply?}`. `context` is the `filters` object of the previous answer, used for follow-ups; it is cleaned again on the server. `apply: true` means the context holds exact filters from a suggestion button, so the server searches with them directly |

`POST /ai/chat` returns:

```json
{
  "intent": "search | stats | areas | count | brokers | convert | faq | greeting | thanks | bye | advice | reset | other",
  "mode": "rules | llm",
  "reply": "I found 2 listings for ...",
  "filters": { "purpose": "rent", "city": "Dhaka", "area": "Mirpur", "maxPrice": 30000 },
  "listings": [ { "id": 2, "title": "...", "price": 28000, "...": "same public shape as GET /properties" } ],
  "total": 2,
  "relaxed": [],
  "brokers": [],
  "suggestions": ["Cheapest first", { "label": "Same in Mirpur (3)", "filters": { "area": "Mirpur", "city": "Dhaka" } }, "Start over"],
  "searchPath": "/properties?purpose=rent&city=Dhaka",
  "link": null
}
```

Rules: only approved and available listings are returned; no email, phone or address fields exist in the response; when nothing matches, `listings` is empty, the reply starts with "Sorry" and `suggestions` holds real alternatives as `{label, filters}` objects (send one back with `apply: true`); `relaxed` is kept for compatibility and is always empty; `brokers` holds `{id, name, companyName, listings, averageRating, reviewCount}` for broker questions; invalid bodies (empty, over 500 characters, unknown fields) return 400.

## Phase 6 – Reports and admin

### Reports (any logged-in user, 30 writes per minute per IP)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/reports` | any logged-in user | Body `{targetType: property\|comment\|review\|user, targetId, reason (10-500 chars)}`. 404 if the item is missing or not public, 400 for your own content, 409 if you already have an open report on it. `user` means a broker. |

### Admin (all routes: `requireAuth` + role `admin`, otherwise 401/403)

List endpoints accept `page` and `limit` (max 50) and return `{items, total, page, limit, pages}`.

| Method | Path | Description |
|---|---|---|
| GET | `/admin/stats` | Counters and the 5 latest audit entries |
| GET | `/admin/properties?status=` | Listings by approval status (pending first) |
| POST | `/admin/properties/:id/approve` | Approve, notify the broker, audit `approve_listing` |
| POST | `/admin/properties/:id/reject` | Body `{reason}` (5-500). Notify the broker, audit `reject_listing` |
| GET | `/admin/brokers?status=` | Broker verification queue |
| POST | `/admin/brokers/:id/verify` | Verify, notify, audit `verify_broker` |
| POST | `/admin/brokers/:id/reject` | Optional body `{reason}`. Audit `reject_broker` |
| GET | `/admin/users?role=&status=&q=` | Search users |
| PATCH | `/admin/users/:id/status` | Body `{status: active\|suspended}`. Cannot target yourself or an admin. Suspended users are blocked at login and on every request. Audit `suspend_user` / `activate_user` |
| GET | `/admin/comments?status=` / `/admin/reviews?status=` | Moderation lists |
| PATCH | `/admin/comments/:id/status` / `/admin/reviews/:id/status` | Body `{status: visible\|hidden}`. Hiding notifies the author (no text copied) and audits `hide_*` / `unhide_*` |
| GET | `/admin/reports?status=&targetType=` | Report queue with a short preview of each target |
| PATCH | `/admin/reports/:id` | Body `{status: resolved\|dismissed}`. Sets `handled_by`, audit `report_resolved` / `report_dismissed` |
| GET | `/admin/audit-logs?action=` | Newest first. Includes `view_conversation` entries from admin read-only access |
