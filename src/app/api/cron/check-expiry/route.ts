import { NextResponse } from "next/server";
import { sendExpiryReminder } from "@/lib/resend";
import { createAdminClient } from "@/lib/supabase/server";

const DAY_MS = 86_400_000;

function startOfUtcDay(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

function daysUntilExpiry(expiryDate: string, today: Date): number {
  const expiry = new Date(expiryDate + "T00:00:00Z");
  return Math.ceil((expiry.getTime() - today.getTime()) / DAY_MS);
}

function wasNotifiedToday(lastNotifiedAt: string | null, today: Date): boolean {
  if (!lastNotifiedAt) return false;

  return (
    new Date(lastNotifiedAt).toISOString().slice(0, 10) ===
    today.toISOString().slice(0, 10)
  );
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || authorization !== "Bearer " + cronSecret) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized." },
      { status: 401 },
    );
  }

  try {
    const supabase = createAdminClient();
    const today = startOfUtcDay(new Date());

    const [
      { data: documents, error: documentsError },
      { data: profiles, error: profilesError },
    ] = await Promise.all([
      supabase.from("documents").select("*"),
      supabase.from("profiles").select("id, full_name, email"),
    ]);

    if (documentsError) throw documentsError;
    if (profilesError) throw profilesError;

    const profilesById = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile]),
    );

    let eligible = 0;
    let sent = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const document of documents ?? []) {
      const daysRemaining = daysUntilExpiry(document.expiry_date, today);
      const isInsideReminderWindow =
        daysRemaining >= 0 &&
        daysRemaining <= document.reminder_days_before;

      if (
        !isInsideReminderWindow ||
        wasNotifiedToday(document.last_notified_at, today)
      ) {
        skipped += 1;
        continue;
      }

      eligible += 1;
      const owner = profilesById.get(document.owner_id);

      if (!owner?.email) {
        failed += 1;
        errors.push("Document " + document.id + " has no owner email.");
        continue;
      }

      try {
        await sendExpiryReminder({
          ownerName: owner.full_name,
          ownerEmail: owner.email,
          documentTitle: document.title,
          expiryDate: document.expiry_date,
          daysRemaining,
        });

        const { error: updateError } = await supabase
          .from("documents")
          .update({ last_notified_at: new Date().toISOString() })
          .eq("id", document.id);

        if (updateError) throw updateError;
        sent += 1;
      } catch (error) {
        failed += 1;
        errors.push(
          "Document " +
            document.id +
            ": " +
            (error instanceof Error ? error.message : "Unknown error"),
        );
      }
    }

    return NextResponse.json({
      ok: failed === 0,
      scanned: documents?.length ?? 0,
      eligible,
      sent,
      skipped,
      failed,
      errors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Expiry scan failed.",
      },
      { status: 500 },
    );
  }
}
