"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: string;
  pending?: boolean;
};

/** Follows the enclosing form, or an explicit transition for click actions. */
export default function AdminSubmitButton({
  children,
  pendingLabel = "Working…",
  pending: explicitPending,
  disabled,
  className = "",
  type = "submit",
  ...props
}: Props) {
  const form = useFormStatus();
  const pending = explicitPending ?? form.pending;

  return (
    <button
      {...props}
      type={type}
      disabled={disabled || pending}
      aria-busy={pending}
      className={`${className} disabled:cursor-wait disabled:opacity-70`}
    >
      <span
        className="inline-grid items-center align-middle"
        aria-live="polite"
      >
        <span
          className={`[grid-area:1/1] ${pending ? "invisible" : ""}`}
          aria-hidden={pending}
        >
          {children}
        </span>
        <span
          className={`inline-flex items-center justify-center gap-2 [grid-area:1/1] ${pending ? "" : "invisible"}`}
          aria-hidden={!pending}
        >
          <span
            aria-hidden="true"
            className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent"
          />
          {pendingLabel}
        </span>
      </span>
    </button>
  );
}
