import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MarketplaceListing {
  id: string;
  seller_wallet: string;
  asset_type: string;
  asset_id: string;
  price: number;
  token_type: string;
  description?: string;
  metadata: any;
  listed_at: string;
  sold_at?: string;
  buyer_wallet?: string;
  status: string;
}

export function useMarketplace() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('status', 'active')
        .order('listed_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error: any) {
      console.error("Error fetching listings:", error);
      toast.error("Failed to fetch marketplace listings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const createListing = async (data: {
    seller_wallet: string;
    asset_type: string;
    asset_id: string;
    price: number;
    token_type?: string;
    description?: string;
    metadata?: any;
  }) => {
    try {
      const { error } = await supabase.from('marketplace_listings').insert({
        seller_wallet: data.seller_wallet,
        asset_type: data.asset_type,
        asset_id: data.asset_id,
        price: data.price,
        token_type: data.token_type || 'xBGL',
        description: data.description,
        metadata: data.metadata || {},
        status: 'active',
      });

      if (error) throw error;
      toast.success("Listing created successfully");
      await fetchListings();
    } catch (error: any) {
      console.error("Error creating listing:", error);
      toast.error("Failed to create listing");
    }
  };

  const purchaseListing = async (listingId: string, buyerWallet: string) => {
    try {
      const { error } = await supabase
        .from('marketplace_listings')
        .update({
          status: 'sold',
          buyer_wallet: buyerWallet,
          sold_at: new Date().toISOString(),
        })
        .eq('id', listingId);

      if (error) throw error;
      toast.success("Purchase successful");
      await fetchListings();
    } catch (error: any) {
      console.error("Error purchasing listing:", error);
      toast.error("Failed to purchase");
    }
  };

  return {
    listings,
    loading,
    createListing,
    purchaseListing,
    refresh: fetchListings,
  };
}
