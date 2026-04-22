import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
// We use a fallback so it doesn't crash if env vars are missing before setup
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'placeholder_key';
export const supabase = createClient(supabaseUrl, supabaseKey);

// Use Memory Storage instead of Disk Storage
// This keeps the file in RAM instead of writing it to the free hosting disk
const storage = multer.memoryStorage();

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed!'));
    }
  }
});

export class UploadController {
  static async uploadFile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }

      // Check if Supabase env vars are set
      if (process.env.SUPABASE_URL === undefined || process.env.SUPABASE_KEY === undefined) {
          res.status(500).json({ success: false, message: 'Supabase credentials are not configured in .env' });
          return;
      }

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = uniqueSuffix + path.extname(req.file.originalname);

      // Upload directly to Supabase 'uploads' bucket
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(filename, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false // Don't overwrite existing
        });

      if (error) {
        console.error('Supabase upload error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload to cloud storage' });
        return;
      }

      // Get the public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(filename);

      res.json({ success: true, url: publicUrlData.publicUrl });
    } catch (error) {
      console.error('Upload catch error:', error);
      res.status(500).json({ success: false, message: 'Internal server error during upload' });
    }
  }
}
