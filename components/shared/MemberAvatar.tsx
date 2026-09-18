import {
  useMemberPoints,
  type MemberPointsInput,
} from "@/hooks/useMemberPoints";
import React, { memo } from "react";
import Avatar from "./Avatar";
import AvatarRing from "./AvatarRing";
import type { MemberSummary } from "@/utils/memberSummary";

/** The avatar consumes member data, never a separately chosen rank number. */
export type AvatarMember = Partial<
  Pick<MemberSummary, "avatar_url" | "passport_points">
> &
  MemberPointsInput & {
    username?: string | null;
  };

interface MemberAvatarProps {
  member?: AvatarMember | null;
  size?: number;
  onInk?: boolean;
}

function MemberAvatar({ member, size = 40, onInk = false }: MemberAvatarProps) {
  const points = useMemberPoints(member);
  return (
    <AvatarRing passportPoints={points} size={size}>
      <Avatar
        key={member?.avatar_url ?? "initials"}
        avatarPath={member?.avatar_url}
        username={member?.username ?? undefined}
        size={size}
        onInk={onInk}
      />
    </AvatarRing>
  );
}

export default memo(MemberAvatar);
