/**
 * Contract Address Loader
 * Automatically loads contract addresses from backend API, public file, or local storage
 * This module is imported by contracts.ts to trigger automatic loading
 */

// Defer the import and execution to avoid initialization order issues
if (typeof window !== "undefined") {
  // Use requestIdleCallback if available, otherwise setTimeout
  const defer = window.requestIdleCallback || ((fn: () => void) => setTimeout(fn, 0));
  
  defer(() => {
    // Dynamic import to avoid circular dependency issues
    import("./contracts").then(({ loadContractAddresses }) => {
loadContractAddresses().catch((error) => {
  console.debug("Contract address loader initialization:", error);
});
    }).catch((error) => {
      console.debug("Failed to load contract address loader:", error);
    });
  });
}

