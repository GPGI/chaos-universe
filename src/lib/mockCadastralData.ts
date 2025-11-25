/**
 * Mock Cadastral Data Generator
 * Generates realistic cadastral administrative data for the Octavia Nebula Core system
 * 
 * Usage:
 *   import { generateMockPlotsWithPattern } from "@/lib/mockCadastralData";
 *   const plots = generateMockPlotsWithPattern(10000, { ownershipRate: 0.3 });
 */

// Set to true to always use mock data (useful for development/demo)
export const USE_MOCK_DATA = (import.meta as any).env?.VITE_USE_MOCK_DATA === "true" || false;

export interface MockPlot {
  id: number;
  x: number;
  y: number;
  type: string;
  owner?: string;
  ownerName?: string;
  building?: string;
  occupied?: boolean;
  coordinates?: string;
  zoneType?: string;
  registrationDate?: string;
  transactionHash?: string;
  contractAddress?: string;
  tokenId?: number;
}

const ZONE_TYPES = ["residential", "commercial", "industrial", "mixed-use", "agricultural"];
const BUILDING_TYPES = [
  "Residential Complex",
  "Commercial Building",
  "Industrial Facility",
  "Warehouse",
  "Office Tower",
  "Retail Center",
  "Apartment Building",
  "Villa",
  "Factory",
  "Storage Facility",
  null, // Some plots have no buildings
];

const OWNER_NAMES = [
  "Ivan Petrov",
  "Maria Georgieva",
  "Dimitar Stoyanov",
  "Elena Nikolova",
  "Georgi Ivanov",
  "Svetlana Dimitrova",
  "Petar Todorov",
  "Anna Petrova",
  "Nikolay Vasilev",
  "Rumyana Stoyanova",
  "Vladimir Kostov",
  "Tsvetelina Marinova",
  "Stoyan Petrov",
  "Daniela Georgieva",
  "Hristo Nikolov",
  "Yana Ivanova",
  "Krasimir Dimitrov",
  "Bilyana Todorova",
  "Martin Petrov",
  "Radostina Stoyanova",
];

const CONTRACT_ADDRESSES = [
  "0x1234567890123456789012345678901234567890",
  "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  "0x9876543210987654321098765432109876543210",
  "0xfedcba0987654321fedcba0987654321fedcba09",
];

/**
 * Generate a random transaction hash
 */
