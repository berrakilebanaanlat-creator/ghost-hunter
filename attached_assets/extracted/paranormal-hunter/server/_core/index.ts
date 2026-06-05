import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  // ============================================================
  // TTS ENDPOINT - Google Translate TTS Proxy
  // Türkçe kelimeyi mp3 olarak döndürür
  // ============================================================
  app.get("/api/tts", async (req, res) => {
    try {
      const text = (req.query.text as string || "").trim();
      const slow = req.query.slow === "1";
      if (!text || text.length > 200) {
        res.status(400).json({ error: "text parametresi gerekli (max 200 karakter)" });
        return;
      }

      const encodedText = encodeURIComponent(text);
      const speed = slow ? "0.24" : "1";
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=tr&client=tw-ob&ttsspeed=${speed}`;

      const https = await import("https");
      const audioData = await new Promise<Buffer>((resolve, reject) => {
        https.get(url, (response: any) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Google TTS HTTP ${response.statusCode}`));
            return;
          }
          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer) => chunks.push(chunk));
          response.on("end", () => resolve(Buffer.concat(chunks)));
          response.on("error", reject);
        }).on("error", reject);
      });

      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": audioData.length.toString(),
        "Cache-Control": "public, max-age=86400",
      });
      res.send(audioData);
    } catch (err) {
      console.error("[TTS] Error:", err);
      res.status(500).json({ error: "TTS hatası" });
    }
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
