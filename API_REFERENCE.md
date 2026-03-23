# SafePath API Reference

**Base URL:** `http://localhost:3001/api/v1`

---

## Authentication

### Register New User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username123",
  "password": "securepassword",
  "fullName": "John Doe"
}

Response 201:
{
  "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refreshToken": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "username123",
    "fullName": "John Doe",
    "role": "user",
    "createdAt": "2024-03-13T10:30:00Z",
    "updatedAt": "2024-03-13T10:30:00Z"
  }
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}

Response 200:
{
  "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refreshToken": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": { ... }
}
```

### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

Response 200:
{
  "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer <accessToken>

Response 200:
{
  "user": { ... }
}
```

### Logout
```http
POST /auth/logout
Authorization: Bearer <accessToken>

Response 200:
{
  "message": "Logged out successfully"
}
```

---

## Incidents

### List Incidents
```http
GET /incidents?lat=15.4&lon=120.0&radius=5&category=accident&severity=high&limit=20&page=1
Authorization: Bearer <accessToken>

Query Parameters:
  - lat (number): latitude
  - lon (number): longitude
  - radius (number): search radius in km
  - category (string): filter by category
  - severity (string): filter by severity
  - limit (number): results per page (default: 20)
  - page (number): page number (default: 1)

Response 200:
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Traffic Accident on Main Street",
      "description": "Multi-vehicle collision blocking traffic",
      "category": "accident",
      "severity": "high",
      "location": {
        "type": "Point",
        "coordinates": [120.0, 15.4]
      },
      "geohash": "ww8p7",
      "sentimentScore": -0.75,
      "createdAt": "2024-03-13T10:30:00Z",
      "updatedAt": "2024-03-13T10:30:00Z",
      "resolvedAt": null
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "hasMore": true
}
```

### Get Incident Details
```http
GET /incidents/{id}
Authorization: Bearer <accessToken>

Response 200:
{
  "incident": { ... },
  "comments": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "userId": "550e8400-e29b-41d4-a716-446655440001",
      "incidentId": "550e8400-e29b-41d4-a716-446655440000",
      "text": "I witnessed this too!",
      "sentimentScore": 0.1,
      "createdAt": "2024-03-13T11:00:00Z",
      "updatedAt": "2024-03-13T11:00:00Z"
    }
  ]
}
```

### Create Incident
```http
POST /incidents
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "title": "Traffic Accident on Main Street",
  "description": "Multi-vehicle collision blocking traffic",
  "category": "accident",
  "severity": "high",
  "latitude": 15.4,
  "longitude": 120.0
}

Response 201:
{
  "incident": { ... }
}
```

### Update Incident
```http
PUT /incidents/{id}
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "title": "Updated title (optional)",
  "description": "Updated description (optional)",
  "severity": "medium",
  "resolvedAt": "2024-03-13T15:00:00Z"
}

Response 200:
{
  "incident": { ... }
}
```

### Delete Incident
```http
DELETE /incidents/{id}
Authorization: Bearer <accessToken>

Response 204: No Content
```

---

## Comments

### Get Comments
```http
GET /incidents/{id}/comments
Authorization: Bearer <accessToken>

Response 200:
{
  "comments": [ ... ]
}
```

### Add Comment
```http
POST /incidents/{id}/comments
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "text": "This area has been dangerous for months"
}

Response 201:
{
  "comment": { ... }
}
```

---

## Ratings

### List Ratings
```http
GET /ratings?lat=15.4&lon=120.0&radius=5&limit=20
Authorization: Bearer <accessToken>

Response 200:
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "userId": "550e8400-e29b-41d4-a716-446655440001",
      "incidentId": null,
      "safetyScore": 3,
      "location": { ... },
      "geohash": "ww8p7",
      "comment": "Generally safe area",
      "createdAt": "2024-03-13T10:45:00Z"
    }
  ],
  "total": 45,
  "hasMore": false
}
```

### Submit Rating
```http
POST /ratings
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "safetyScore": 4,
  "latitude": 15.4,
  "longitude": 120.0,
  "comment": "Well-lit and friendly",
  "incidentId": "550e8400-e29b-41d4-a716-446655440000" (optional)
}

Response 201:
{
  "rating": { ... }
}
```

