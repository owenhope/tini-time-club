"use client";

import { useEffect } from "react";

export default function OpenInAppAttempt({ url }: { url: string }) {
  useEffect(() => {
    const id = window.setTimeout(() => {
      window.location.href = url;
    }, 350);
    return () => window.clearTimeout(id);
  }, [url]);

  return null;
}