function generateTxHash(): string {
  return "0x" + Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

/**
 * Generate cadastral coordinates
 */
function generateCoordinates(plotId: number, x: number, y: number): string {
  const sector = Math.floor(plotId / 1000) + 1;
  const block = Math.floor((plotId % 1000) / 100) + 1;
  const parcel = (plotId % 100) + 1;
  return `Sector ${sector}, Block ${block}, Parcel ${parcel}`;
}

/**
 * Generate registration date (random date within last 2 years)
 */
function generateRegistrationDate(): string {
  const now = new Date();
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
  const randomTime = twoYearsAgo.getTime() + Math.random() * (now.getTime() - twoYearsAgo.getTime());
  const date = new Date(randomTime);
  return date.toLocaleDateString("en-GB", { 
    year: "numeric", 
    month: "2-digit", 
    day: "2-digit" 
  });
}

/**
 * Generate a random wallet address
 */
function generateWalletAddress(): string {
  return "0x" + Array.from({ length: 40 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

/**
 * Generate mock cadastral plot data
 */
export function generateMockPlot(
  id: number,
  x: number,
  y: number,
  baseType: string = "residential"
): MockPlot {
  // Determine if plot is owned (30% chance)
  const isOwned = Math.random() < 0.3;
  
  // Determine zone type (can differ from base type)
  const zoneType = ZONE_TYPES[Math.floor(Math.random() * ZONE_TYPES.length)];
  
  // Determine if plot has building (only if owned, 60% chance)
  const hasBuilding = isOwned && Math.random() < 0.6;
  const building = hasBuilding 
    ? BUILDING_TYPES[Math.floor(Math.random() * BUILDING_TYPES.length)] || undefined
    : undefined;
  
  // Determine if occupied (only if owned and has building, 70% chance)
  const occupied = isOwned && hasBuilding && Math.random() < 0.7;
  
  const plot: MockPlot = {
    id,
    x,
    y,
    type: baseType.toLowerCase(),
    zoneType,
    coordinates: generateCoordinates(id, x, y),
  };
  
  if (isOwned) {
    const ownerName = OWNER_NAMES[Math.floor(Math.random() * OWNER_NAMES.length)];
    const owner = generateWalletAddress();
    
    plot.owner = owner;
    plot.ownerName = ownerName;
    plot.registrationDate = generateRegistrationDate();
    plot.transactionHash = generateTxHash();
    plot.contractAddress = CONTRACT_ADDRESSES[Math.floor(Math.random() * CONTRACT_ADDRESSES.length)];
    plot.tokenId = id;
    
    if (building) {
      plot.building = building;
    }
    
    if (occupied) {
      plot.occupied = true;
    }
  }
  
  return plot;
}

/**
 * Generate multiple mock plots
 */
export function generateMockPlots(
  count: number,
  baseType: string = "residential"
): MockPlot[] {
  const plots: MockPlot[] = [];
  
  for (let i = 1; i <= count; i++) {
    // Generate circular coordinates (will be overridden by grid layout, but useful for testing)
    const angle = (i * 137.508) % 360; // Golden angle for even distribution
    const radius = Math.sqrt(i) * 10;
    const x = Math.cos(angle * Math.PI / 180) * radius;
    const y = Math.sin(angle * Math.PI / 180) * radius;
    
    plots.push(generateMockPlot(i, x, y, baseType));
  }
  
  return plots;
}

/**
 * Generate mock plots with specific ownership patterns
 * Useful for testing different scenarios
 * Optimized for performance with batch generation
 */
export function generateMockPlotsWithPattern(
  count: number,
  options: {
    baseType?: string;
    ownershipRate?: number; // 0-1, percentage of plots that are owned
    buildingRate?: number; // 0-1, percentage of owned plots with buildings
    occupiedRate?: number; // 0-1, percentage of buildings that are occupied
  } = {}
): MockPlot[] {
  const {
    baseType = "residential",
    ownershipRate = 0.3,
    buildingRate = 0.6,
    occupiedRate = 0.7,
  } = options;
  
  const plots: MockPlot[] = new Array(count);
  
  // Pre-generate random values for better performance
  const randomValues = new Array(count);
  for (let i = 0; i < count; i++) {
    randomValues[i] = Math.random();
  }
  
  // Batch process for better performance
  for (let i = 0; i < count; i++) {
    const plotId = i + 1;
    const angle = (plotId * 137.508) % 360;
    const radius = Math.sqrt(plotId) * 10;
    const x = Math.cos(angle * Math.PI / 180) * radius;
    const y = Math.sin(angle * Math.PI / 180) * radius;
    
    const isOwned = randomValues[i] < ownershipRate;
    const zoneType = ZONE_TYPES[Math.floor(randomValues[i] * ZONE_TYPES.length)];
    
    const plot: MockPlot = {
      id: plotId,
      x,
      y,
      type: baseType.toLowerCase(),
      zoneType,
      coordinates: generateCoordinates(plotId, x, y),
    };
    
    if (isOwned) {
      const ownerIndex = Math.floor(randomValues[i] * OWNER_NAMES.length);
      const ownerName = OWNER_NAMES[ownerIndex];
      const owner = generateWalletAddress();
      
      plot.owner = owner;
      plot.ownerName = ownerName;
      plot.registrationDate = generateRegistrationDate();
      plot.transactionHash = generateTxHash();
      plot.contractAddress = CONTRACT_ADDRESSES[Math.floor(randomValues[i] * CONTRACT_ADDRESSES.length)];
      plot.tokenId = plotId;
      
      const buildingRandom = Math.random();
      if (buildingRandom < buildingRate) {
        const building = BUILDING_TYPES[Math.floor(buildingRandom * BUILDING_TYPES.length)];
        if (building) {
          plot.building = building;
          plot.occupied = Math.random() < occupiedRate;
        }
      }
    }
    
    plots[i] = plot;
  }
  
  return plots;
}

