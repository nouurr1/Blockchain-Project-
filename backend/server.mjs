
import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = new Set(
  (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      callback(new Error("Origin not allowed by CORS."));
    }
  })
);

app.use(express.json({ limit: "20kb" }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "VERITAS API"
  });
});

// Admin login
app.post("/api/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      !process.env.ADMIN_EMAIL ||
      !process.env.ADMIN_PASSWORD_HASH ||
      !process.env.JWT_SECRET
    ) {
      return res.status(503).json({
        error: "Admin authentication is not configured."
      });
    }

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        error: "Email and password are required."
      });
    }

    const emailMatches =
      email.trim().toLowerCase() ===
      process.env.ADMIN_EMAIL.trim().toLowerCase();

    const passwordMatches = await bcrypt.compare(
      password,
      process.env.ADMIN_PASSWORD_HASH
    );

    if (!emailMatches || !passwordMatches) {
      return res.status(401).json({
        error: "Invalid email or password."
      });
    }

    const token = jwt.sign(
      { role: "admin" },
      process.env.JWT_SECRET,
      {
        subject: "veritas-admin",
        expiresIn: "8h",
        issuer: "veritas-api"
      }
    );

    res.json({
      success: true,
      token,
      expiresIn: "8h"
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({
      error: "Login failed."
    });
  }
});

// Protect administrative endpoints
function requireAdmin(req, res, next) {
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token || !process.env.JWT_SECRET) {
    return res.status(401).json({
      error: "Admin authentication required."
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "veritas-api",
      subject: "veritas-admin"
    });

    if (decoded.role !== "admin") {
      return res.status(403).json({
        error: "Administrator access required."
      });
    }

    next();
  } catch {
    return res.status(401).json({
      error: "Your session is invalid or expired. Please log in again."
    });
  }
}

// PDF upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, callback) => {
    if (
      file.mimetype !== "application/pdf" ||
      !file.originalname.toLowerCase().endsWith(".pdf")
    ) {
      return callback(new Error("Only PDF files are allowed."));
    }

    callback(null, true);
  }
});

// Protected Pinata upload
app.post(
  "/api/upload",
  requireAdmin,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!process.env.PINATA_JWT) {
        return res.status(500).json({
          error: "Pinata is not configured."
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: "Please select a PDF."
        });
      }

      // Check the PDF file signature.
      if (req.file.buffer.subarray(0, 5).toString() !== "%PDF-") {
        return res.status(400).json({
          error: "The uploaded file is not a valid PDF."
        });
      }

      const formData = new FormData();

      const pdfBlob = new Blob([req.file.buffer], {
        type: "application/pdf"
      });

      formData.append("file", pdfBlob, req.file.originalname);
      formData.append("network", "public");

      const response = await fetch(
        "https://uploads.pinata.cloud/v3/files",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.PINATA_JWT}`
          },
          body: formData
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Pinata upload failed:", data);

        return res.status(502).json({
          error: "Pinata upload failed."
        });
      }

      res.json({
        success: true,
        cid: data.data.cid,
        name: data.data.name
      });
    } catch (error) {
      console.error("Upload error:", error.message);

      res.status(500).json({
        error: "Upload failed."
      });
    }
  }
);

// Handle upload and server errors
app.use((error, req, res, next) => {
  console.error("Server error:", error.message);

  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      error:
        error.code === "LIMIT_FILE_SIZE"
          ? "PDF must be smaller than 10 MB."
          : "File upload failed."
    });
  }

  res.status(400).json({
    error: error.message || "An unexpected error occurred."
  });
});

app.listen(PORT, () => {
  console.log(`VERITAS API running on port ${PORT}`);
});
