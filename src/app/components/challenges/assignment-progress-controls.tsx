"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { startChallengeAssignmentAction } from "../../actions/challenge-actions";

export function AssignmentStartTracker({ assignmentId, shouldStart }: { assignmentId: string; shouldStart: boolean }) {
  const [message, setMessage] = useState("");
  const router = useRouter();
  useEffect(() => {
    if (!shouldStart) return;
    let active = true;
    startChallengeAssignmentAction(assignmentId).then((result) => {
      if (!active) return;
      if (result.ok) router.refresh();
      else setMessage(result.message);
    });
    return () => { active = false; };
  }, [assignmentId, router, shouldStart]);
  return <p className="text-sm font-semibold text-red-700" aria-live="assertive">{message}</p>;
}
