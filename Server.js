import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import bannerRoutes from "./routes/bannerRoutes.js";
import blogRoutes from "./routes/blogRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import productUploadRoutes from "./routes/uploadRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import shippingRoutes from "./routes/shippingRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import addressRoutes from "./routes/addressRoutes.js";
import wishlistRoutes from "./routes/wishListRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import flashMessageRoutes from "./routes/flashMessageRoutes.js";
import trackShipmentRoutes from "./routes/tacking.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// -------------------- CORS CONFIGURATION --------------------
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "https://green-inovics-002.netlify.app",
  "https://green-inovics-web.netlify.app/",
];

if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(",").forEach((origin) => {
    if (!allowedOrigins.includes(origin)) {
      allowedOrigins.push(origin.trim());
    }
  });
}

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.options("*", cors());

// -------------------- SECURITY HEADERS --------------------
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
  res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
  next();
});

// -------------------- BODY PARSERS --------------------
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// -------------------- UPLOADS DIRECTORY --------------------
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, "uploads");
const subDirs = ["banners", "blogs", "videos", "products"];

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

subDirs.forEach((subDir) => {
  const dirPath = path.join(uploadsDir, subDir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Serve static uploaded files
app.use("/uploads", express.static(uploadsDir));

// -------------------- API ROUTES --------------------
app.use("/api/auth", authRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/upload", productUploadRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/shipping", shippingRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/flash-messages", flashMessageRoutes);
app.use("/api/shipment", trackShipmentRoutes);
// -------------------- TEST ROUTES --------------------
app.get("/", (req, res) => {
  res.json({
    message: "Green Inovics API is running...",
    endpoints: {
      auth: "/api/auth",
      products: "/api/products",
      categories: "/api/categories",
      upload: "/api/upload",
      banners: "/api/banners",
      blogs: "/api/blogs",
      contact: "/api/contact",
      cart: "/api/cart",
      shipping: "/api/shipping",
      orders: "/api/orders",
      // payment: '/api/payment'
    },
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date(),
    database: "Connected",
    razorpay: process.env.RAZORPAY_KEY_ID ? "Configured" : "Not Configured",
    environment: process.env.NODE_ENV || "development",
  });
});

// -------------------- ERROR HANDLING --------------------
// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// -------------------- DATABASE CONNECTION & SERVER --------------------
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📁 Uploads directory: ${uploadsDir}`);
      console.log(`📂 Subdirectories: ${subDirs.join(", ")}`);
      console.log(`🌐 CORS enabled for: ${allowedOrigins.join(", ")}`);
      console.log(`🚀 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  })
  .catch((error) => {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  });
