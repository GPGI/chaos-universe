// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///home/project/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "/home/project";
var bypassHostCheck = () => ({
  name: "bypass-host-check",
  configureServer(server) {
    server.middlewares.stack.unshift({
      route: "",
      handle: (req, res, next) => {
        if (req.headers.host) {
          req.headers.host = "localhost:8080";
        }
        next();
      }
    });
  }
});
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 8080,
    strictPort: false,
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 8080,
      clientPort: 8080
    },
    // Don't set allowedHosts in development - plugin will handle it
    headers: {
      // Allow all sources in development mode for tunneling services and browser extensions
      "Content-Security-Policy": mode === "development" ? "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; img-src * data: blob:; connect-src * ws: wss:; script-src * 'unsafe-inline' 'unsafe-eval' blob:; style-src * 'unsafe-inline'; font-src * data:; frame-src *;" : void 0
    }
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "development" && bypassHostCheck()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  define: {
    // Polyfill process for browser compatibility (used by some dependencies like Avalanche SDK)
    "process.env": JSON.stringify({
      ...process.env,
      NODE_ENV: mode
    }),
    global: "globalThis",
    "process.platform": JSON.stringify("browser"),
    "process.browser": JSON.stringify(true)
  },
  build: {
    sourcemap: mode === "production"
    // generate source maps only in dev
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcblxuLy8gUGx1Z2luIHRvIGJ5cGFzcyBob3N0IGNoZWNraW5nIGluIGRldmVsb3BtZW50XG5jb25zdCBieXBhc3NIb3N0Q2hlY2sgPSAoKSA9PiAoe1xuICBuYW1lOiBcImJ5cGFzcy1ob3N0LWNoZWNrXCIsXG4gIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcbiAgICAvLyBJbnNlcnQgbWlkZGxld2FyZSBiZWZvcmUgaG9zdCBjaGVjayB0byBhbHdheXMgYWxsb3cgcmVxdWVzdHNcbiAgICBzZXJ2ZXIubWlkZGxld2FyZXMuc3RhY2sudW5zaGlmdCh7XG4gICAgICByb3V0ZTogXCJcIixcbiAgICAgIGhhbmRsZTogKHJlcTogYW55LCByZXM6IGFueSwgbmV4dDogYW55KSA9PiB7XG4gICAgICAgIC8vIFNldCBhIHZhbGlkIGhvc3QgaGVhZGVyIHRvIGJ5cGFzcyBjaGVja1xuICAgICAgICBpZiAocmVxLmhlYWRlcnMuaG9zdCkge1xuICAgICAgICAgIHJlcS5oZWFkZXJzLmhvc3QgPSBcImxvY2FsaG9zdDo4MDgwXCI7XG4gICAgICAgIH1cbiAgICAgICAgbmV4dCgpO1xuICAgICAgfSxcbiAgICB9KTtcbiAgfSxcbn0pO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4gKHtcbiAgc2VydmVyOiB7XG4gICAgaG9zdDogXCJsb2NhbGhvc3RcIixcbiAgICBwb3J0OiA4MDgwLFxuICAgIHN0cmljdFBvcnQ6IGZhbHNlLFxuICAgIGhtcjoge1xuICAgICAgcHJvdG9jb2w6IFwid3NcIixcbiAgICAgIGhvc3Q6IFwibG9jYWxob3N0XCIsXG4gICAgICBwb3J0OiA4MDgwLFxuICAgICAgY2xpZW50UG9ydDogODA4MCxcbiAgICB9LFxuICAgIC8vIERvbid0IHNldCBhbGxvd2VkSG9zdHMgaW4gZGV2ZWxvcG1lbnQgLSBwbHVnaW4gd2lsbCBoYW5kbGUgaXRcbiAgICBoZWFkZXJzOiB7XG4gICAgICAvLyBBbGxvdyBhbGwgc291cmNlcyBpbiBkZXZlbG9wbWVudCBtb2RlIGZvciB0dW5uZWxpbmcgc2VydmljZXMgYW5kIGJyb3dzZXIgZXh0ZW5zaW9uc1xuICAgICAgXCJDb250ZW50LVNlY3VyaXR5LVBvbGljeVwiOiBtb2RlID09PSBcImRldmVsb3BtZW50XCJcbiAgICAgICAgPyBcImRlZmF1bHQtc3JjICogJ3Vuc2FmZS1pbmxpbmUnICd1bnNhZmUtZXZhbCcgZGF0YTogYmxvYjo7IGltZy1zcmMgKiBkYXRhOiBibG9iOjsgY29ubmVjdC1zcmMgKiB3czogd3NzOjsgc2NyaXB0LXNyYyAqICd1bnNhZmUtaW5saW5lJyAndW5zYWZlLWV2YWwnIGJsb2I6OyBzdHlsZS1zcmMgKiAndW5zYWZlLWlubGluZSc7IGZvbnQtc3JjICogZGF0YTo7IGZyYW1lLXNyYyAqO1wiXG4gICAgICAgIDogdW5kZWZpbmVkLFxuICAgIH0sXG4gIH0sXG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIG1vZGUgPT09IFwiZGV2ZWxvcG1lbnRcIiAmJiBjb21wb25lbnRUYWdnZXIoKSxcbiAgICBtb2RlID09PSBcImRldmVsb3BtZW50XCIgJiYgYnlwYXNzSG9zdENoZWNrKCksXG4gIF0uZmlsdGVyKEJvb2xlYW4pLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxuICAgIH0sXG4gIH0sXG4gIGRlZmluZToge1xuICAgIC8vIFBvbHlmaWxsIHByb2Nlc3MgZm9yIGJyb3dzZXIgY29tcGF0aWJpbGl0eSAodXNlZCBieSBzb21lIGRlcGVuZGVuY2llcyBsaWtlIEF2YWxhbmNoZSBTREspXG4gICAgXCJwcm9jZXNzLmVudlwiOiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAuLi5wcm9jZXNzLmVudixcbiAgICAgIE5PREVfRU5WOiBtb2RlLFxuICAgIH0pLFxuICAgIGdsb2JhbDogXCJnbG9iYWxUaGlzXCIsXG4gICAgXCJwcm9jZXNzLnBsYXRmb3JtXCI6IEpTT04uc3RyaW5naWZ5KFwiYnJvd3NlclwiKSxcbiAgICBcInByb2Nlc3MuYnJvd3NlclwiOiBKU09OLnN0cmluZ2lmeSh0cnVlKSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICBzb3VyY2VtYXA6IG1vZGUgPT09IFwicHJvZHVjdGlvblwiLCAvLyBnZW5lcmF0ZSBzb3VyY2UgbWFwcyBvbmx5IGluIGRldlxuICB9LFxufSkpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5TixTQUFTLG9CQUFvQjtBQUN0UCxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsdUJBQXVCO0FBSGhDLElBQU0sbUNBQW1DO0FBTXpDLElBQU0sa0JBQWtCLE9BQU87QUFBQSxFQUM3QixNQUFNO0FBQUEsRUFDTixnQkFBZ0IsUUFBUTtBQUV0QixXQUFPLFlBQVksTUFBTSxRQUFRO0FBQUEsTUFDL0IsT0FBTztBQUFBLE1BQ1AsUUFBUSxDQUFDLEtBQVUsS0FBVSxTQUFjO0FBRXpDLFlBQUksSUFBSSxRQUFRLE1BQU07QUFDcEIsY0FBSSxRQUFRLE9BQU87QUFBQSxRQUNyQjtBQUNBLGFBQUs7QUFBQSxNQUNQO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSDtBQUNGO0FBR0EsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN6QyxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsSUFDWixLQUFLO0FBQUEsTUFDSCxVQUFVO0FBQUEsTUFDVixNQUFNO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixZQUFZO0FBQUEsSUFDZDtBQUFBO0FBQUEsSUFFQSxTQUFTO0FBQUE7QUFBQSxNQUVQLDJCQUEyQixTQUFTLGdCQUNoQywwTkFDQTtBQUFBLElBQ047QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixTQUFTLGlCQUFpQixnQkFBZ0I7QUFBQSxJQUMxQyxTQUFTLGlCQUFpQixnQkFBZ0I7QUFBQSxFQUM1QyxFQUFFLE9BQU8sT0FBTztBQUFBLEVBQ2hCLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQTtBQUFBLElBRU4sZUFBZSxLQUFLLFVBQVU7QUFBQSxNQUM1QixHQUFHLFFBQVE7QUFBQSxNQUNYLFVBQVU7QUFBQSxJQUNaLENBQUM7QUFBQSxJQUNELFFBQVE7QUFBQSxJQUNSLG9CQUFvQixLQUFLLFVBQVUsU0FBUztBQUFBLElBQzVDLG1CQUFtQixLQUFLLFVBQVUsSUFBSTtBQUFBLEVBQ3hDO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxXQUFXLFNBQVM7QUFBQTtBQUFBLEVBQ3RCO0FBQ0YsRUFBRTsiLAogICJuYW1lcyI6IFtdCn0K
