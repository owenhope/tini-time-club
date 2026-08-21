import React, { createContext, useCallback, useRef } from "react";
import { usePathname, useRouter } from "expo-router";
import { useProfile } from "@/context/profile-context";
import { routes } from "@/utils/routes";
import type { MembershipIntent } from "@/utils/membership";
import AnalyticService from "@/services/analyticsService";

interface MembershipContextValue {
  isMember: boolean;
  /** Returns true for a member; otherwise presents the contextual join CTA. */
  requireMembership: (intent: MembershipIntent) => boolean;
  openMembership: (intent: MembershipIntent) => void;
}

const MembershipContext = createContext<MembershipContextValue | undefined>(
  undefined
);

export function MembershipProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = useProfile();
  const router = useRouter();
  const pathname = usePathname();
  const lastOpenedAtRef = useRef(0);

  const openMembership = useCallback(
    (intent: MembershipIntent) => {
      // One sheet, ever: a double-tap on a gated control (or two gated
      // actions firing in the same gesture) must not stack a second sheet.
      // The pathname check covers an already-presented sheet; the timestamp
      // covers the frames before the push has updated the pathname.
      const now = Date.now();
      if (
        pathname.startsWith("/membership") ||
        now - lastOpenedAtRef.current < 700
      ) {
        return;
      }
      lastOpenedAtRef.current = now;
      AnalyticService.capture("membership_gate_opened", {
        intent,
        source_path: pathname,
      });
      router.push(
        routes.membership({
          intent,
          returnTo: pathname,
        })
      );
    },
    [pathname, router]
  );

  const requireMembership = useCallback(
    (intent: MembershipIntent) => {
      if (profile) return true;
      openMembership(intent);
      return false;
    },
    [openMembership, profile]
  );

  return (
    <MembershipContext.Provider
      value={{
        isMember: Boolean(profile),
        requireMembership,
        openMembership,
      }}
    >
      {children}
    </MembershipContext.Provider>
  );
}

export const useMembership = (): MembershipContextValue => {
  const context = React.use(MembershipContext);
  if (!context) {
    throw new Error("useMembership must be used within MembershipProvider");
  }
  return context;
};
