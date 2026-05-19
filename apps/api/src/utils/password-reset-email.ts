import { env } from "../config/env.js";
import { sendEmail } from "./email-sender.js";

export type PasswordResetEmailInput = {
  to: string;
  name: string;
  token: string;
};

export type PasswordResetEmailSender = (
  input: PasswordResetEmailInput
) => Promise<void>;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildPasswordResetUrl(token: string) {
  const url = new URL("/reset-password", env.FRONTEND_URL);

  url.searchParams.set("token", token);

  return url.toString();
}

export const sendPasswordResetEmail: PasswordResetEmailSender = async ({
  to,
  name,
  token
}) => {
  const resetUrl = buildPasswordResetUrl(token);
  const safeName = escapeHtml(name);
  const safeResetUrl = escapeHtml(resetUrl);

  await sendEmail({
    to,
    subject: "Reset password Sakuin",
    text: [
      `Halo ${name},`,
      "",
      "Kami menerima permintaan reset password untuk akun Sakuin kamu.",
      "Klik link berikut untuk membuat password baru:",
      resetUrl,
      "",
      "Link ini hanya berlaku sementara.",
      "Jika kamu tidak merasa meminta reset password, abaikan email ini.",
      "",
      "Sakuin"
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #171421;">
        <h2>Reset password Sakuin</h2>
        <p>Halo ${safeName},</p>
        <p>Kami menerima permintaan reset password untuk akun Sakuin kamu.</p>
        <p>
          <a href="${safeResetUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 12px; background: #171421; color: #ffffff; text-decoration: none; font-weight: 700;">
            Buat password baru
          </a>
        </p>
        <p>Link ini hanya berlaku sementara.</p>
        <p>Jika kamu tidak merasa meminta reset password, abaikan email ini.</p>
        <p style="color: #6b647a;">Sakuin</p>
      </div>
    `
  });
};