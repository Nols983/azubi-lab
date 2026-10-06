import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "./components/app-shell";
import { ServiceWorkerRegistration } from "./components/pwa/service-worker-registration";
import { LearnerProgressProvider } from "./lib/progress-store";
import { getLearnerBootstrap } from "./lib/server/learner-bootstrap";
import { getNotificationIndicatorView } from "./lib/server/notification-service";
import { getCurrentShellProfileView } from "./lib/server/profile-service";
import { canBypassLearningProgression } from "./lib/authorization";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Dashboard | Azubi Lab", template: "%s | Azubi Lab" },
  description: "Interaktive Lernplattform für Fachinformatiker Systemintegration.",
  applicationName: "Azubi Lab",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Azubi Lab",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/azubi-lab-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#172554",
};

// The shell contains per-request session/progress data and must never be shared across learners.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [learner, notifications, shellProfile] = await Promise.all([
    getLearnerBootstrap(),
    getNotificationIndicatorView(),
    getCurrentShellProfileView(),
  ]);
  return (
    <html lang="de" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <LearnerProgressProvider
          key={`${learner.mode}:${learner.learner?.id ?? "public"}`}
          mode={learner.mode}
          learnerId={learner.learner?.id}
          initialState={learner.initialState}
          initialError={learner.loadError}
          bypassProgression={Boolean(learner.learner && canBypassLearningProgression(learner.learner.role))}
        >
          <AppShell learner={learner.learner} notificationUnreadCount={notifications.unreadCount} shellProfile={shellProfile}>{children}</AppShell>
        </LearnerProgressProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
