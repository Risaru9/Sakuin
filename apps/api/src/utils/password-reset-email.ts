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

function buildTextEmail(resetUrl: string) {
  return [
    "Halo,",
    "",
    "Kami menerima permintaan untuk mengatur ulang password akun Sakuin Anda.",
    "",
    "Klik link berikut untuk membuat password baru:",
    resetUrl,
    "",
    "Link ini berlaku selama 30 menit dan hanya dapat digunakan satu kali.",
    "",
    "Jika Anda tidak meminta reset password, abaikan email ini. Password akun Anda tidak akan berubah sampai Anda membuat password baru melalui link di atas.",
    "",
    "Terima kasih,",
    "Tim Sakuin"
  ].join("\n");
}

function buildHtmlEmail(resetUrl: string) {
  const safeResetUrl = escapeHtml(resetUrl);

  return `
<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Reset password akun Sakuin</title>
  </head>
  <body style="margin:0;padding:0;background:#f7f4ed;font-family:Arial,Helvetica,sans-serif;color:#171421;">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;">
      Gunakan link ini untuk membuat password baru akun Sakuin Anda.
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f4ed;margin:0;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e7ded0;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 18px 28px;">
                <p style="margin:0 0 8px 0;font-size:14px;font-weight:700;color:#7c3aed;">
                  Sakuin
                </p>

                <h1 style="margin:0;font-size:24px;line-height:1.3;color:#171421;">
                  Reset password akun Anda
                </h1>

                <p style="margin:18px 0 0 0;font-size:15px;line-height:1.7;color:#5f5870;">
                  Kami menerima permintaan untuk mengatur ulang password akun Sakuin Anda.
                  Klik tombol di bawah ini untuk membuat password baru.
                </p>

                <p style="margin:24px 0;">
                  <a href="${safeResetUrl}" style="display:inline-block;background:#171421;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 18px;border-radius:14px;">
                    Buat password baru
                  </a>
                </p>

                <p style="margin:0;font-size:14px;line-height:1.7;color:#5f5870;">
                  Link ini berlaku selama <strong>30 menit</strong> dan hanya dapat digunakan satu kali.
                </p>

                <p style="margin:18px 0 0 0;font-size:14px;line-height:1.7;color:#5f5870;">
                  Jika tombol tidak bisa dibuka, salin dan tempel link berikut ke browser Anda:
                </p>

                <p style="margin:10px 0 0 0;word-break:break-all;font-size:13px;line-height:1.6;color:#4f46e5;">
                  <a href="${safeResetUrl}" style="color:#4f46e5;text-decoration:underline;">
                    ${safeResetUrl}
                  </a>
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 28px 28px 28px;border-top:1px solid #eee6dc;">
                <p style="margin:0;font-size:13px;line-height:1.7;color:#6b647a;">
                  Jika Anda tidak meminta reset password, abaikan email ini. Password akun Anda tidak akan berubah sampai Anda membuat password baru melalui link di atas.
                </p>

                <p style="margin:18px 0 0 0;font-size:13px;line-height:1.7;color:#6b647a;">
                  Terima kasih,<br />
                  Tim Sakuin
                </p>
              </td>
            </tr>
          </table>

          <p style="max-width:560px;margin:16px auto 0 auto;font-size:12px;line-height:1.6;color:#8a8298;">
            Email ini dikirim karena ada permintaan reset password untuk akun Sakuin.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

export const sendPasswordResetEmail: PasswordResetEmailSender = async ({
  to,
  token
}) => {
  const resetUrl = buildPasswordResetUrl(token);

  await sendEmail({
    to,
    subject: "Reset password akun Sakuin",
    text: buildTextEmail(resetUrl),
    html: buildHtmlEmail(resetUrl)
  });
};