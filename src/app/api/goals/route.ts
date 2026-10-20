import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { goals } from "@/db/schema";
import { handleApiError, jsonOk, requireUser } from "@/lib/api-helpers";
import { goalCreateSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const rows = await db.select().from(goals).where(eq(goals.userId, auth.user.id)).orderBy(asc(goals.createdAt));
  return jsonOk({ goals: rows });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  try {
    const body = await request.json().catch(() => null);
    const data = goalCreateSchema.parse(body);
    const [goal] = await db
      .insert(goals)
      .values({
        userId: auth.user.id,
        title: data.title,
        description: data.description ?? "",
        category: data.category,
        targetDate: data.targetDate ?? null,
        targetValue: data.targetValue ?? null,
        unit: data.unit ?? "",
      })
      .returning();
    return jsonOk({ goal }, { status: 201 });
  } catch (e) {
    return handleApiError(e, "Could not create the goal. Please try again.");
  }
}
