import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { daysUntilExpiry, milestoneForCron } from "@/lib/expiry-reminders";
import { deliverDocumentReminder } from "@/lib/server/document-reminders";

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
    const now = new Date();

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
      const daysRemaining = daysUntilExpiry(document.expiry_date, now);
      const milestone = milestoneForCron(daysRemaining);

      if (milestone === null) {
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
        const result = await deliverDocumentReminder({
          admin: supabase,
          document,
          owner,
          daysRemaining,
          milestone,
        });
        if (result === "sent") sent += 1;
        else skipped += 1;
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
