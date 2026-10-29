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
      {pending && (
        <span
          aria-hidden="true"
          className="mr-2 inline-block size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent align-middle"
        />
      )}
      <span aria-live="polite">{pending ? pendingLabel : children}</span>
    </button>
  );
}
