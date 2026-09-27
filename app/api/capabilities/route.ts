import { NextResponse } from "next/server"

import { getAppCapabilities } from "@/lib/capabilities"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const capabilities = await getAppCapabilities(request)
  return NextResponse.json(capabilities)
}
