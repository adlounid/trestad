import { NextRequest, NextResponse } from "next/server";

function isSiteLocked(): boolean {
  return process.env.SITE_ACCESS_LOCKED !== "false";
}

export function proxy(request: NextRequest): NextResponse | undefined {
  if (!isSiteLocked()) return undefined;
  if (!request.nextUrl.pathname.startsWith("/api/")) return undefined;
  return NextResponse.json({ error: "Åtkomsten är spärrad tills fakturan är betald." }, { status: 423 });
}

export const config = {
  matcher: ["/api/:path*"],
};
