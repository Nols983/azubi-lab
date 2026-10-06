"use client";

import Image from "next/image";
import { useState } from "react";

export function ProfileAvatar({
  displayName,
  initials,
  src,
  size = "large",
  decorative = false,
  progressRingPercentage,
}: {
  displayName: string;
  initials: string;
  src?: string;
  size?: "small" | "medium" | "large" | "xlarge";
  decorative?: boolean;
  progressRingPercentage?: number;
}) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const dimensions = size === "xlarge" ? "size-48 rounded-3xl text-5xl"
    : size === "small" ? "size-11 rounded-xl text-sm"
    : size === "medium" ? "size-14 rounded-2xl text-base"
    : "size-20 rounded-2xl text-2xl";
  const pixels = size === "xlarge" ? 192 : size === "small" ? 44 : size === "medium" ? 56 : 80;
  const avatar = src && failedSrc !== src
    ? <Image src={src} alt={decorative ? "" : `Profilbild von ${displayName}`} width={pixels} height={pixels} unoptimized onError={() => setFailedSrc(src)} className={`${dimensions} shrink-0 object-cover shadow-sm`} />
    : (
      <span
        aria-hidden={decorative ? "true" : undefined}
        aria-label={decorative ? undefined : `Initialen von ${displayName}: ${initials}`}
        role={decorative ? undefined : "img"}
        className={`flex ${dimensions} shrink-0 items-center justify-center bg-blue-950 font-bold tracking-wide text-white shadow-sm`}
      >
        {initials}
      </span>
    );
  if (progressRingPercentage === undefined) return avatar;
  const ring = Number.isFinite(progressRingPercentage)
    ? Math.max(0, Math.min(100, progressRingPercentage))
    : 0;
  return (
    <span
      className="inline-flex shrink-0 self-start rounded-[2rem] p-1.5"
      style={{ background: `conic-gradient(var(--color-blue-800) ${ring}%, var(--color-slate-200) ${ring}% 100%)` }}
    >
      <span className="rounded-[1.7rem] bg-white p-1">{avatar}</span>
    </span>
  );
}
