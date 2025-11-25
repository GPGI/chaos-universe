import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Plugin to bypass host checking in development
const bypassHostCheck = () => ({
  name: "bypass-host-check",
  configureServer(server) {
    // Insert middleware before host check to always allow requests
    server.middlewares.stack.unshift({
      route: "",
      handle: (req: any, res: any, next: any) => {
        // Set a valid host header to bypass check
        if (req.headers.host) {
          req.headers.host = "localhost:8080";
        }
        next();
      },
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 8080,
    strictPort: false,
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 8080,
      clientPort: 8080,
    },
    // Don't set allowedHosts in development - plugin will handle it
    headers: {
      // Allow all sources in development mode for tunneling services and browser extensions
      "Content-Security-Policy": mode === "development"
        ? "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; img-src * data: blob:; connect-src * ws: wss:; script-src * 'unsafe-inline' 'unsafe-eval' blob:; style-src * 'unsafe-inline'; font-src * data:; frame-src *;"
        : undefined,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "development" && bypassHostCheck(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Polyfill process for browser compatibility (used by some dependencies like Avalanche SDK)
    "process.env": JSON.stringify({
      ...process.env,
      NODE_ENV: mode,
    }),
    global: "globalThis",
    "process.platform": JSON.stringify("browser"),
    "process.browser": JSON.stringify(true),
  },
  build: {
    sourcemap: mode === "production", // generate source maps only in dev
  },
}));
