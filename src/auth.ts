import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { consumePasswordVerification, verifyPassword } from "./app/lib/server/password";
import {
  clearSuccessfulLoginAttempts,
  consumeLoginAttempt,
  SecurityRateLimitExceededError,
} from "./app/lib/server/security-rate-limit-service";
import { findUserForAuthentication } from "./app/lib/server/user-repository";

export class RateLimitedCredentialsSignin extends CredentialsSignin {
  code = "rate_limited";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  providers: [
    Credentials({
      credentials: {
        login: { label: "Benutzername oder Kennung", type: "text" },
        password: { label: "Passwort", type: "password" },
      },
      authorize: async (credentials, request) => {
        const login = typeof credentials.login === "string" ? credentials.login.trim() : "";
        const password = typeof credentials.password === "string" ? credentials.password : "";
        let rateLimitBuckets;
        try {
          rateLimitBuckets = await consumeLoginAttempt(login, request.headers);
        } catch (error) {
          if (error instanceof SecurityRateLimitExceededError) {
            throw new RateLimitedCredentialsSignin();
          }
          throw error;
        }
        if (!login || login.length > 254 || !password || password.length > 256) {
          await consumePasswordVerification(password);
          return null;
        }
        const user = await findUserForAuthentication(login);
        if (!user) {
          await consumePasswordVerification(password);
          return null;
        }
        const validPassword = await verifyPassword(password, user.passwordHash);
        if (!validPassword || user.disabledAt) return null;
        await clearSuccessfulLoginAttempts(rateLimitBuckets);
        return {
          id: user.id,
          name: user.displayName,
          displayName: user.displayName,
          login: user.login,
          authVersion: user.authVersion,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user
        && typeof user.id === "string"
        && typeof user.displayName === "string"
        && typeof user.login === "string"
        && Number.isSafeInteger(user.authVersion)
        && user.authVersion >= 1) {
        token.sub = user.id;
        token.displayName = user.displayName;
        token.login = user.login;
        token.authVersion = user.authVersion;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user
        && token.sub
        && typeof token.displayName === "string"
        && typeof token.login === "string"
        && Number.isSafeInteger(token.authVersion)
        && (token.authVersion as number) >= 1) {
        session.user.id = token.sub;
        session.user.name = token.displayName;
        session.user.displayName = token.displayName;
        session.user.login = token.login;
        session.user.authVersion = token.authVersion as number;
      }
      return session;
    },
  },
});
