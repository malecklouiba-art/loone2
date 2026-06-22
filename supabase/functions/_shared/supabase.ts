// Helpers Supabase pour les Edge Functions.
//
// PRINCIPE DE SÉCURITÉ : le client `service_role` bypass la RLS. On ne lui fait
// donc JAMAIS confiance pour l'isolation tenant : le workspace_id est toujours
// dérivé du JWT de l'appelant via getCallerWorkspace(), jamais reçu du client.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

/** Client service-role (écritures serveur). À scoper manuellement par workspace. */
export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

/** Identifie l'utilisateur appelant à partir du header Authorization (JWT). */
export async function requireUser(req: Request): Promise<{ id: string; email?: string }> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) throw new HttpError("unauthorized", "JWT manquant.", 401);

  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user) throw new HttpError("unauthorized", "JWT invalide.", 401);
  return { id: data.user.id, email: data.user.email ?? undefined };
}

/** Workspace primaire de l'appelant (dérivé du membership). */
export async function getCallerWorkspace(userId: string): Promise<string> {
  const svc = serviceClient();
  const { data, error } = await svc
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new HttpError("no_workspace", "Aucun workspace pour cet utilisateur.", 403);
  }
  return data.workspace_id as string;
}

export class HttpError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}
