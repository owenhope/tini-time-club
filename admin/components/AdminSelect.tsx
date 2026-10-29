import type { SelectHTMLAttributes } from "react";

export default function AdminSelect({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select
        {...props}
        className={`w-full appearance-none pl-3 pr-10 ${className}`}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        fill="none"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2"
      >
        <path
          d="m4 6 4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
