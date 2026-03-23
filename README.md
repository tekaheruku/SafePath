# SafePath - GIS-Integrated Crowdsourcing Platform

A mobile and web-based platform for real-time urban safety mapping and incident reporting in Iba, Zambales. Community members can submit geotagged incident reports, rate street safety, and view heatmap visualizations of risk areas. Includes an LGU admin dashboard for monitoring reports and analytics.

## Project Overview

SafePath is built as a **monorepo** containing:
- **Backend**: Node.js/Express REST API with Socket.io real-time updates
- **Frontend**: Next.js 13+ with App Router
- **Shared**: Shared TypeScript types and constants for mobile-web compatibility

### Key Architecture Decisions

- **Stateless REST API**: All endpoints are API-driven and consumable by any client (web or mobile)
- **JWT Authentication**: Token-based auth shared between web and mobile platforms
- **Real-Time Updates**: Socket.io for live incident feeds and notifications
- **GIS Integration**: PostgreSQL with PostGIS for spatial queries and heatmap generation
- **Monorepo**: Simplified API contract sharing with future mobile app

## Getting Started

### Prerequisites

- **Node.js** 18+ and **pnpm** 9+
- **Docker** and **Docker Compose** (for database and Redis)
- **PostgreSQL 16** with PostGIS extension (or use Docker)

### Installation

1. **Clone and install dependencies**
   ```bash
   cd SafePath
   pnpm install
   ```

2. **Setup environment variables**
   ```bash
   # Backend
   cp packages/backend/.env.example packages/backend/.env

   # Frontend
   cp packages/web/.env.example packages/web/.env
   ```

3. **Start services with Docker**
   ```bash
   docker-compose up -d
   ```
   This starts:
   - PostgreSQL with PostGIS (port 5432)
   - Redis (port 6379)
   - Backend API (port 3001)

4. **Run database migrations** (in a new terminal)
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

5. **Start frontend development server**
   ```bash
   cd packages/web
   pnpm dev
   ```
   Frontend will be available at `http://localhost:3000`

6. **Backend will be running automatically** via Docker at `http://localhost:3001`

## Project Structure

```
SafePath/
├── packages/
│   ├── backend/              # Node.js/Express API
│   │   ├── src/
│   │   │   ├── app.ts       # Express server setup
│   │   │   ├── config/      # Configuration files
│   │   │   ├── controllers/ # Request handlers
│   │   │   ├── middlewares/ # Auth, validation, error handling
│   │   │   ├── models/      # Database queries
│   │   │   ├── services/    # Business logic
│   │   │   ├── utils/       # JWT, sentiment analysis, GIS helpers
│   │   │   └── socket/      # Socket.io event handlers
│   │   └── migrations/      # Database migrations
│   │
│   ├── web/                 # Next.js frontend
│   │   ├── app/            # Next.js App Router
│   │   │   ├── (auth)/     # Login/Register pages
│   │   │   ├── dashboard/  # Main map view
│   │   │   ├── incidents/  # Incident list
│   │   │   ├── report/     # Create incident
│   │   │   ├── admin/      # LGU admin dashboard
│   │   │   └── my-reports/ # User's incidents
│   │   ├── components/     # React components
│   │   ├── lib/            # API client, auth, Socket.io
│   │   └── store/          # Zustand state management
│   │
│   └── shared/              # Shared TypeScript types
│       └── src/index.ts     # All shared interfaces
│
├── docker-compose.yml       # Service definitions
├── package.json            # Monorepo workspace config
└── tsconfig.json           # Root TypeScript config
```

## API Documentation

### Base URL
```
http://localhost:3001/api/v1
```

### Authentication Endpoints

- `POST /auth/register` - Create new account
- `POST /auth/login` - Get JWT tokens
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Invalidate tokens
- `GET /auth/me` - Get current user (protected)

### Incident Endpoints

- `GET /incidents` - List incidents (with filtering)
- `GET /incidents/:id` - Get incident details
- `POST /incidents` - Create incident (protected)
- `PUT /incidents/:id` - Update incident (protected, owner only)
- `DELETE /incidents/:id` - Delete incident (protected, owner only)
- `GET /incidents/:id/comments` - Get comments
- `POST /incidents/:id/comments` - Add comment (protected)

### Rating Endpoints

- `GET /ratings` - List ratings
- `POST /ratings` - Submit safety rating (protected)
- `GET /ratings/stats/:geohash` - Get area statistics

### Heatmap Endpoints

- `GET /heatmap` - Get heatmap data (query: lat, lon, zoom)
- `GET /heatmap/geojson` - Get GeoJSON for map overlay

### Admin Endpoints (LGU admin role required)

