import { NextResponse } from "next/server";

/**
 * Member 3 owns the scheduled scan and email delivery. Keep the route explicit
 * and buildable until that integration is implemented; no notification is sent.
 */
export function GET() {
  return NextResponse.json(
    { ok: false, message: "Expiry scan is not configured yet." },
    { status: 501 },
  );
}
