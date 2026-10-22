import { Request, Response, NextFunction } from "express";
import { ENV } from "../config/env.js";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error(`[Error] ${req.method} ${req.url} - ${err.message}`);
  
  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
    ...(ENV.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
}
