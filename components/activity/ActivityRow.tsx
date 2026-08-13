import React, { memo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import type { ActivityDisplayRow, ActivityActor } from "@/types/activity";
import Avatar from "@/components/shared/Avatar";
import FollowButton from "@/components/shared/FollowButton";
import VerifiedName from "@/components/shared/VerifiedName";
import { formatRelativeDate } from "@/utils/helpers";
import { makeStyles, useTheme } from "@/theme";

interface ActivityRowProps {
  row: ActivityDisplayRow;
  onPress: () => void;
  onFollowBack: () => Promise<void>;
  mutationsDisabled?: boolean;
}

const AvatarStack = ({ actors }: { actors: ActivityActor[] }) => {
  const styles = useStyles();
  return (
    <View style={styles.avatarStack}>
      {actors.slice(0, 3).map((actor, index) => (
        <View
          key={actor.id}
          style={[styles.stackItem, index > 0 && styles.stackedAvatar]}
        >
          <Avatar
            avatarPath={actor.avatarUrl}
            username={actor.username}
            size={32}
            reviewCount={actor.reviewCount}
          />
        </View>
      ))}
    </View>
  );
};

const ActivityRow: React.FC<ActivityRowProps> = ({
  row,
  onPress,
  onFollowBack,
  mutationsDisabled = false,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const [followLoading, setFollowLoading] = useState(false);
  const actor = "actor" in row ? row.actor : null;

  const runFollowBack = async () => {
    if (
      mutationsDisabled ||
      row.kind !== "user_followed" ||
      row.isFollowing ||
      followLoading
    )
      return;
    setFollowLoading(true);
    try {
      await onFollowBack();
    } finally {
      setFollowLoading(false);
    }
  };

  const renderCopy = () => {
    if (row.kind === "admin_message") {
      return (
        <Text style={styles.body} numberOfLines={2}>
          {row.body}
        </Text>
      );
    }
    const action =
      row.kind === "user_followed"
        ? "started following you"
        : row.kind === "review_liked"
          ? row.summary.slice(row.summary.indexOf(" ") + 1)
          : row.kind === "comment_replied"
            ? "replied to your comment"
            : "commented on your review";
    return (
      <View style={styles.copyBlock}>
        <View style={styles.metaLine}>
          <VerifiedName
            name={actor?.username ?? "Someone"}
            isVerified={actor?.isVerified}
            badgeSize={13}
            style={styles.actorName}
            textStyle={styles.actorNameText}
          />
          <Text style={styles.action} numberOfLines={1}>
            {action}
          </Text>
        </View>
        {"preview" in row && row.preview ? (
          <Text style={styles.preview} numberOfLines={1}>
            : {row.preview}
          </Text>
        ) : null}
      </View>
    );
  };

  const imageUri = "review" in row ? row.review.imageUrl : null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${row.kind.replaceAll("_", " ")} activity`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.leading}>
        {row.kind === "admin_message" ? (
          <View style={styles.adminIcon}>
            <Ionicons name="heart" size={19} color={colors.onAccent} />
          </View>
        ) : row.kind === "review_liked" ? (
          <AvatarStack actors={row.actors} />
        ) : actor ? (
          <Avatar
            avatarPath={actor.avatarUrl}
            username={actor.username}
            size={36}
            reviewCount={actor.reviewCount}
          />
        ) : null}
      </View>
      <View style={styles.content}>
        {renderCopy()}
        <Text style={styles.time}>{formatRelativeDate(row.createdAt)}</Text>
      </View>
      {row.kind === "user_followed" ? (
        <FollowButton
          following={row.isFollowing}
          loading={followLoading}
          disabled={mutationsDisabled}
          onPress={() => void runFollowBack()}
        />
      ) : imageUri ? (
        <ExpoImage
          source={{ uri: imageUri }}
          style={styles.thumbnail}
          contentFit="cover"
          transition={120}
        />
      ) : row.kind === "admin_message" ? (
        <MaterialIcons name="campaign" size={24} color={colors.accent} />
      ) : (
        <View style={styles.thumbnailFallback}>
          <Ionicons name="wine-outline" size={20} color={colors.accent} />
        </View>
      )}
    </Pressable>
  );
};

const useStyles = makeStyles((t) => ({
  row: {
    minHeight: 72,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.md - 2,
    paddingHorizontal: t.spacing.gutter,
    paddingVertical: t.spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
    backgroundColor: t.colors.surface,
  },
  pressed: {
    opacity: 0.68,
  },
  leading: {
    width: 48,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  avatarStack: {
    width: 48,
    height: 44,
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  stackItem: {
    width: 44,
    height: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  stackedAvatar: {
    marginLeft: -18,
  },
  adminIcon: {
    width: 40,
    height: 40,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  copyBlock: {
    minWidth: 0,
    gap: 1,
  },
  metaLine: {
    minWidth: 0,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  action: {
    ...t.typography.body,
    color: t.colors.text,
    flexShrink: 1,
  },
  body: {
    ...t.typography.body,
    color: t.colors.text,
  },
  actorName: {
    flexShrink: 1,
  },
  actorNameText: {
    ...t.typography.bodyStrong,
    color: t.colors.usernameText,
  },
  preview: {
    color: t.colors.textSecondary,
  },
  time: {
    ...t.typography.caption,
    color: t.colors.textMuted,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.imagePlaceholder,
  },
  thumbnailFallback: {
    width: 48,
    height: 48,
    borderRadius: t.radius.sm,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.imagePlaceholder,
  },
}));

export default memo(ActivityRow);
