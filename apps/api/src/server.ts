import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { env } from "./config/env.js";

const port = env.PORT;
const hostname = env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";

const server = serve(
  {
    fetch: app.fetch,
    port,
    hostname
  },
  (info) => {
    console.log(`Sakuin API running on http://${hostname}:${info.port}`);
  }
);

server.on("error", (error) => {
  console.error("Server gagal berjalan:", error);
  process.exit(1);
});

process.on("SIGINT", () => {
  server.close(() => {
    console.log("Sakuin API stopped.");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  server.close(() => {
    console.log("Sakuin API stopped.");
    process.exit(0);
  });
});