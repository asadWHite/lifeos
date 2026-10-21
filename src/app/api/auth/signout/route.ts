import { jsonOk } from "@/lib/api-helpers";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return jsonOk({ next: "/sign-in" });
}
