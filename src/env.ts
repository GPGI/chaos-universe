/**
 * Typed environment variable access for Vite projects.
 */

interface EnvVars {
  VITE_AVALANCHE_RPC: string;
  VITE_CONTRACT_ADDRESS: string;
}

const requiredEnvVars: (keyof EnvVars)[] = [
  "VITE_AVALANCHE_RPC",
  "VITE_CONTRACT_ADDRESS",
];

export const env = (() => {
  const vars: Partial<EnvVars> = {};

  for (const key of requiredEnvVars) {
    const value = import.meta.env[key];
    if (!value) {
      console.error(`❌ Missing environment variable: ${key}`);
      throw new Error(`Missing environment variable: ${key}`);
    }
    vars[key] = value;
  }

  return vars as EnvVars;
})();
