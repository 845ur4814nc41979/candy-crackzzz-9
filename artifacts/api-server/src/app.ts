import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import fs from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api", router);

// In production, serve the built Vite frontend from the api-server process so
// the deployment is a single autoscale service. The Vite build output lives at
// artifacts/candy-crackzzz/dist/public. esbuild bundles this file into
// artifacts/api-server/dist/index.mjs, so __dirname at runtime is that dist
// folder. From there the frontend is two levels up + into candy-crackzzz.
const staticCandidates = [
  path.resolve(__dirname, "../../candy-crackzzz/dist/public"),
  path.resolve(process.cwd(), "artifacts/candy-crackzzz/dist/public"),
];
const staticDir = staticCandidates.find((p) => {
  try {
    return fs.existsSync(path.join(p, "index.html"));
  } catch {
    return false;
  }
});

if (staticDir) {
  logger.info({ staticDir }, "Serving built frontend");
  app.use(express.static(staticDir, { index: false, maxAge: "1h" }));
  // SPA fallback — serve index.html for any non-/api GET request so client-side
  // routes like /menu, /admin/login etc. work after a hard refresh.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET") return next();
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(staticDir, "index.html"));
  });
} else {
  logger.warn(
    { staticCandidates },
    "Built frontend not found; serving API only. Run the candy-crackzzz build before starting in production.",
  );
}

export default app;
