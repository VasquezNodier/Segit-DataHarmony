/**
 * Proxy de descarga de archivos a FastAPI (Drilling).
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getApiBaseUrl } from "@/lib/api/url";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const token = (session as { accessToken?: string } | null)?.accessToken;
  const { id } = await params;

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${getApiBaseUrl()}/api/v1/drilling/files/${id}`, {
    headers,
  });

  if (!res.ok) {
    return NextResponse.json({ error: "File not found" }, { status: res.status });
  }

  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  const blob = await res.blob();

  return new NextResponse(blob, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition":
        res.headers.get("content-disposition") ?? `inline; filename="${id}"`,
      "Cache-Control": "no-store",
    },
  });
}
