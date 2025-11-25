import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PortfolioManager {
  id: string;
  wallet_address: string;
  display_name: string;
  bio?: string;
  verified: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
  roi_annualized: number;
  sharpe_ratio: number;
  total_followers: number;
  performance_start_date?: string;
  applied_at: string;
  approved_at?: string;
  track_record: any;
  management_fee_percent: number;
}

export function usePortfolioManagers() {
  const [managers, setManagers] = useState<PortfolioManager[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchManagers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('portfolio_managers')
        .select('*')
        .eq('approval_status', 'approved')
        .order('roi_annualized', { ascending: false });

      if (error) throw error;
      setManagers(data || []);
    } catch (error: any) {
      console.error("Error fetching managers:", error);
      toast.error("Failed to fetch portfolio managers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManagers();
  }, [fetchManagers]);

  const applyAsManager = async (data: {
    wallet_address: string;
    display_name: string;
    bio?: string;
    roi_annualized: number;
    sharpe_ratio: number;
  }) => {
    try {
      const { error } = await supabase.from('portfolio_managers').insert({
        wallet_address: data.wallet_address,
        display_name: data.display_name,
        bio: data.bio,
        roi_annualized: data.roi_annualized,
        sharpe_ratio: data.sharpe_ratio,
        performance_start_date: new Date().toISOString(),
        approval_status: 'pending',
      });

      if (error) throw error;
      toast.success("Application submitted for review");
    } catch (error: any) {
      console.error("Error applying as manager:", error);
      toast.error("Failed to submit application");
    }
  };

  const followManager = async (followerWallet: string, managerWallet: string, amount: number) => {
    try {
      const { error } = await supabase.from('portfolio_followers').insert({
        follower_wallet: followerWallet,
        manager_wallet: managerWallet,
        allocation_amount: amount,
        copy_percent: 100,
        active: true,
      });

      if (error) throw error;

      // Update follower count
      const { data: manager } = await supabase
        .from('portfolio_managers')
        .select('total_followers')
        .eq('wallet_address', managerWallet)
        .single();
      
      if (manager) {
        await supabase
          .from('portfolio_managers')
          .update({ total_followers: (manager.total_followers || 0) + 1 })
          .eq('wallet_address', managerWallet);
      }
      
      toast.success("Successfully following manager");
      await fetchManagers();
    } catch (error: any) {
      console.error("Error following manager:", error);
      toast.error("Failed to follow manager");
    }
  };

  return {
    managers,
    loading,
    applyAsManager,
    followManager,
    refresh: fetchManagers,
  };
}
