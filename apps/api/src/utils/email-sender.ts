import * as nodemailer from "nodemailer";
import { env } from "../config/env.js";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailSender = (input: SendEmailInput) => Promise<void>;

export class EmailSenderError extends Error {
  status: number;
  reason: string;

  constructor(message: string, status = 500, reason = "email_provider_error") {
    super(message);

    this.name = "EmailSenderError";
    this.status = status;
    this.reason = reason;
  }
}

type SmtpErrorLike = {
  code?: unknown;
  responseCode?: unknown;
};

function getEmailConfig() {
  if (!env.SMTP_USER || !env.SMTP_PASS || !env.EMAIL_FROM) {
    throw new EmailSenderError(
      "Email sender belum dikonfigurasi",
      503,
      "email_sender_not_configured"
    );
  }

  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.EMAIL_FROM
  };
}

function getSmtpErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as SmtpErrorLike).code;

    if (typeof code === "string") {
      return code;
    }
  }

  return null;
}

function getSmtpResponseCode(error: unknown) {
  if (error && typeof error === "object" && "responseCode" in error) {
    const responseCode = (error as SmtpErrorLike).responseCode;

    if (typeof responseCode === "number") {
      return responseCode;
    }
  }

  return 500;
}

function getSmtpFailureReason(error: unknown) {
  const code = getSmtpErrorCode(error);
  const responseCode = getSmtpResponseCode(error);

  if (code === "EAUTH" || responseCode === 534 || responseCode === 535) {
    return "smtp_auth_failed";
  }

  if (
    code === "ECONNECTION" ||
    code === "ETIMEDOUT" ||
    code === "ESOCKET"
  ) {
    return "smtp_connection_failed";
  }

  if (responseCode === 550 || responseCode === 553 || responseCode === 554) {
    return "smtp_sender_or_recipient_rejected";
  }

  if (responseCode === 421 || responseCode === 450 || responseCode === 451) {
    return "smtp_provider_temporarily_unavailable";
  }

  return "smtp_email_send_failed";
}

export const sendEmail: EmailSender = async (input) => {
  const config = getEmailConfig();

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });

  try {
    await transporter.sendMail({
      from: config.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text
    });
  } catch (error) {
    throw new EmailSenderError(
      "Gagal mengirim email",
      getSmtpResponseCode(error),
      getSmtpFailureReason(error)
    );
  }
};