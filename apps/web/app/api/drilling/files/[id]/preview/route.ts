/**
 * Proxy del preview de archivos a FastAPI (Drilling).
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

  const res = await fetch(`${getApiBaseUrl()}/api/v1/drilling/files/${id}/preview`, {
    headers,
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Preview failed" }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
