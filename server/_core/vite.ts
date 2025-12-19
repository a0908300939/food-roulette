import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Always use the same path resolution for consistency
  const distPath = path.resolve(import.meta.dirname, "../..", "dist", "public");
  
  console.log(`[Static] Serving static files from: ${distPath}`);
  console.log(`[Static] __dirname: ${import.meta.dirname}`);
  
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  } else {
    console.log(`[Static] Build directory found: ${distPath}`);
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    console.log(`[Fallback] Request: ${req.originalUrl} -> serving index.html from: ${indexPath}`);
    
    if (!fs.existsSync(indexPath)) {
      console.error(`[Error] index.html not found at: ${indexPath}`);
      return res.status(404).send("Application not found. Please contact support.");
    }
    
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error(`[Error] Failed to send index.html:`, err);
        res.status(500).send("Internal server error");
      }
    });
  });
}
