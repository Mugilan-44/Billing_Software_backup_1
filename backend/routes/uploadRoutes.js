import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key:    process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

const router = express.Router();

const storage = multer.diskStorage({
    destination(req, file, cb) {
        const dir = 'uploads/logos/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename(req, file, cb) {
        cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`);
    }
});

function checkFileType(file, cb) {
    const filetypes = /jpg|jpeg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Images only! (jpg, jpeg, png)'));
    }
}

const upload = multer({
    storage,
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
});

router.post('/', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image uploaded' });
    }
    
    try {
        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
            const fixedPath = req.file.path.replace(/\\/g, '/');
            const result = await cloudinary.uploader.upload(fixedPath, {
                folder: 'logos',
                overwrite: true,
            });
            // Delete temp local file
            fs.unlink(req.file.path, () => {});
            return res.json({ success: true, url: result.secure_url });
        }
    } catch (uploadErr) {
        console.error('Cloudinary upload failed for settings image:', uploadErr);
    }

    const fixedPath = req.file.path.replace(/\\/g, '/');
    res.json({ success: true, url: `/${fixedPath}` });
});

export default router;
