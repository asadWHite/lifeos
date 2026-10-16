export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    mode: "local-first",
    persistence: "browser-localStorage",
  });
}
