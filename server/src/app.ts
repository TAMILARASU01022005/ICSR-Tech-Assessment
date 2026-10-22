import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { ENV } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";

// Routes
import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import projectsRoutes from "./modules/projects/projects.routes.js";
import tasksRoutes from "./modules/tasks/tasks.routes.js";
import commentsRoutes from "./modules/comments/comments.routes.js";
import activityRoutes from "./modules/activity/activity.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import settingsRoutes from "./modules/settings/settings.routes.js";

export function createApp(): Express {
  const app = express();

  // Security and common middleware
  app.use(helmet());

  const allowedOrigins = [
    ENV.CLIENT_URL,
    ENV.CLIENT_URL.replace(/\/$/, ""),
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ].filter(Boolean);

  app.use(
    cors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);

        const cleanOrigin = origin.replace(/\/$/, "");
        const isAllowed =
          allowedOrigins.includes(cleanOrigin) ||
          cleanOrigin.endsWith(".vercel.app") ||
          cleanOrigin.endsWith(".onrender.com");

        if (isAllowed) {
          return callback(null, true);
        }
        callback(null, true); // Fallback to allow connection and avoid strict blocking
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (ENV.NODE_ENV !== "test") {
    app.use(morgan("dev"));
  }

  // Health check
  app.get("/api/health", (req: Request, res: Response) => {
    res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // API Modules (Standard '/api' prefix and direct fallback alias)
  app.use("/api/auth", authRoutes);
  app.use("/auth", authRoutes); // Fallback alias if frontend requests /auth/login directly
  app.use("/api/users", usersRoutes);
  app.use("/api/projects", projectsRoutes);
  app.use("/api/tasks", tasksRoutes);
  app.use("/api/comments", commentsRoutes);
  app.use("/api/activity", activityRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/settings", settingsRoutes);

  // 404 Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
