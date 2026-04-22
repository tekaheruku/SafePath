import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { SocketEventBroadcaster } from './utils/socket-broadcaster.js';
import dotenv from 'dotenv';

// Import controllers
import { AuthController } from './controllers/auth.js';
import { AdminController, AdminRequestsController } from './controllers/admin.js';
import { ReportController } from './controllers/reports.js';
import { HeatmapController } from './controllers/heatmap.js';
import { StreetRatingController } from './controllers/street_ratings.js';
import { VoteController } from './controllers/votes.js';
import { RoutesController } from './controllers/routes.js';
import { UploadController, upload } from './controllers/upload.js';
import { authMiddleware, roleMiddleware } from './middleware/auth.js';
import path from 'path';


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

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow images to be viewed from frontend
}));
app.use(cors());
app.use(express.json());

// Serve uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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
// Email verification & account recovery
app.get(`${apiRoot}/auth/verify-email`, (req, res) => AuthController.verifyEmail(req, res));
app.post(`${apiRoot}/auth/verify-email-otp`, (req, res) => AuthController.verifyEmailOtp(req, res));
app.post(`${apiRoot}/auth/resend-verification`, (req, res) => AuthController.resendVerification(req, res));
app.post(`${apiRoot}/auth/request-password-reset`, (req, res) => AuthController.requestPasswordReset(req, res));
app.post(`${apiRoot}/auth/reset-password`, (req, res) => AuthController.resetPassword(req, res));
app.post(`${apiRoot}/auth/toggle-2fa`, authMiddleware, (req, res) => AuthController.toggle2fa(req, res));
app.post(`${apiRoot}/auth/change-password`, authMiddleware, (req, res) => AuthController.changePassword(req, res));

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
app.post(`${apiRoot}/streets/ratings`, authMiddleware, (req, res) => StreetRatingController.createRating(req, res));
app.get(`${apiRoot}/streets/ratings`, (req, res) => StreetRatingController.listRatings(req, res));
app.delete(`${apiRoot}/streets/ratings/:id`, authMiddleware, (req, res) => StreetRatingController.deleteRating(req, res));

// Routes / Safety Scoring
app.post(`${apiRoot}/routes/safety`, (req, res) => RoutesController.scoreSafetyForRoutes(req, res));

// Admin
app.get(`${apiRoot}/admin/users`, authMiddleware, roleMiddleware(['superadmin', 'lgu_admin']), (req, res) => AdminController.listUsers(req, res));
app.post(`${apiRoot}/admin/users/:userId/ban`, authMiddleware, roleMiddleware(['superadmin', 'lgu_admin']), (req, res) => AdminController.banUser(req, res));
app.post(`${apiRoot}/admin/users/:userId/unban`, authMiddleware, roleMiddleware(['superadmin', 'lgu_admin']), (req, res) => AdminController.unbanUser(req, res));
app.delete(`${apiRoot}/admin/users/:userId`, authMiddleware, roleMiddleware(['superadmin', 'lgu_admin']), (req, res) => AdminController.deleteUser(req, res));

// Admin Requests
app.post(`${apiRoot}/admin-requests`, upload.single('document'), (req, res) => AdminRequestsController.submitRequest(req, res));
app.get(`${apiRoot}/admin/requests`, authMiddleware, roleMiddleware(['superadmin']), (req, res) => AdminRequestsController.listRequests(req, res));
app.post(`${apiRoot}/admin/requests/:requestId/approve`, authMiddleware, roleMiddleware(['superadmin']), (req, res) => AdminRequestsController.approveRequest(req, res));
app.post(`${apiRoot}/admin/requests/:requestId/reject`, authMiddleware, roleMiddleware(['superadmin']), (req, res) => AdminRequestsController.rejectRequest(req, res));

// Uploads
app.post(`${apiRoot}/upload`, authMiddleware, upload.single('photo'), (req, res) => UploadController.uploadFile(req, res));

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
