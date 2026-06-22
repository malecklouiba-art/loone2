// Accès aux clients via TanStack Query + Supabase (RLS protège le scope).
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Client } from "@loone/shared";

const KEY = ["clients"] as const;

export function useClients(search?: string) {
  return useQuery({
    queryKey: [...KEY, search ?? ""],
    queryFn: async (): Promise<Client[]> => {
      let q = supabase
        .from("clients")
        .select("*")
        .is("archived_at", null)
        .order("last_name", { ascending: true });
      if (search) {
        q = q.or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,company.ilike.%${search}%`,
        );
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Client[];
    },
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: [...KEY, "detail", id],
    queryFn: async (): Promise<Client> => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Client;
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Client>) => {
      const { data, error } = await supabase.from("clients").insert(input).select().single();
      if (error) throw error;
      return data as Client;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
