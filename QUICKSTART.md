# SafePath Quick Start Guide

## 1️⃣ Installation (5 minutes)

```bash
# Install dependencies
pnpm install

# Copy environment files
cp server/.env.example server/.env
cp website/.env.example website/.env
```

## 2️⃣ Start Services (2 minutes)

```bash
# Terminal 1: Start Docker services
docker-compose up

# Wait for "postgres_1 | database system is ready to accept connections"
```

## 3️⃣ Setup Database (2 minutes)

```bash
# Terminal 2: Run migrations (in project root)
pnpm db:migrate
```

## 4️⃣ Start Frontend (1 minute)

```bash
# Terminal 3: Start Next.js dev server
cd website
pnpm dev
```

**✅ You should now have:**
- Backend API running at `http://localhost:3001`
- Frontend at `http://localhost:3000`
- PostgreSQL + PostGIS at `localhost:5432`
- Redis at `localhost:6379`
- Socket.io ready at `http://localhost:3001`

## 🔥 What's Working Right Now

### ✅ Infrastructure
- Express server with Socket.io
- PostgreSQL connection pool
- JWT token generation
- Sentiment analysis engine
- API error handling
- CORS configured

### ✅ Frontend
- Next.js 13+ App Router
- Zustand auth store
- Axios API client with JWT interceptors
- Socket.io client initialization
- Responsive layout structure
- Page routing (login, register, dashboard, incidents, etc.)

### ✅ Database
- Configuration ready
- Migration framework setup
- PostGIS enabled

### ✅ Authentication
- JWT token generation
- Access/refresh token system
- Auth middleware
- Token refresh on 401
- Role-based access control (user, lgu_admin, superadmin)

### ✅ Real-time
- Socket.io server
- Area subscription system
- Event emitters ready

## 🚀 What's Next to Build

### Immediate (Phase 1 Features)
1. **Database Migrations** - Create all tables (users, incidents, ratings, comments)
2. **Auth Controllers** - Implement register/login endpoints
3. **Incident Controllers** - Create/read/update/delete incidents
4. **Ratings Controllers** - Submit and retrieve safety ratings
5. **Map Component** - Leaflet integration with heatmap
6. **Login/Register Forms** - User authentication UI
7. **Dashboard** - Main map view interface

### Then (Phase 2 Features)
8. Admin dashboard
9. Comments system
10. Heatmap caching
11. Spatial analytics
12. Push notifications
13. Photo upload

## 💡 Development Tips

### Add a new API endpoint
1. Update shared types in `packages/shared/src/index.ts`
2. Create controller in `packages/backend/src/controllers/`
3. Create service in `packages/backend/src/services/`
4. Add route in `packages/backend/src/app.ts`
5. Create API client method in `packages/web/lib/api-client.ts`

### Add a new page
1. Create `.tsx` file in `packages/web/app/`
2. Use `@next/navigation` for routing
3. Fetch data via API client
4. Use Zustand store for state

### Test the API
```bash
# Health check
curl http://localhost:3001/api/v1/health

# Test with your client
# See packages/web/lib/api-client.ts for example usage
```

### Monitor database
```bash
# Connect to PostgreSQL
docker exec -it safepath-postgres psql -U postgres -d safepath

# List tables
\dt

# Query data
SELECT * FROM users;
```

## 🐛 Troubleshooting

**Port 3000 or 3001 already in use?**
```bash
# Kill process on port 3001 (macOS/Linux)
lsof -i :3001 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Or change PORT in .env
echo "PORT=3002" >> packages/backend/.env
```

**Database connection failed?**
```bash
# Check Docker is running
docker ps

# Restart database
docker-compose restart postgres

# Check logs
docker logs safepath-postgres
```

**TypeScript errors?**
```bash
# Rebuild shared types
cd shared && pnpm build

# Clear Next.js cache
rm -rf website/.next
```

## 📚 File Organization

| Purpose | Location |
|---------|----------|
| Type definitions | `shared/src/index.ts` |
| API routes | `server/src/app.ts` |
| Database config | `server/src/config/` |
| Business logic | `server/src/services/` |
| Request handlers | `server/src/controllers/` |
| API utilities | `server/src/utils/` |
| Web pages | `website/app/` |
| React components | `website/components/` |
| API client | `website/lib/api-client.ts` |
| Auth store | `website/lib/auth.ts` |
| Socket.io | `website/lib/socket-client.ts` |

## ✨ Mobile Integration Ready

The API is already designed for mobile app consumption. When your mobile team is ready:

1. Point to the same backend API
2. Use identical JWT token flow
3. Subscribe to the same Socket.io events
4. Import shared types (for TypeScript projects)
5. No backend changes needed!

---

**Next: Build database migrations and authentication endpoints!**
