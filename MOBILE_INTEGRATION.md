# SafePath Mobile App Integration Guide

This project is designed so **web and mobile share the same backend API + database** (like YouTube: actions on one platform reflect on the other).

## Backend endpoints (shared for web + mobile)

- **Base REST API**: `http://<server>:3001/api/v1`
- **Socket.io**: `http://<server>:3001`

All requests and responses are JSON and follow the shared pattern:

```json
{
  "success": true,
  "data": {},
  "timestamp": "2026-03-13T00:00:00.000Z",
  "request_id": "..."
}
```

Errors:

```json
{
  "success": false,
  "error": { "code": "SOME_CODE", "message": "Human readable message" },
  "timestamp": "2026-03-13T00:00:00.000Z",
  "request_id": "..."
}
```

## Authentication (JWT)

### Register

`POST /auth/register`

Body:

```json
{ "email": "user@example.com", "password": "password123", "name": "Juan Dela Cruz" }
```

### Login

`POST /auth/login`

Body:

```json
{ "email": "user@example.com", "password": "password123" }
```

### Using the access token

For protected endpoints, attach:

`Authorization: Bearer <access_token>`

### Refresh token

`POST /auth/refresh`

- **Web**: may use an httpOnly cookie called `refresh_token`
- **Mobile**: should store `refresh_token` securely (Keychain/Keystore) and send it in the request body if needed

Body (mobile-friendly):

```json
{ "refresh_token": "<refresh_token>" }
```

## Real-time updates (Socket.io)

Mobile should connect to the same Socket.io server as the web app and listen for the same events.

### Connect with token

```js
import { io } from "socket.io-client";

const socket = io("http://<server>:3001", {
  auth: { token: accessToken }
});
```

### Area subscription (bounding box)

Client → Server:

- `subscribe:area`
- `unsubscribe:area`

Payload:

```json
{ "minLat": 15.30, "maxLat": 15.35, "minLng": 119.95, "maxLng": 120.05 }
```

### Server → Client events (live sync)

These events allow web + mobile to stay consistent without polling:

- `report:new`
- `report:updated`
- `comment:new`
- `rating:new`
- `heatmap:updated`

## Main features and their endpoints

### Incident reports

- `GET /reports` (protected) — list reports (supports `minLat/maxLat/minLng/maxLng`, `severity`, `daysBack`, pagination)
- `GET /reports/:id` (protected) — report detail
- `POST /reports` (protected) — create report
- `PUT /reports/:id` (protected, owner) — update
- `DELETE /reports/:id` (protected, owner) — delete

### Comments

- `GET /reports/:id/comments` (protected)
- `POST /reports/:id/comments` (protected)

### Street safety ratings

- `POST /streets/rate` (protected)
- `GET /streets/ratings` (protected) — by area bounds
- `GET /streets/:name/stats` (protected)
- `GET /streets/:name/ratings` (protected)

### Heatmap (public read)

- `GET /heatmap/data` — heatmap points for bounds
- `GET /heatmap/high-risk-areas`

### Admin (LGU)

Admin endpoints require user role `lgu_admin` or `superadmin`:

- `GET /admin/dashboard/stats`
- `GET /admin/reports/spatial`
- `GET /admin/incidents/all`
- `PUT /admin/incidents/:id/status`

## Shared types (`@safepath/shared`)

The repo includes a shared TypeScript package:

- `packages/shared`
- Exports shared constants (endpoints, socket events), and shared types/validators.

If the mobile app uses TypeScript (React Native / Expo), it can reuse the contracts by importing from `@safepath/shared` or copying the generated types.

### Build note

The shared package outputs compiled files to `packages/shared/dist/`.
If you see errors like “cannot find `dist/index.js`”, run:

```bash
cd packages/shared
pnpm build
```

