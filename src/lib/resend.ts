import { Resend } from "resend";

type ExpiryReminderInput = {
  ownerName: string;
  ownerEmail: string;
  documentTitle: string;
  expiryDate: string;
  daysRemaining: number;
};

function createResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  return new Resend(apiKey);
}

export async function sendExpiryReminder({
  ownerName,
  ownerEmail,
  documentTitle,
  expiryDate,
  daysRemaining,
}: ExpiryReminderInput) {
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!fromEmail) {
    throw new Error("RESEND_FROM_EMAIL is not configured.");
  }

  const timing =
    daysRemaining < 0
      ? `expired ${Math.abs(daysRemaining)} day(s) ago`
      : daysRemaining === 0
        ? "has expired today"
        : daysRemaining === 1
          ? "expires in 1 day"
          : `expires in ${daysRemaining} days`;

  const resend = createResendClient();

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: ownerEmail,
    subject: `Expiry reminder: ${documentTitle}`,
    text: [
      `Hello ${ownerName},`,
      "",
      `Your document "${documentTitle}" ${timing}.`,
      `Expiry date: ${expiryDate}`,
      "",
      "Please open ExpiryWatch to review or renew this document.",
    ].join("\n"),
  });

  if (error) {
    throw new Error(`Resend failed: ${error.message}`);
  }

  return data;
}
