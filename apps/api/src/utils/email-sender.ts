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

const RESEND_EMAIL_API_URL = "https://api.resend.com/emails";

function getEmailConfig() {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    throw new EmailSenderError(
      "Email sender belum dikonfigurasi",
      503,
      "email_sender_not_configured"
    );
  }

  return {
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM
  };
}

function getResponseStatus(response: unknown) {
  if (
    response &&
    typeof response === "object" &&
    "status" in response &&
    typeof (response as { status?: unknown }).status === "number"
  ) {
    return (response as { status: number }).status;
  }

  return 500;
}

function responseIsSuccessful(response: unknown) {
  const status = getResponseStatus(response);

  return status >= 200 && status < 300;
}

function getFailureReason(status: number) {
  if (status === 401 || status === 403) {
    return "email_provider_auth_or_domain_rejected";
  }

  if (status === 422) {
    return "email_provider_validation_error";
  }

  if (status === 429) {
    return "email_provider_rate_limited";
  }

  if (status >= 500) {
    return "email_provider_unavailable";
  }

  return "email_provider_error";
}

export const sendEmail: EmailSender = async (input) => {
  const { apiKey, from } = getEmailConfig();

  const response = await fetch(RESEND_EMAIL_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text
    })
  });

  if (!responseIsSuccessful(response)) {
    const status = getResponseStatus(response);

    throw new EmailSenderError(
      "Gagal mengirim email",
      status,
      getFailureReason(status)
    );
  }
};