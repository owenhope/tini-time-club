import React from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Avatar, Skeleton, VerifiedName } from "@/components/shared";
import type { Regular } from "@/services/regularsService";
import { useProfile } from "@/context/profile-context";
import { fonts, makeStyles } from "@/theme";
import { routes } from "@/utils/routes";

interface RegularsProps {
  regulars?: Regular[] | null;
  variant?: "default" | "compact" | "dense";
  showLabel?: boolean;
  /** Rendered on a green ground, where the default greys disappear. */
  onInk?: boolean;
}

type DisplayRegular = Regular & { isPreview?: boolean };

/**
 * Placeholder for the dense Regulars column while regulars load, sized to the
 * loaded rows so the surrounding layout doesn't shift when data arrives.
 */
export const RegularsSkeleton = () => {
  const styles = useStyles();
  return (
    <View style={styles.denseSection}>
      <Skeleton width={52} height={12} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.densePerson}>
          <Skeleton circle height={26} />
          <View style={styles.skeletonIdentity}>
            <Skeleton width="80%" height={10} />
            <Skeleton width="50%" height={8} />
          </View>
        </View>
      ))}
    </View>
  );
};

const Regulars: React.FC<RegularsProps> = ({
  regulars,
  variant = "default",
  onInk = false,
  showLabel = true,
}) => {
  const styles = useStyles();
  const router = useRouter();
  const { profile } = useProfile();

  // Your own row lands on your Profile tab — the shared /users/[username]
  // route renders the visitor view, Follow button and all.
  const openRegular = (regular: DisplayRegular) => {
    if (String(profile?.id) === String(regular.profile_id)) {
      router.navigate(routes.profile());
    } else {
      router.push(routes.user(regular.username));
    }
  };

  if (!regulars?.length) return null;

  const displayRegulars: DisplayRegular[] =
    __DEV__ && regulars.length === 1
      ? [
          regulars[0],
          {
            ...regulars[0],
            profile_id: "preview-regular-2",
            rank: 2,
            username: "NorthShoreSips",
            avatar_url: null,
            is_verified: false,
            profile_review_count: undefined,
            review_count: 1,
            isPreview: true,
          },
          {
            ...regulars[0],
            profile_id: "preview-regular-3",
            rank: 3,
            username: "MartiniMaven",
            avatar_url: null,
            is_verified: false,
            profile_review_count: undefined,
            review_count: 1,
            isPreview: true,
          },
        ]
      : regulars;

  if (variant === "compact") {
    return (
      <View
        style={[
          styles.compactSection,
          !showLabel && styles.compactSectionUnlabeled,
        ]}
      >
        {showLabel ? <Text style={styles.label}>Regulars</Text> : null}
        <View style={styles.compactRow}>
          <View style={styles.avatarStack}>
            {displayRegulars.map((regular, index) => (
              <Pressable
                key={regular.profile_id}
                onPress={
                  regular.isPreview ? undefined : () => openRegular(regular)
                }
                style={[
                  styles.stackedAvatar,
                  index > 0 && styles.avatarOverlap,
                ]}
                accessibilityRole={regular.isPreview ? "text" : "link"}
                accessibilityLabel={
                  regular.isPreview
                    ? `${regular.username}, preview regular`
                    : `View ${regular.username}'s profile`
                }
              >
                <Avatar
                  avatarPath={regular.avatar_url}
                  username={regular.username}
                  size={28}
                  reviewCount={regular.profile_review_count}
                />
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (variant === "dense") {
    const renderDenseRegular = (regular: DisplayRegular) => (
      <Pressable
        key={regular.profile_id}
        onPress={regular.isPreview ? undefined : () => openRegular(regular)}
        style={({ pressed }) => [styles.densePerson, pressed && styles.pressed]}
        accessibilityRole={regular.isPreview ? "text" : "link"}
        accessibilityLabel={`${regular.username}, regular with ${regular.review_count} reviews`}
      >
        <Avatar
          avatarPath={regular.avatar_url}
          username={regular.username}
          size={26}
          reviewCount={regular.profile_review_count}
        />
        <View style={styles.identity}>
          <VerifiedName
            name={regular.username}
            isVerified={regular.is_verified}
            badgeSize={12}
            onDark={onInk}
            textStyle={[styles.denseUsername, onInk && styles.onInkText]}
          />
          <Text style={[styles.denseReviewCount, onInk && styles.onInkMeta]}>
            {regular.review_count}{" "}
            {regular.review_count === 1 ? "review" : "reviews"}
          </Text>
        </View>
      </Pressable>
    );

    return (
      <View style={styles.denseSection}>
        <Text style={[styles.label, onInk && styles.onInkMeta]}>Regulars</Text>
        {displayRegulars.map(renderDenseRegular)}
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Regulars</Text>
      {displayRegulars.map((regular) => (
        <Pressable
          key={regular.profile_id}
          onPress={regular.isPreview ? undefined : () => openRegular(regular)}
          style={({ pressed }) => [styles.person, pressed && styles.pressed]}
          accessibilityRole={regular.isPreview ? "text" : "link"}
          accessibilityLabel={`${regular.username}, number ${regular.rank} regular with ${regular.review_count} reviews`}
        >
          <Text style={styles.rank}>#{regular.rank}</Text>
          <Avatar
            avatarPath={regular.avatar_url}
            username={regular.username}
            size={34}
            reviewCount={regular.profile_review_count}
          />
          <View style={styles.identity}>
            <VerifiedName
              name={regular.username}
              isVerified={regular.is_verified}
              textStyle={styles.username}
            />
            <Text style={styles.reviewCount}>
              {regular.review_count}{" "}
              {regular.review_count === 1 ? "review" : "reviews"}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  section: {
    gap: t.spacing.sm,
  },
  compactSection: {
    marginTop: t.spacing.sm,
    gap: t.spacing.xs,
  },
  compactSectionUnlabeled: {
    marginTop: 0,
    gap: 0,
  },
  denseSection: {
    gap: 6,
  },
  label: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  person: {
    minHeight: 42,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  densePerson: {
    minHeight: 30,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  pressed: {
    opacity: 0.6,
  },
  rank: {
    width: 22,
    ...t.typography.caption,
    fontFamily: fonts.bold,
    color: t.colors.accent,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  skeletonIdentity: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  username: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
  },
  reviewCount: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  denseUsername: {
    fontSize: 13,
    lineHeight: 15,
    fontFamily: fonts.semibold,
    color: t.colors.text,
  },
  denseReviewCount: {
    ...t.typography.micro,
    color: t.colors.textSecondary,
  },
  onInkText: {
    color: t.colors.onInk,
  },
  onInkMeta: {
    color: t.colors.onInk,
    opacity: 0.8,
  },
  compactRow: {
    minHeight: 30,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  avatarStack: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  stackedAvatar: {
    borderWidth: 2,
    borderColor: t.colors.surface,
    borderRadius: t.radius.pill,
  },
  avatarOverlap: {
    marginLeft: -8,
  },
}));

export default Regulars;
