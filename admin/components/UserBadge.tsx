import type { AdminProfile } from "@/lib/data";
import { avatarPublicUrl } from "@/lib/avatar";
import { tierFor } from "@/lib/ranking";
import VerifiedBadge from "@/components/VerifiedBadge";

export { tierFor };

export default function UserBadge({
  profile,
  size = "default",
}: {
  profile: AdminProfile;
  size?: "default" | "compact";
}) {
  const tier = tierFor(profile.review_count);
  const username = profile.username ?? "Unknown member";
  const initial = username.charAt(0).toUpperCase();
  const avatarUrl = avatarPublicUrl(profile.avatar_url);
  const usernameClass =
    size === "compact"
      ? "flex items-center gap-1.5 truncate text-sm font-bold text-stone-900"
      : "flex items-center gap-1.5 truncate font-bold text-stone-900";

  return (
    <span className="flex min-w-0 items-center gap-3">
      {/* shrink-0: in a narrow flex row the ring flattens into an oval. */}
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] bg-stone-100 text-sm font-semibold text-stone-600"
        style={{ borderColor: tier.color }}
        title={`${tier.name} — ${profile.review_count ?? 0} reviews`}
      >
        {avatarUrl ? (
          <span
            className="h-full w-full bg-cover bg-center"
            style={{ backgroundImage: `url("${avatarUrl}")` }}
          />
        ) : (
          initial
        )}
      </span>
      <span className="min-w-0">
        <span className={usernameClass}>
          {username}
          {profile.is_verified ? <VerifiedBadge /> : null}
        </span>
        {profile.name ? (
          <span className="block truncate text-xs text-stone-500">
            {profile.name}
          </span>
        ) : null}
      </span>
    </span>
  );
}
