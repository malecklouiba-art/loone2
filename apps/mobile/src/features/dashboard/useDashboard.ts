// Données du dashboard : RDV/tâches du jour, derniers clients, insights, stats.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CalendarEvent, Client, Insight, Task } from "@loone/shared";

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { start, end } = todayRange();
      const [events, tasks, clients, insights] = await Promise.all([
        supabase
          .from("calendar_events")
          .select("*")
          .gte("start_at", start)
          .lte("start_at", end)
          .order("start_at"),
        supabase
          .from("tasks")
          .select("*")
          .neq("status", "done")
          .lte("due_at", end)
          .order("priority", { ascending: false }),
        supabase.from("clients").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("insights").select("*").eq("status", "new").limit(5),
      ]);

      return {
        events: (events.data ?? []) as CalendarEvent[],
        tasks: (tasks.data ?? []) as Task[],
        recentClients: (clients.data ?? []) as Client[],
        insights: (insights.data ?? []) as Insight[],
      };
    },
  });
}
