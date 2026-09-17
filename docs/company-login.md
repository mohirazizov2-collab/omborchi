# Company login system

This application uses a company-specific address for sign-in:

`https://app.omborchi-ai.uz/farrux-mebel`

The slug is resolved on the server from the `companies` collection. The browser never submits a trusted `company_id`; the login API derives it from the slug, then searches `users` only within that company.

## Firestore collections

`companies/{id}`

```ts
{ id, name, slug, status: "active" | "inactive" }
```

`users/{id}`

```ts
{ id, company_id, username, password_hash, role, status: "active" | "blocked", created_at }
```

`password_hash` is bcrypt (12 rounds) and is intentionally blocked from all browser Firestore reads by `firestore.rules`.

## Configuration

Copy the server variables in `.env.example` into `.env.local`. Use a Firebase service-account credential and a unique `SESSION_SECRET` of at least 32 characters. These values must never use the `NEXT_PUBLIC_` prefix.

## Create the initial company login

For the requested local test account, place these values in `.env.local`:

```env
SEED_COMPANY_SLUG=farrux-mebel
SEED_COMPANY_NAME=Farrux Mebel
SEED_USERNAME=admin
SEED_PASSWORD=123456
```

Then run:

```powershell
npm.cmd run seed:company-login
```

The script creates/updates the company and a bcrypt-hashed user. In local development it defaults to the requested `admin / 123456` credentials if `SEED_PASSWORD` is omitted. Change the initial password immediately in any non-test deployment.

## Security behavior

- Successful login sets an 8-hour signed, `HttpOnly`, `SameSite=Lax` session cookie; in production it is also `Secure`.
- The cookie payload contains only `user_id`, `company_id`, `role`, and expiry.
- The session endpoint validates that the session company matches the URL slug.
- Login attempts are rate-limited after five failed attempts per IP and company for 15 minutes.
- Passwords are not logged or returned by any API.
