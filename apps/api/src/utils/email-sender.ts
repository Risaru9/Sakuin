import { env } from "../config/env.js";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailSender = (input: SendEmailInput) => Promise<void>;

const RESEND_EMAIL_API_URL = "https://api.resend.com/emails";

function getEmailConfig() {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    throw new Error("Email sender belum dikonfigurasi");
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
    throw new Error("Gagal mengirim email");
  }
};