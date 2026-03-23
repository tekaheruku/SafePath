import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { SocketEventBroadcaster } from './utils/socket-broadcaster.js';
import dotenv from 'dotenv';

// Import controllers
import { AuthController } from './controllers/auth.js';
import { ReportController } from './controllers/reports.js';
import { HeatmapController } from './controllers/heatmap.js';
import { StreetRatingController } from './controllers/street_ratings.js';
import { VoteController } from './controllers/votes.js';
import { authMiddleware } from './middleware/auth.js';


dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

SocketEventBroadcaster.setIO(io);

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Inline routes for now (or I can restore separate route files)
const apiRoot = '/api/v1';

// Auth
app.post(`${apiRoot}/auth/login`, (req, res) => AuthController.login(req, res));
app.post(`${apiRoot}/auth/register`, (req, res) => AuthController.register(req, res));
app.get(`${apiRoot}/auth/me`, authMiddleware, (req, res) => AuthController.getCurrentUser(req, res));

// Reports
app.post(`${apiRoot}/reports`, authMiddleware, (req, res) => ReportController.createReport(req, res));
app.get(`${apiRoot}/reports`, (req, res) => ReportController.listReports(req, res));
app.get(`${apiRoot}/reports/:id`, (req, res) => ReportController.getReport(req, res));
app.put(`${apiRoot}/reports/:id`, authMiddleware, (req, res) => ReportController.updateReport(req, res));
app.delete(`${apiRoot}/reports/:id`, authMiddleware, (req, res) => ReportController.deleteReport(req, res));
app.post(`${apiRoot}/reports/:id/vote`, authMiddleware, (req, res) => VoteController.castVote(req, res));


// Heatmap
app.get(`${apiRoot}/heatmap/data`, (req, res) => HeatmapController.getHeatmapData(req, res));

// Streets/Ratings
app.post(`${apiRoot}/streets/ratings`, (req, res) => StreetRatingController.createRating(req, res));
app.get(`${apiRoot}/streets/ratings`, (req, res) => StreetRatingController.listRatings(req, res));
app.delete(`${apiRoot}/streets/ratings/:id`, authMiddleware, (req, res) => StreetRatingController.deleteRating(req, res));

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
