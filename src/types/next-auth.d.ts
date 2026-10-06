import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      displayName: string;
      login: string;
      authVersion: number;
    } & DefaultSession["user"];
  }

  interface User {
    displayName: string;
    login: string;
    authVersion: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    displayName?: string;
    login?: string;
    authVersion?: number;
  }
}
