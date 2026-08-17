"use client";

import { useRouter } from "next/navigation";
import { startAdminNavigation } from "@/components/AdminNavigationProgress";

const INTERACTIVE_SELECTOR =
  'a,button,input,select,textarea,label,[role="button"],[data-row-click-ignore]';

export default function ClickableRow({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();

  const shouldIgnore = (target: EventTarget | null) =>
    target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR));

  const navigate = () => {
    startAdminNavigation(href);
    router.push(href);
  };

  return (
    <tr
      className={className}
      role="link"
      tabIndex={0}
      onClick={(event) => {
        if (!shouldIgnore(event.target)) navigate();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        if (shouldIgnore(event.target)) return;
        event.preventDefault();
        navigate();
      }}
    >
      {children}
    </tr>
  );
}
