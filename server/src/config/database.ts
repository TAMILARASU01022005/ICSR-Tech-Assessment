import dns from "node:dns";
import mongoose from "mongoose";
import { ENV } from "./env.js";

// Ensure reliable SRV lookup across all network environments
dns.setServers(["8.8.8.8", "1.1.1.1"]);
dns.setDefaultResultOrder("ipv4first");

export async function connectDB(): Promise<void> {
  try {
    const conn = await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
    });
    console.log(`[Database] MongoDB Atlas Connected: ${conn.connection.host}`);
  } catch (err: any) {
    console.error(`[Database] Primary connection failed: ${err.message}`);
    // If Atlas connection has IP access restriction, fallback to local MongoDB instance
    if (ENV.MONGODB_URI.includes("mongodb+srv")) {
      console.log("[Database] Attempting fallback to local MongoDB (127.0.0.1:27017)...");
      try {
        const localConn = await mongoose.connect("mongodb://127.0.0.1:27017/icsr_pm", {
          serverSelectionTimeoutMS: 5000,
        });
        console.log(`[Database] Connected to local MongoDB fallback: ${localConn.connection.host}`);
        return;
      } catch (localErr: any) {
        console.error(`[Database] Local fallback also failed: ${localErr.message}`);
      }
    }
    process.exit(1);
  }
}
