import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Portfolio {
  id: string;
  owner_wallet: string;
  name: string;
  description?: string;
  initial_investment: number;
  current_value: number;
  roi_percent: number;
  created_at: string;
  updated_at: string;
  status: 'active' | 'paused' | 'closed';
  risk_level: string;
  auto_reinvest_enabled: boolean;
  auto_reinvest_percent: number;
  performance_history: any;
}

export function usePortfolio(walletAddress?: string | null) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalValue, setTotalValue] = useState(0);
  const [totalROI, setTotalROI] = useState(0);

  const fetchPortfolios = useCallback(async () => {
    if (!walletAddress) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('owner_wallet', walletAddress)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPortfolios(data || []);
      
      // Calculate totals
      const total = data?.reduce((sum, p) => sum + Number(p.current_value), 0) || 0;
      const totalInvested = data?.reduce((sum, p) => sum + Number(p.initial_investment), 0) || 0;
      const avgROI = totalInvested > 0 ? ((total - totalInvested) / totalInvested) * 100 : 0;
      
      setTotalValue(total);
      setTotalROI(avgROI);
    } catch (error: any) {
      console.error("Error fetching portfolios:", error);
      toast.error("Failed to fetch portfolios");
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchPortfolios();
  }, [fetchPortfolios]);

  const createPortfolio = async (data: {
    name: string;
    description?: string;
    initial_investment: number;
    risk_level?: string;
  }) => {
    if (!walletAddress) {
      toast.error("Connect wallet first");
      return;
    }

    try {
      const { error } = await supabase.from('portfolios').insert({
        owner_wallet: walletAddress,
        name: data.name,
        description: data.description,
        initial_investment: data.initial_investment,
        current_value: data.initial_investment,
        risk_level: data.risk_level || 'moderate',
        roi_percent: 0,
      });

      if (error) throw error;
      toast.success("Portfolio created successfully");
      await fetchPortfolios();
    } catch (error: any) {
      console.error("Error creating portfolio:", error);
      toast.error("Failed to create portfolio");
    }
  };

  const updateAutoReinvest = async (portfolioId: string, enabled: boolean, percent: number) => {
    try {
      const { error } = await supabase
        .from('portfolios')
        .update({
          auto_reinvest_enabled: enabled,
          auto_reinvest_percent: percent,
        })
        .eq('id', portfolioId);

      if (error) throw error;
      toast.success("Auto-reinvest settings updated");
      await fetchPortfolios();
    } catch (error: any) {
      console.error("Error updating auto-reinvest:", error);
      toast.error("Failed to update settings");
    }
  };

  return {
    portfolios,
    loading,
    totalValue,
    totalROI,
    createPortfolio,
    updateAutoReinvest,
    refresh: fetchPortfolios,
  };
}
