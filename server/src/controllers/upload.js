import multer from 'multer';
import path from 'path';
import fs from 'fs';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

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
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed.'));
    }
  },
});

export class UploadController {
  static async uploadFile(req, res) {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded.' });
        return;
      }
      const host = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3001}`;
      const publicUrl = `${host}/uploads/${req.file.filename}`;
      res.json({ success: true, url: publicUrl });
    } catch (error) {
      console.error('[UploadController] error:', error);
      res.status(500).json({ success: false, message: 'Internal server error during upload.' });
    }
  }
}
