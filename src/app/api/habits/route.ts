import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { habits } from "@/db/schema";
import { handleApiError, jsonOk, requireUser } from "@/lib/api-helpers";
import { habitCreateSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const rows = await db
    .select()
    .from(habits)
    .where(eq(habits.userId, auth.user.id))
    .orderBy(asc(habits.createdAt));
  return jsonOk({ habits: rows });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  try {
    const body = await request.json().catch(() => null);
    const data = habitCreateSchema.parse(body);
    const [habit] = await db
      .insert(habits)
      .values({ userId: auth.user.id, name: data.name, description: data.description ?? "", days: [...new Set(data.days)] })
      .returning();
    return jsonOk({ habit }, { status: 201 });
  } catch (e) {
    return handleApiError(e, "Could not create the habit. Please try again.");
  }
}
