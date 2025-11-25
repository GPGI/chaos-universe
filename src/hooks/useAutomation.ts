import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AutomationSetting {
  id: string;
  owner_wallet: string;
  portfolio_id?: string;
  automation_type: 'auto_reinvest' | 'recurring_deposit' | 'rebalance';
  enabled: boolean;
  config: any;
  created_at: string;
  last_executed?: string;
}

export interface RecurringPayment {
  id: string;
  from_wallet: string;
  to_wallet?: string;
  amount: number;
  token_type: string;
  frequency: string;
  next_payment_date: string;
  enabled: boolean;
  created_at: string;
  last_payment_date?: string;
  payment_count: number;
}

export function useAutomation(walletAddress?: string | null) {
  const [automations, setAutomations] = useState<AutomationSetting[]>([]);
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAutomations = useCallback(async () => {
    if (!walletAddress) return;

    setLoading(true);
    try {
      const [automationsRes, paymentsRes] = await Promise.all([
        supabase
          .from('automation_settings')
          .select('*')
          .eq('owner_wallet', walletAddress),
        supabase
          .from('recurring_payments')
          .select('*')
          .eq('from_wallet', walletAddress),
      ]);

      if (automationsRes.error) throw automationsRes.error;
      if (paymentsRes.error) throw paymentsRes.error;

      setAutomations(automationsRes.data || []);
      setRecurringPayments(paymentsRes.data || []);
    } catch (error: any) {
      console.error("Error fetching automations:", error);
      toast.error("Failed to fetch automation settings");
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchAutomations();
  }, [fetchAutomations]);

  const createAutomation = async (data: {
    portfolio_id?: string;
    automation_type: 'auto_reinvest' | 'recurring_deposit' | 'rebalance';
    config: any;
  }) => {
    if (!walletAddress) {
      toast.error("Connect wallet first");
      return;
    }

    try {
      const { error } = await supabase.from('automation_settings').insert({
        owner_wallet: walletAddress,
        portfolio_id: data.portfolio_id,
        automation_type: data.automation_type,
        enabled: true,
        config: data.config,
      });

      if (error) throw error;
      toast.success("Automation created successfully");
      await fetchAutomations();
    } catch (error: any) {
      console.error("Error creating automation:", error);
      toast.error("Failed to create automation");
    }
  };

  const toggleAutomation = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('automation_settings')
        .update({ enabled })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Automation ${enabled ? 'enabled' : 'disabled'}`);
      await fetchAutomations();
    } catch (error: any) {
      console.error("Error toggling automation:", error);
      toast.error("Failed to update automation");
    }
  };

  const createRecurringPayment = async (data: {
    to_wallet?: string;
    amount: number;
    token_type: string;
    frequency: string;
    next_payment_date: string;
  }) => {
    if (!walletAddress) {
      toast.error("Connect wallet first");
      return;
    }

    try {
      const { error } = await supabase.from('recurring_payments').insert({
        from_wallet: walletAddress,
        to_wallet: data.to_wallet,
        amount: data.amount,
        token_type: data.token_type,
        frequency: data.frequency,
        next_payment_date: data.next_payment_date,
        enabled: true,
      });

      if (error) throw error;
      toast.success("Recurring payment created");
      await fetchAutomations();
    } catch (error: any) {
      console.error("Error creating recurring payment:", error);
      toast.error("Failed to create recurring payment");
    }
  };

  return {
    automations,
    recurringPayments,
    loading,
    createAutomation,
    toggleAutomation,
    createRecurringPayment,
    refresh: fetchAutomations,
  };
}
