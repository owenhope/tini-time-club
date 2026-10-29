"use client";

import type { ReactNode } from "react";

// Invoke through React so BotID can attach verification headers to the request.
export default function PublicSubmissionForm({
  action,
  className,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  className?: string;
  children: ReactNode;
}) {
  async function handleAction(formData: FormData) {
    await action(formData);
  }

  return (
    <form action={handleAction} className={className}>
      <noscript>
        <p role="alert">Enable JavaScript to verify and send this form.</p>
      </noscript>
      {children}
    </form>
  );
}
