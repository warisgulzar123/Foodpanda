const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `file-${uniqueSuffix}${ext}`);
  },
});

// File filter (images only)
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const mimeMatch = allowed.test(file.mimetype);
  const extMatch = allowed.test(path.extname(file.originalname).toLowerCase());

  if (mimeMatch || extMatch) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (jpeg, jpg, png, webp, gif) are allowed!"), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter,
});

// Helper to construct absolute image URL
const getFileUrl = (req, filename) => {
  const host = req.get("host") || "localhost:5000";
  const protocol = req.protocol || "http";
  return `${protocol}://${host}/uploads/${filename}`;
};

// POST /api/upload - Single or Multiple image upload
router.post("/", (req, res) => {
  upload.any()(req, res, (err) => {
    if (err) {
      console.error("[Upload Error]:", err.message);
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No file was uploaded." });
    }

    const uploadedFiles = req.files.map((file) => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      url: getFileUrl(req, file.filename),
    }));

    const primaryUrl = uploadedFiles[0].url;

    console.log(`[Upload Success] ${uploadedFiles.length} file(s) uploaded. Primary: ${primaryUrl}`);

    res.status(201).json({
      success: true,
      url: primaryUrl,
      urls: uploadedFiles.map((f) => f.url),
      files: uploadedFiles,
    });
  });
});

module.exports = router;
