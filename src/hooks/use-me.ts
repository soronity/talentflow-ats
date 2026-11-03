import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Me = {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  isAdmin: boolean;
};

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<Me | null> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      ]);
      return {
        id: u.user.id,
        email: u.user.email ?? "",
        full_name: profile?.full_name ?? null,
        company_name: profile?.company_name ?? null,
        isAdmin: (roles ?? []).some((r) => r.role === "admin"),
      };
    },
  });
}

export function useCustomers(enabled: boolean) {
  return useQuery({
    queryKey: ["customers"],
    enabled,
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const customerIds = (roles ?? []).filter((r) => r.role === "customer").map((r) => r.user_id);
      if (!customerIds.length) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, company_name")
        .in("id", customerIds)
        .order("company_name");
      return data ?? [];
    },
  });
}
