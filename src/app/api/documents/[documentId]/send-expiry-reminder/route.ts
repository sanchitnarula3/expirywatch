import { NextResponse } from "next/server";
import {
  daysUntilExpiry,
  milestoneForImmediateUpload,
} from "@/lib/expiry-reminders";
import { deliverDocumentReminder } from "@/lib/server/document-reminders";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ documentId: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
    }

    const { documentId } = await context.params;
    const { data: document, error } = await supabase
      .from("documents")
      .select("id, title, owner_id, expiry_date")
      .eq("id", documentId)
      .single();

    if (error || !document) {
      return NextResponse.json({ ok: false, message: "Document not found." }, { status: 404 });
    }

    const daysRemaining = daysUntilExpiry(document.expiry_date);
    const milestone = milestoneForImmediateUpload(daysRemaining);
    if (milestone === null) {
      return NextResponse.json({ ok: true, sent: false, reason: "not-a-milestone" });
    }

    const admin = createAdminClient();
    const { data: owner, error: ownerError } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", document.owner_id)
      .single();
    if (ownerError || !owner?.email) throw ownerError ?? new Error("Owner email is missing.");

    const result = await deliverDocumentReminder({
      admin,
      document,
      owner,
      daysRemaining,
      milestone,
    });
    return NextResponse.json({ ok: true, sent: result === "sent", reason: result });
  } catch (error) {
    console.error("Immediate expiry reminder failed:", error);
    return NextResponse.json({ ok: false, message: "Reminder delivery failed." }, { status: 500 });
  }
}
