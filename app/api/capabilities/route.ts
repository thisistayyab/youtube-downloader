import { NextResponse } from "next/server"

import { getAppCapabilities } from "@/lib/capabilities"

export const runtime = "nodejs"

export async function GET() {
  const capabilities = await getAppCapabilities()
  return NextResponse.json(capabilities)
}
