import { destroySession } from "@/lib/auth";
import { jsonOk } from "@/lib/api-helpers";

export async function POST() {
  await destroySession();
  return jsonOk({ next: "/sign-in" });
}