- `GET /admin/dashboard/stats` - Summary statistics
- `GET /admin/incidents/all` - All incidents
- `PUT /admin/incidents/:id/status` - Update incident status
- `GET /admin/reports/spatial` - Spatial analytics

### Socket.io Events

**Client → Server:**
- `subscribe:area` - Subscribe to location updates
- `unsubscribe:area` - Unsubscribe from location

**Server → Client:**
- `incident:new` - New incident reported
- `incident:updated` - Incident details changed
- `comment:new` - New comment added
- `rating:new` - New safety rating

## Development Workflow

### Run all services

```bash
# Terminal 1: Docker services
docker-compose up

# Terminal 2: Backend (auto-restarts on code changes)
# Already running via Docker

# Terminal 3: Frontend
cd packages/web
pnpm dev

# Terminal 4: Shared types (rebuild on changes)
cd packages/shared
pnpm build --watch
```

### Database Management

```bash
# Create new migration
pnpm db:create-migration add_new_table

# Run migrations
pnpm db:migrate

# Seed database with sample data
pnpm db:seed

# Rollback last migration
pnpm db:rollback
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run specific test file
pnpm test path/to/test.spec.ts
```

### Code Quality

```bash
# Lint all packages
pnpm lint

# Format code
pnpm format
```

## Mobile App Integration

When the mobile app is ready to integrate:

1. **Use the same API**: The mobile app consumes the exact same REST endpoints at `http://api.safepath.com/api/v1`
2. **Shared types**: Import from `@safepath/shared` for TypeScript projects, or use generated OpenAPI specs
3. **JWT tokens**: Mobile app uses identical token storage and refresh logic
4. **Socket.io**: Connect to the same WebSocket server using the same events
5. **Database**: Mobile app queries the same PostgreSQL database

No backend refactoring needed—the architecture is ready for multi-platform expansion.

## Key Features

### Phase 1: MVP (Current)
- [x] User registration & JWT auth
- [x] Project structure & scaffolding
- [ ] Incident report submission
- [ ] Street safety ratings
- [ ] Interactive Leaflet map
- [ ] Real-time Socket.io updates
- [ ] Sentiment analysis
- [ ] LGU admin dashboard

### Phase 2: Enhanced
- [ ] Photo uploads for incidents
- [ ] NLP sentiment analysis
- [ ] Spatial heatmap optimization
- [ ] Mobile app integration
- [ ] Push notifications
- [ ] Advanced analytics

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 13+ | Modern React framework with SSR |
| State Management | Zustand | Lightweight global state |
| HTTP Client | Axios | API requests with interceptors |
| Real-Time | Socket.io | Live updates and notifications |
| Map | Leaflet.js | Interactive GIS maps |
| Backend | Express.js | Node.js REST API |
| Database | PostgreSQL + PostGIS | Relational data with spatial queries |
| Cache | Redis | Session & Socket.io pub/sub |
| Auth | JWT | Stateless token-based authentication |
| Validation | Joi | Request schema validation |
| Hashing | Bcryptjs | Password hashing |

## Deployment

### Backend
- Docker container on any platform (AWS ECS, Digital Ocean, Heroku)
- Environment: `NODE_ENV=production` with proper secrets
- Database: Managed PostgreSQL with PostGIS

### Frontend
- Vercel (native Next.js support)
- Netlify
- AWS Amplify
- Self-hosted Node.js

### Example: Docker Production

```bash
docker build -t safepath-api packages/backend
docker run -e NODE_ENV=production \
  -e DB_HOST=db.example.com \
  -e JWT_SECRET_ACCESS=<prod_secret> \
  -p 3001:3001 \
  safepath-api
```

## Troubleshooting

### Database Connection Failed
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check database exists
docker exec safepath-postgres psql -U postgres -l
```

### Port Already in Use
```bash
# Backend (3001)
lsof -i :3001
kill -9 <PID>

# Frontend (3000)
lsof -i :3000
kill -9 <PID>
```

### JWT Token Issues
- Ensure `JWT_SECRET_ACCESS` and `JWT_SECRET_REFRESH` are set
- Check token expiry times in `packages/backend/src/utils/jwt.ts`
- Clear localStorage and re-login

## Contributing

1. Create feature branch from `develop`
2. Follow existing code structure
3. Update shared types when adding new features
4. Write tests for business logic
5. Create PR with description

## Future Roadmap

- Geofencing for proximity-based alerts
- Machine learning for incident prediction
- Multi-language support
- Offline mode for mobile app
- Advanced permission system
- Analytics dashboard
- Integration with city emergency services

## License

[Add your license here]

## Contact

For questions or support, contact the SafePath team at [contact info]

---

**Happy mapping! 🗺️**
