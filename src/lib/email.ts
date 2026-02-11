import nodemailer from "nodemailer";

export interface SendEmailOptions {
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: {
    filename: string;
    content: Buffer | Uint8Array | string;
    contentType?: string;
  }[];
}

function normalizeAttachments(
  attachments: SendEmailOptions["attachments"],
): { filename: string; content: Buffer | string; contentType?: string }[] | undefined {
  if (!attachments?.length) return undefined;

  return attachments.map((a) => {
    if (typeof a.content === "string" || Buffer.isBuffer(a.content)) {
      return {
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      };
    }

    return {
      ...a,
      content: Buffer.from(a.content),
    };
  });
}

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM ?? smtpUser;

if (!smtpHost || !smtpUser || !smtpPass) {
  console.warn("[email] SMTP configuration is incomplete. Emails will not be sent.");
}

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
});

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn("[email] Missing SMTP configuration, skipping sendEmail.");
    return;
  }

  if (!options.to.length) {
    console.warn("[email] No recipients provided, skipping sendEmail.");
    return;
  }

  try {
    console.log(
      `[email] sending to=${options.to.join(",")} subject=${options.subject} attachments=${options.attachments?.length ?? 0}`,
    );

    await transporter.sendMail({
      from: smtpFrom,
      to: options.to.join(","),
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: normalizeAttachments(options.attachments),
    });

    console.log("[email] sendMail success");
  } catch (err) {
    console.error("[email] sendMail failed", err);
    throw err;
  }
}
