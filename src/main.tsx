import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Suppress SES lockdown console messages (informational messages from WalletConnect's security system)
// These messages indicate SES is removing experimental/non-standard JavaScript intrinsics for security
// NOTE: We do NOT filter console.error to ensure actual errors are visible
if (typeof console !== "undefined") {
  const originalLog = console.log;
  const originalInfo = console.info;
  const originalWarn = console.warn;
  
  const isSESMessage = (message: string): boolean => {
    return (
      message.includes("Removing unpermitted intrinsics") ||
      message.includes("Removing intrinsics.%MapPrototype%") ||
      message.includes("Removing intrinsics.%WeakMapPrototype%") ||
      message.includes("Removing intrinsics.%DatePrototype%") ||
      message.includes("lockdown-install.js") ||
      message.includes("inpage.js") ||
      (message.includes("getOrInsert") && message.includes("Removing")) ||
      (message.includes("toTemporalInstant") && message.includes("Removing"))
    );
  };
  
  const isCSPWarning = (message: string): boolean => {
    const msg = message.toLowerCase();
    return (
      msg.includes("content-security-policy") &&
      (msg.includes("blocked") || msg.includes("violates") || msg.includes("directive")) &&
      (msg.includes("default-src 'none'") || 
       msg.includes("script-src-elem") || 
       msg.includes("img-src") ||
       msg.includes("inpage.js") ||
       msg.includes("sandbox eval code") ||
       msg.includes("favicon.ico") ||
       msg.includes("consider using a hash") ||
       msg.includes("consider using a nonce"))
    );
  };
  
  console.log = (...args: any[]) => {
    const message = String(args.join(" "));
    if (!isSESMessage(message) && !isCSPWarning(message)) {
      originalLog.apply(console, args);
    }
  };
  
  console.info = (...args: any[]) => {
    const message = String(args.join(" "));
    if (!isSESMessage(message) && !isCSPWarning(message)) {
      originalInfo.apply(console, args);
    }
  };
  
  console.warn = (...args: any[]) => {
    const message = String(args.join(" "));
    if (!isSESMessage(message) && !isCSPWarning(message)) {
      originalWarn.apply(console, args);
    }
  };
}

// Ensure root element exists before rendering
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found. Make sure index.html has a <div id='root'></div> element.");
}

// Wrap app initialization in try-catch to handle errors
try {
  createRoot(rootElement).render(<App />);
} catch (error) {
  console.error("Failed to render app:", error);
  rootElement.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center; font-family: system-ui, sans-serif; background: #1a1a1a; color: #fff;">
      <div>
        <h1 style="font-size: 24px; margin-bottom: 16px; color: #ef4444;">Failed to load application</h1>
        <p style="margin-bottom: 16px; color: #999;">${error instanceof Error ? error.message : "Unknown error"}</p>
        <button onclick="window.location.reload()" style="padding: 8px 16px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer;">
          Reload Page
        </button>
        ${error instanceof Error && error.stack ? `
          <details style="margin-top: 20px; text-align: left;">
            <summary style="cursor: pointer; color: #999;">Error Details</summary>
            <pre style="background: #2a2a2a; padding: 12px; border-radius: 4px; overflow: auto; margin-top: 8px; font-size: 12px;">${error.stack}</pre>
          </details>
        ` : ''}
      </div>
    </div>
  `;
  throw error;
}
