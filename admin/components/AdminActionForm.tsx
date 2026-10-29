"use client";

import type { FormHTMLAttributes } from "react";
import { unstable_rethrow } from "next/navigation";

export const ADMIN_ACTION_NOTICE = "admin-action-notice";
export const FEEDBACK_PARAMS = [
  "updated",
  "refreshed",
  "sent",
  "error",
  "refresh",
  "eligibility",
];

export default function AdminActionForm({
  action,
  successMessage = "Changes saved successfully.",
  ...props
}: Omit<FormHTMLAttributes<HTMLFormElement>, "action"> & {
  action: (data: FormData) => Promise<void>;
  successMessage?: string;
}) {
  async function submit(data: FormData) {
    // Clear the previous result so repeated actions can display a fresh result.
    const url = new URL(window.location.href);
    for (const key of FEEDBACK_PARAMS) url.searchParams.delete(key);
    window.history.replaceState(null, "", url);
    window.dispatchEvent(
      new CustomEvent(ADMIN_ACTION_NOTICE, { detail: null })
    );
    try {
      await action(data);
      window.dispatchEvent(
        new CustomEvent(ADMIN_ACTION_NOTICE, {
          detail: { kind: "success", message: successMessage },
        })
      );
    } catch (error) {
      unstable_rethrow(error);
      window.dispatchEvent(
        new CustomEvent(ADMIN_ACTION_NOTICE, {
          detail: {
            kind: "error",
            message:
              "We couldn’t confirm this action completed. Check the current state before trying again.",
          },
        })
      );
    }
  }
  return <form {...props} action={submit} />;
}
