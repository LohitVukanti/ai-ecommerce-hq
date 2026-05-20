// ============================================================
// server.js — Main Express Server
// ============================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const productRoutes = require("./routes/products");
const ideaRoutes = require("./routes/ideas");
const trendRoutes = require("./routes/trends");
const integrationsRoutes = require("./routes/integrations");
const etsyRoutes = require("./routes/etsy");
const { pingDatabase, closeDatabase } = require("./data/db");
const { apiSecretGate } = require("./middleware/apiSecretGate");
const { rateLimit } = require("./middleware/rateLimit");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === "production";

// Render / reverse proxy — needed for rate-limit IP and secure cookies
app.set("trust proxy", 1);

const isLocalDevOrigin = (origin) => {
  if (!origin) return true;
  try {
    const u = new URL(origin);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return true;
  } catch {
    return false;
  }
  return false;
};

const parseClientOrigins = () => {
  const raw = process.env.CLIENT_ORIGIN;
  if (!raw || !String(raw).trim()) return [];
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

if (isProduction && parseClientOrigins().length === 0) {
  console.warn(
    "⚠️  CLIENT_ORIGIN is not set in production — only localhost origins are implicitly trusted. " +
      "Set CLIENT_ORIGIN to your Vercel URL on Render."
  );
}

// ---- Middleware ----
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || isLocalDevOrigin(origin)) {
        return callback(null, true);
      }
      const allowed = parseClientOrigins();
      if (allowed.length === 0) {
        // Fail closed in production for non-localhost browser origins
        if (isProduction) {
          return callback(null, false);
        }
        return callback(null, true);
      }
      if (allowed.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    }
  })
);

app.use(express.json({ limit: "2mb" }));
app.use("/api", rateLimit({ windowMs: 60_000, max: 180 }));
app.use("/api", apiSecretGate);

// ---- Static files ----
const generatedProductsDir = path.join(__dirname, "generated-products");
const generatedArtworkDir = path.join(__dirname, "generated-artwork");

for (const dir of [generatedProductsDir, generatedArtworkDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

app.use(
  "/downloads",
  express.static(generatedProductsDir, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".csv")) {
        res.setHeader("Content-Disposition", `attachment; filename="${path.basename(filePath)}"`);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
      }
    }
  })
);

app.use(
  "/artwork",
  express.static(generatedArtworkDir, {
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Cache-Control", "public, max-age=300");
    }
  })
);

// ---- Routes ----
app.use("/api/products", productRoutes);
app.use("/api/ideas", ideaRoutes);
app.use("/api/trends", trendRoutes);
app.use("/api/integrations", integrationsRoutes);
app.use("/api/etsy", etsyRoutes);

// ---- Health (liveness + readiness) ----
app.get("/api/health", (req, res) => {
  const checks = { database: "unknown", writableDirs: "unknown" };

  try {
    pingDatabase();
    checks.database = "ok";
  } catch (e) {
    checks.database = "error";
    return res.status(503).json({
      status: "degraded",
      message: "Database unavailable",
      checks,
      error: isProduction ? undefined : e.message
    });
  }

  try {
    fs.accessSync(generatedArtworkDir, fs.constants.W_OK);
    fs.accessSync(generatedProductsDir, fs.constants.W_OK);
    checks.writableDirs = "ok";
  } catch (e) {
    checks.writableDirs = "error";
    return res.status(503).json({
      status: "degraded",
      message: "Storage directories not writable",
      checks,
      error: isProduction ? undefined : e.message
    });
  }

  res.json({
    status: "ok",
    message: "AI E-Commerce HQ backend is running!",
    checks,
    uptimeSeconds: Math.floor(process.uptime()),
    nodeEnv: process.env.NODE_ENV || "development"
  });
});

// ---- 404 + global error handler ----
app.use(notFoundHandler);
app.use(errorHandler);

// ---- Unhandled rejections ----
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

// ---- Start + graceful shutdown ----
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 Backend server running at http://localhost:${PORT}`);
  console.log(`   Health check:    http://localhost:${PORT}/api/health`);
  console.log(`   Products API:    http://localhost:${PORT}/api/products`);
  console.log(`   Ideas API:       http://localhost:${PORT}/api/ideas`);
  console.log(`   Trends API:      http://localhost:${PORT}/api/trends`);
  console.log(`   Integrations:    http://localhost:${PORT}/api/integrations/status`);
  console.log(`   Etsy OAuth:      http://localhost:${PORT}/api/etsy/auth/start`);
  console.log(`   Downloads:       http://localhost:${PORT}/downloads/`);
  console.log(`   Artwork:         http://localhost:${PORT}/artwork/`);
  if (process.env.API_SECRET) {
    console.log("   API_SECRET:      enabled (X-Api-Key required on /api/* except health + Etsy callback)");
  }
  console.log("");
});

function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully…`);
  server.close(() => {
    try {
      closeDatabase();
    } catch (e) {
      console.error("Error closing database:", e.message);
    }
    console.log("Server closed.");
    process.exit(0);
  });
  setTimeout(() => {
    console.error("Forced shutdown after timeout.");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
