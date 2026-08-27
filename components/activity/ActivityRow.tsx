import React, { memo, useState } from "react";
import {
  type GestureResponderEvent,
  Pressable,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import type { ActivityDisplayRow } from "@/types/activity";
import Avatar from "@/components/shared/Avatar";
import FollowButton from "@/components/shared/FollowButton";
import VerifiedName from "@/components/shared/VerifiedName";
import { formatRelativeDate } from "@/utils/helpers";
import { makeStyles, useTheme } from "@/theme";

interface ActivityRowProps {
  row: ActivityDisplayRow;
  onPress: () => void;
  onActorPress: () => void;
  onReviewPress: () => void;
  onFollowBack: () => Promise<void>;
  mutationsDisabled?: boolean;
}

const ActivityRow: React.FC<ActivityRowProps> = ({
  row,
  onPress,
  onActorPress,
  onReviewPress,
  onFollowBack,
  mutationsDisabled = false,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const [followLoading, setFollowLoading] = useState(false);
  const actor = "actor" in row ? row.actor : null;

  const handleActorPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onActorPress();
  };

  const handleReviewPress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onReviewPress();
  };

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
          : row.kind === "comment_liked"
            ? "liked your comment"
            : row.kind === "mentioned_in_review"
              ? "mentioned you in a review"
              : row.kind === "mentioned_in_comment"
                ? "mentioned you in a comment"
                : row.kind === "comment_replied"
                  ? "replied to your comment"
                  : "commented on your review";
    return (
      <View style={styles.copyBlock}>
        <View style={styles.metaLine}>
          <Pressable
            onPress={handleActorPress}
            accessibilityRole="link"
            accessibilityLabel={`Open ${actor?.username ?? "member"}'s profile`}
            hitSlop={6}
            style={({ pressed }) => [
              styles.actorName,
              pressed && styles.pressed,
            ]}
          >
            <VerifiedName
              name={actor?.username ?? "Someone"}
              isVerified={actor?.isVerified}
              badgeSize={13}
              textStyle={styles.actorNameText}
            />
          </Pressable>
          <Text style={styles.action} numberOfLines={1}>
            {action}
          </Text>
        </View>
        {"preview" in row && row.preview ? (
          <Text style={styles.preview} numberOfLines={1}>
            {row.preview}
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
        ) : actor ? (
          <Pressable
            onPress={handleActorPress}
            accessibilityRole="link"
            accessibilityLabel={`Open ${actor.username}'s profile`}
            hitSlop={6}
          >
            <Avatar
              avatarPath={actor.avatarUrl}
              username={actor.username}
              size={32}
              reviewCount={actor.reviewCount}
            />
          </Pressable>
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
          compact
          onPress={() => void runFollowBack()}
        />
      ) : imageUri ? (
        <Pressable
          onPress={handleReviewPress}
          accessibilityRole="link"
          accessibilityLabel="Open review"
          hitSlop={6}
        >
          <ExpoImage
            source={{ uri: imageUri }}
            style={styles.thumbnail}
            contentFit="cover"
            transition={120}
          />
        </Pressable>
      ) : row.kind === "admin_message" ? null : (
        <Pressable
          onPress={handleReviewPress}
          accessibilityRole="link"
          accessibilityLabel="Open review"
          hitSlop={6}
        >
          <View style={styles.thumbnailFallback}>
            <Ionicons name="wine-outline" size={20} color={colors.accent} />
          </View>
        </Pressable>
      )}
    </Pressable>
  );
};

const useStyles = makeStyles((t) => ({
  row: {
    minHeight: 64,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.gutter,
    paddingVertical: t.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
    backgroundColor: t.colors.surface,
  },
  pressed: {
    opacity: 0.68,
  },
  leading: {
    width: 44,
    height: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  adminIcon: {
    width: 34,
    height: 34,
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
    color: t.colors.postText,
    flexShrink: 1,
  },
  body: {
    ...t.typography.body,
    color: t.colors.postText,
  },
  actorName: {
    flexShrink: 1,
  },
  actorNameText: {
    ...t.typography.bodyStrong,
    color: t.colors.usernameText,
  },
  preview: {
    ...t.typography.caption,
    color: t.colors.postText,
  },
  time: {
    ...t.typography.caption,
    color: t.colors.textMuted,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: t.radius.xs,
    backgroundColor: t.colors.imagePlaceholder,
  },
  thumbnailFallback: {
    width: 44,
    height: 44,
    borderRadius: t.radius.xs,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.imagePlaceholder,
  },
}));

export default memo(ActivityRow);
