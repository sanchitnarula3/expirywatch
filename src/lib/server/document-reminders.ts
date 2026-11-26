import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendExpiryReminder } from "@/lib/resend";
import type { ReminderMilestone } from "@/lib/expiry-reminders";
import type { Database } from "@/types/database";

type DocumentForReminder = Pick<
  Database["public"]["Tables"]["documents"]["Row"],
  "id" | "title" | "owner_id" | "expiry_date"
>;

type OwnerForReminder = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "full_name" | "email"
>;

export type DeliveryResult = "sent" | "already-sent";

export async function deliverDocumentReminder(params: {
  admin: SupabaseClient<Database>;
  document: DocumentForReminder;
  owner: OwnerForReminder;
  daysRemaining: number;
  milestone: ReminderMilestone;
}): Promise<DeliveryResult> {
  const { admin, document, owner, daysRemaining, milestone } = params;
  const { error: claimError } = await admin.from("expiry_reminder_deliveries").insert({
    document_id: document.id,
    expiry_date: document.expiry_date,
    milestone,
  });

  if (claimError) {
    if (claimError.code === "23505") return "already-sent";
    throw claimError;
  }

  try {
    await sendExpiryReminder({
      ownerName: owner.full_name,
      ownerEmail: owner.email,
      documentTitle: document.title,
      expiryDate: document.expiry_date,
      daysRemaining,
    });

    const { error: updateError } = await admin
      .from("expiry_reminder_deliveries")
      .update({ sent_at: new Date().toISOString() })
      .eq("document_id", document.id)
      .eq("expiry_date", document.expiry_date)
      .eq("milestone", milestone);

    if (updateError) throw updateError;
    return "sent";
  } catch (error) {
    // Release the claim so a later cron run can retry a failed delivery.
    await admin
      .from("expiry_reminder_deliveries")
      .delete()
      .eq("document_id", document.id)
      .eq("expiry_date", document.expiry_date)
      .eq("milestone", milestone)
      .is("sent_at", null);
    throw error;
  }
}