### Get Area Statistics
```http
GET /ratings/stats/{geohash}
Authorization: Bearer <accessToken>

Response 200:
{
  "stats": {
    "geohash": "ww8p7",
    "centerPoint": { ... },
    "incidentCount": 12,
    "avgSeverity": 0.65,
    "avgSafetyScore": 3.2,
    "updatedAt": "2024-03-13T09:00:00Z"
  }
}
```

---

## Heatmap

### Get Heatmap Data
```http
GET /heatmap?lat=15.4&lon=120.0&zoom=13&radius=10
Authorization: Bearer <accessToken>

Response 200:
{
  "heatmapPoints": [
    {
      "lat": 15.40,
      "lng": 120.00,
      "intensity": 0.85
    },
    {
      "lat": 15.41,
      "lng": 120.01,
      "intensity": 0.62
    }
  ]
}
```

### Get Heatmap GeoJSON
```http
GET /heatmap/geojson?lat=15.4&lon=120.0&zoom=13
Authorization: Bearer <accessToken>

Response 200:
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [120.0, 15.4]
      },
      "properties": {
        "intensity": 0.85,
        "incidentCount": 12
      }
    }
  ]
}
```

---

## Admin Dashboard

### Dashboard Statistics
```http
GET /admin/dashboard/stats
Authorization: Bearer <adminToken>

Response 200:
{
  "stats": {
    "totalIncidents": 412,
    "totalReports": 1250,
    "avgSentimentScore": -0.15,
    "severityBreakdown": {
      "low": 120,
      "medium": 200,
      "high": 75,
      "critical": 17
    },
    "categoryBreakdown": {
      "accident": 185,
      "crime": 92,
      "hazard": 115,
      "other": 20
    }
  }
}
```

### Get All Incidents (Admin)
```http
GET /admin/incidents/all?status=open&limit=50&page=1
Authorization: Bearer <adminToken>

Response 200:
{
  "data": [ ... ],
  "total": 145,
  "page": 1,
  "limit": 50,
  "hasMore": true
}
```

### Update Incident Status (Admin)
```http
PUT /admin/incidents/{id}/status
Authorization: Bearer <adminToken>
Content-Type: application/json

{
  "status": "resolved",
  "resolvedAt": "2024-03-13T15:00:00Z"
}

Response 200:
{
  "incident": { ... }
}
```

### Spatial Analytics
```http
GET /admin/reports/spatial
Authorization: Bearer <adminToken>

Response 200:
{
  "topRiskAreas": [
    {
      "geohash": "ww8p7",
      "location": { ... },
      "riskScore": 0.92
    }
  ],
  "recentIncidents": [ ... ]
}
```

---

## WebSocket (Socket.io)

**Connection URL:** `http://localhost:3001`

**Authentication:** Include JWT token in `auth` parameter

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: {
    token: accessToken,
  },
});
```

### Events (Server → Client)

**New Incident**
```javascript
socket.on('incident:new', (incident) => {
  console.log('New incident:', incident);
});
```

**Incident Updated**
```javascript
socket.on('incident:updated', (incident) => {
  console.log('Incident updated:', incident);
});
```

**New Comment**
```javascript
socket.on('comment:new', (comment) => {
  console.log('New comment:', comment);
});
```

**New Rating**
```javascript
socket.on('rating:new', (rating) => {
  console.log('New rating:', rating);
});
```

### Events (Client → Server)

**Subscribe to Area**
```javascript
socket.emit('subscribe:area', {
  latitude: 15.4,
  longitude: 120.0,
  radiusKm: 5,
});
```

**Unsubscribe from Area**
```javascript
socket.emit('unsubscribe:area', 'ww8p7');
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message",
  "timestamp": "2024-03-13T10:30:00Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate email, etc.) |
| 500 | Internal Server Error |

---

## Rate Limiting

Currently not implemented. Future: Global rate limit of 100 requests/minute per IP/token.

---

## Pagination

List endpoints support pagination:
- `limit`: Number of results (default: 20, max: 100)
- `page`: Page number (default: 1)
- `hasMore`: Boolean indicating if more results exist

```javascript
// Get next page
const response2 = await apiClient.get('/incidents', {
  params: { page: 2, limit: 20 },
});
```

---

## Timestamps

All timestamps are ISO 8601 format in UTC:
```
2024-03-13T10:30:00Z
```

---

**Last Updated:** 2024-03-13
**API Version:** v1
