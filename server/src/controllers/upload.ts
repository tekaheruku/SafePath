import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Use process.cwd() so the path resolves correctly regardless of how the
// server is started (tsx watch from /server, node dist/app.js, etc.).
// This matches the express.static('/uploads') mount in app.ts which also
// uses process.cwd().
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Ensure the directory exists at startup
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed.'));
    }
  },
});

export class UploadController {
  static async uploadFile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded.' });
        return;
      }

      // Build the public URL the frontend uses to display the file.
      // The server exposes /uploads/* via express.static in app.ts.
      const host = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3001}`;
      const publicUrl = `${host}/uploads/${req.file.filename}`;

      res.json({ success: true, url: publicUrl });
    } catch (error) {
      console.error('[UploadController] error:', error);
      res.status(500).json({ success: false, message: 'Internal server error during upload.' });
    }
  }
}
