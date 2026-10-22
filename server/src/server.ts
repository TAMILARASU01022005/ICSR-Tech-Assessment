import { createApp } from "./app.js";
import { connectDB } from "./config/database.js";
import { ENV } from "./config/env.js";

async function bootstrap() {
  await connectDB();

  const app = createApp();

  app.listen(ENV.PORT, () => {
    console.log(`[Server] Advanced Project Management Server running on port ${ENV.PORT} (${ENV.NODE_ENV})`);
  });
}

bootstrap().catch((err) => {
  console.error("[Server Bootstrap Failed]:", err);
  process.exit(1);
});
