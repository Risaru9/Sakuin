import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";
import { HttpError } from "./http-error.js";

export type VerifiedGoogleIdentity = {
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  pictureUrl: string | null;
};

export type GoogleIdTokenVerifier = (
  credential: string
) => Promise<VerifiedGoogleIdentity>;

const googleOAuthClient = new OAuth2Client();

function getGoogleClientId() {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new HttpError("Google Login belum dikonfigurasi", 503);
  }

  return env.GOOGLE_CLIENT_ID;
}

export const verifyGoogleIdToken: GoogleIdTokenVerifier = async (
  credential
) => {
  try {
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: credential,
      audience: getGoogleClientId()
    });

    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email) {
      throw new HttpError("Google credential tidak valid", 401);
    }

    return {
      providerAccountId: payload.sub,
      email: payload.email.trim().toLowerCase(),
      emailVerified: Boolean(payload.email_verified),
      name: payload.name?.trim() || null,
      pictureUrl: payload.picture?.trim() || null
    };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError("Google credential tidak valid", 401);
  }
};