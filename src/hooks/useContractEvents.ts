import { useEffect, useCallback } from "react";
import { getLandContract, getDigitalIDContract, hasLandContract } from "@/lib/contracts";

export function useContractEvents(
  onLandMinted?: (plotId: number, owner: string, price: bigint) => void,
  onIDRegistered?: (user: string, username: string) => void
) {
  const setupEventListeners = useCallback(() => {
    // Set up Land contract events
    if (hasLandContract()) {
      try {
        const landContract = getLandContract();
      
      // LandMinted event
      landContract.on("LandMinted", (plotId, owner, pricePaid, coldWallet, timestamp, event) => {
        console.log("LandMinted event:", { plotId: Number(plotId), owner, pricePaid });
        if (onLandMinted) {
          onLandMinted(Number(plotId), owner, pricePaid);
        }
      });
      } catch (error) {
        console.warn("Could not set up land contract events:", error);
      }
    }

    // Set up Digital ID contract events
    try {
      const digitalIDContract = getDigitalIDContract();
      
      digitalIDContract.on("IDRegistered", (user, username, timestamp, event) => {
        console.log("IDRegistered event:", { user, username });
        if (onIDRegistered) {
          onIDRegistered(user, username);
        }
      });
    } catch (error) {
      console.warn("Could not set up digital ID contract events:", error);
    }

    // Return cleanup function
    return () => {
      if (hasLandContract()) {
        try {
          const landContract = getLandContract();
          landContract.removeAllListeners("LandMinted");
        } catch (e) {}
      }
      
      try {
        const digitalIDContract = getDigitalIDContract();
        digitalIDContract.removeAllListeners("IDRegistered");
      } catch (e) {}
    };
  }, [onLandMinted, onIDRegistered]);

  useEffect(() => {
    const cleanup = setupEventListeners();
    return cleanup;
  }, [setupEventListeners]);
}

