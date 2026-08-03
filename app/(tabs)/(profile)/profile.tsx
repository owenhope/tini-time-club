import "react-native-get-random-values";
import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Alert, ScrollView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { File } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "@/utils/supabase";
import { decode } from "base64-arraybuffer";
import { useProfile } from "@/context/profile-context";
import { Ionicons } from "@expo/vector-icons";
import LikeSlider from "@/components/LikeSlider";
import { useRouter, useNavigation, useFocusEffect } from "expo-router";
import { v4 as uuidv4 } from "uuid";
import ProfileHeader from "@/components/ProfileHeader";
import ProfileBody from "@/components/profile/ProfileBody";
import authCache from "@/utils/authCache";
import databaseService from "@/services/databaseService";
import AnalyticService from "@/services/analyticsService";
import { HIT_SLOP, fonts, makeStyles, useTheme } from "@/theme";
import ProfileContentTabs, {
  type ProfileContentTab,
} from "@/components/ProfileContentTabs";
import FavoriteTags, {
  parseFavoriteIds,
} from "@/components/profile/FavoriteTags";
import FavoriteLocationLink from "@/components/profile/FavoriteLocationLink";
import { useProfileScreenData } from "@/hooks/useProfileScreenData";
import { reportError } from "@/utils/log";
import { routes } from "@/utils/routes";
import { RANK_TIERS, getRankTier } from "@/utils/ranking";

interface RankPreviewOption {
  label: string;
  shortLabel: string;
  count?: number;
  color?: string;
}

const RANK_PREVIEW_OPTIONS: readonly RankPreviewOption[] = [
  { label: "Actual", shortLabel: "Live" },
  ...RANK_TIERS.map((tier) => ({
    label: tier.name,
    shortLabel: tier.key === "topShelf" ? "Top" : tier.name,
    count: tier.min,
    color: tier.color,
  })),
];

const Profile = () => {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, refreshProfile } = useProfile();
  const router = useRouter();
  const navigation = useNavigation();
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ProfileContentTab>("reviews");
  const [rankPreviewIndex, setRankPreviewIndex] = useState(0);
  // The swatches are a ring-colour checker, not a feature. They stay out of
  // the shipped layout entirely; in a dev build a long-press on the avatar
  // brings them back.
  const [rankPreviewOpen, setRankPreviewOpen] = useState(false);
  const {
    userReviews,
    setUserReviews,
    loadingReviews,
    refreshingReviews,
    loadUserReviews,
    regularPlaces,
    loadingRegulars,
    loadRegularPlaces,
    favoriteLocation,
    spirits,
    types,
    followersCount,
    followingCount,
    loadFollowCounts,
  } = useProfileScreenData({
    profileId: profile?.id,
    viewerId: profile?.id,
    favoriteLocationId: profile?.favorite_location_id,
    reviewOptions: { limit: 50, offset: 0 },
  });

  // No nav bar: the identity block titles the screen, the way Places and
  // Discover do.
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Focus-refresh staleness gate; pull-to-refresh bypasses it via isRefresh.
  const PROFILE_REFRESH_AFTER = 30 * 1000;
  const lastProfileLoadRef = useRef(0);

  const pickImage = async () => {
    try {
      // Clear any previous errors
      setAvatarError(null);
      setAvatarLoading(true);

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1, // raw image quality
      });

      if (!result.canceled) {
        const originalUri = result.assets[0].uri;

        // 👉 Resize and compress
        const manipResult = await ImageManipulator.manipulateAsync(
          originalUri,
          [{ resize: { width: 512 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        const compressedUri = manipResult.uri;

        const User = await authCache.getUser();
        if (!User) {
          setAvatarError("User not found");
          setAvatarLoading(false);
          return;
        }

        const base64 = await new File(compressedUri).base64();

        const uniqueId = uuidv4();
        const filePath = `${User.id}/avatar_${uniqueId}.jpg`;
        const contentType = "image/jpeg";

        // Upload new avatar
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, decode(base64), { contentType });

        if (uploadError) {
          reportError("Error uploading avatar:", uploadError);
          setAvatarError(`Upload failed: ${uploadError.message}`);
          setAvatarLoading(false);
          return;
        }

        // Delete old avatar if one exists
        if (profile?.avatar_url && profile.avatar_url !== filePath) {
          await supabase.storage.from("avatars").remove([profile.avatar_url]);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        if (!urlData?.publicUrl) {
          reportError("Error getting avatar public URL for", filePath);
          setAvatarError("Couldn't finish uploading your photo.");
          setAvatarLoading(false);
          return;
        }

        // Update profile with new avatar path using context
        const updateResult = await updateProfile({ avatar_url: filePath });

        if (updateResult.error) {
          reportError("Error updating profile:", updateResult.error);
          const reason =
            updateResult.error instanceof Error
              ? updateResult.error.message
              : String(updateResult.error);
          setAvatarError(`Profile update failed: ${reason}`);
          setAvatarLoading(false);
          return;
        }

        // Force refresh profile from database
        await refreshProfile();

        // Clear review caches to ensure fresh avatar data in reviews
        await databaseService.clearReviewCaches();

        setAvatarError(null);
        setAvatarLoading(false);

        // Track avatar change event
        AnalyticService.capture("change_avatar", {});
      } else {
        setAvatarLoading(false);
      }
    } catch (err) {
      reportError("Unexpected error uploading avatar:", err);
      setAvatarError("Couldn't upload your photo. Please try again.");
      setAvatarLoading(false);
    }
  };

  const deleteReview = async (id: string) => {
    const { error } = await supabase
      .from("reviews")
      .update({ state: 3 })
      .eq("id", id);
    if (!error) {
      setUserReviews((prev) => prev.filter((r) => r.id !== id));
      // Track delete review event
      AnalyticService.capture("delete_review", { reviewId: id });
    }
  };

  const confirmDeleteReview = (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete your review?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteReview(id),
        },
      ]
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyCtaIcon}>
        <Ionicons name="wine-outline" size={28} color={colors.accent} />
      </View>
      <Text style={styles.emptyCtaTitle}>Share your first Martini</Text>
      <TouchableOpacity
        style={styles.reviewLink}
        onPress={() => router.navigate(routes.review())}
        hitSlop={HIT_SLOP}
        accessibilityRole="link"
        accessibilityLabel="Write a review"
        accessibilityHint="Opens the new review form"
      >
        <Text style={styles.reviewLinkText}>Write a review</Text>
      </TouchableOpacity>
    </View>
  );

  // Load counts, reviews and regulars on focus (including first mount) —
  // but only when stale, so tab-hopping doesn't refire five queries every
  // time the user glances at their profile.
  useFocusEffect(
    React.useCallback(() => {
      if (!profile) return;

      const isStale =
        Date.now() - lastProfileLoadRef.current > PROFILE_REFRESH_AFTER;
      if (!isStale) return;
      lastProfileLoadRef.current = Date.now();

      loadFollowCounts();
      loadUserReviews();
      loadRegularPlaces();
      // The loaders intentionally excluded from deps: they are stable in
      // behavior and including them would re-run this on every render,
      // defeating the staleness gate.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile])
  );

  const hasFavoriteTags =
    parseFavoriteIds(profile?.favorite_spirits).length > 0 ||
    parseFavoriteIds(profile?.favorite_types).length > 0;

  const favoriteTags = hasFavoriteTags ? (
    <FavoriteTags profile={profile} spirits={spirits} types={types} />
  ) : null;

  const favoriteChips = (
    <View style={styles.favoritesSection}>
      {!hasFavoriteTags && (
        <TouchableOpacity
          onPress={() => router.push(routes.editProfile())}
          style={styles.ctaContainer}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Add your favorite spirits and types"
        >
          <Text style={styles.ctaText}>Add favorite spirits & types</Text>
        </TouchableOpacity>
      )}
      {!profile?.bio && (
        <TouchableOpacity
          onPress={() => router.push(routes.editProfile())}
          style={styles.ctaContainer}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Add a bio to your profile"
        >
          <Text style={styles.ctaText}>Add a bio</Text>
        </TouchableOpacity>
      )}
      {favoriteLocation ? (
        <FavoriteLocationLink location={favoriteLocation} />
      ) : (
        <TouchableOpacity
          onPress={() =>
            router.push(
              routes.favoriteLocation({
                hasFavoriteLocation: "0",
                saveImmediately: "1",
              })
            )
          }
          style={styles.ctaContainer}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Add a favorite location"
        >
          <Text style={styles.ctaText}>Add a favorite location</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const rankPreview = RANK_PREVIEW_OPTIONS[rankPreviewIndex];
  const actualRankColor =
    getRankTier(profile?.review_count ?? userReviews.length)?.color ??
    colors.borderStrong;

  // The header is the list header rather than a sibling, so the whole profile
  // scrolls away and the grid gets the full screen.
  const header = (
    <>
      <ProfileHeader
        profile={profile}
        reviewsCount={userReviews.length}
        followersCount={followersCount}
        followingCount={followingCount}
        isOwnProfile={true}
        onAvatarPress={pickImage}
        avatarLoading={avatarLoading}
        avatarError={avatarError}
        topInset={insets.top}
        titleAction={
          <TouchableOpacity
            onPress={() => navigation.navigate("settings" as never)}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Profile settings"
          >
            <Ionicons name="settings-outline" size={24} color={colors.onInk} />
          </TouchableOpacity>
        }
        onAvatarLongPress={
          __DEV__ ? () => setRankPreviewOpen((open) => !open) : undefined
        }
        rankPreviewCount={
          __DEV__ && rankPreviewOpen ? rankPreview.count : undefined
        }
        onFollowersPress={() =>
          profile?.username && router.push(routes.followers(profile.username))
        }
        onFollowingPress={() =>
          profile?.username && router.push(routes.following(profile.username))
        }
        tags={favoriteTags}
      >
        {favoriteChips}
      </ProfileHeader>
      {__DEV__ && rankPreviewOpen ? (
        <View style={styles.rankDebug}>
          <View style={styles.rankDebugHeading}>
            <Text style={styles.rankDebugLabel}>Rank preview</Text>
            <Text style={styles.rankDebugValue}>{rankPreview.label}</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rankDebugOptions}
          >
            {RANK_PREVIEW_OPTIONS.map((option, index) => {
              const selected = index === rankPreviewIndex;
              const ringColor =
                option.color ??
                (option.count == null ? actualRankColor : colors.border);
              return (
                <TouchableOpacity
                  key={option.label}
                  onPress={() => setRankPreviewIndex(index)}
                  style={[
                    styles.rankDebugOption,
                    selected ? styles.rankDebugOptionSelected : null,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Preview ${option.label} rank`}
                  accessibilityState={{ selected }}
                >
                  <View
                    style={[
                      styles.rankDebugSwatch,
                      { borderColor: ringColor },
                      selected ? styles.rankDebugSwatchSelected : null,
                    ]}
                  />
                  <Text
                    style={[
                      styles.rankDebugOptionLabel,
                      selected ? styles.rankDebugOptionLabelSelected : null,
                    ]}
                    numberOfLines={1}
                  >
                    {option.shortLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
      <ProfileContentTabs activeTab={activeTab} onChange={setActiveTab} />
    </>
  );

  return (
    <View style={styles.container}>
      {/* The identity block runs the deep green up behind the status bar, so
          its content has to be light in both schemes. */}
      <StatusBar style="light" />
      <ProfileBody
        activeTab={activeTab}
        header={header}
        reviews={userReviews}
        setReviews={setUserReviews}
        loadingReviews={loadingReviews}
        refreshingReviews={refreshingReviews}
        onRefreshReviews={() => profile?.id && loadUserReviews(true)}
        emptyReviews={renderEmpty()}
        regularPlaces={regularPlaces}
        loadingRegulars={loadingRegulars}
        onRefreshRegulars={() => profile?.id && loadRegularPlaces()}
        emptyRegulars={
          <View style={styles.emptyContainer}>
            <View style={styles.regularsEmptyContent}>
              <View style={styles.emptyCtaIcon}>
                <Ionicons
                  name="ribbon-outline"
                  size={28}
                  color={colors.accent}
                />
              </View>
              <Text style={styles.regularsEmptyBody}>
                Review the same place often to earn a spot among its top three
                Regulars.
              </Text>
            </View>
          </View>
        }
        canDelete
        onDelete={(review) => confirmDeleteReview(review.id)}
        onEdit={(review) => router.push(routes.editCaption(review.id))}
      />

      {selectedReviewId && (
        <LikeSlider
          reviewId={selectedReviewId}
          onClose={() => setSelectedReviewId(null)}
        />
      )}
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.background },
  ctaContainer: {
    width: "100%" as const,
    alignItems: "flex-start" as const,
    minHeight: 32,
    justifyContent: "center" as const,
  },
  // The header owns the screen gutter now, so its children sit flush.
  favoritesSection: {
    gap: t.spacing.xs,
  },
  rankDebug: {
    paddingVertical: t.spacing.sm,
    gap: t.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  rankDebugHeading: {
    paddingHorizontal: t.spacing.gutter,
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
    justifyContent: "space-between" as const,
  },
  rankDebugLabel: {
    ...t.typography.caption,
    color: t.colors.textMuted,
  },
  rankDebugValue: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
  },
  rankDebugOptions: {
    paddingHorizontal: t.spacing.md,
    gap: 4,
  },
  rankDebugOption: {
    width: 64,
    minHeight: 56,
    paddingVertical: 6,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 4,
    borderRadius: t.radius.pill,
  },
  rankDebugOptionSelected: {
    backgroundColor: t.colors.accentSubtle,
  },
  rankDebugSwatch: {
    width: 22,
    height: 22,
    borderRadius: t.radius.pill,
    borderWidth: 3,
  },
  rankDebugSwatchSelected: {
    borderWidth: 4,
  },
  rankDebugOptionLabel: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  rankDebugOptionLabelSelected: {
    color: t.colors.text,
    fontFamily: fonts.bold,
  },
  // Sits inside ProfileHeader's deep-green block.
  ctaText: {
    ...t.typography.body,
    color: t.colors.highlight,
    fontFamily: fonts.semibold,
  },
  emptyContainer: {
    alignItems: "center" as const,
    paddingHorizontal: t.spacing.gutter,
    paddingVertical: t.spacing.xxl,
    gap: t.spacing.md,
  },
  emptyCtaIcon: {
    width: 48,
    height: 48,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.accentSubtle,
  },
  emptyCtaTitle: {
    ...t.typography.heading,
    color: t.colors.text,
    textAlign: "center" as const,
  },
  reviewLink: {
    minHeight: 44,
    justifyContent: "center" as const,
    paddingHorizontal: t.spacing.sm,
  },
  reviewLinkText: {
    ...t.typography.bodyStrong,
    color: t.colors.accent,
  },
  regularsEmptyContent: {
    width: "100%" as const,
    maxWidth: 300,
    alignItems: "center" as const,
    gap: t.spacing.md,
    paddingVertical: t.spacing.md,
  },
  regularsEmptyBody: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    textAlign: "center" as const,
    lineHeight: 22,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingRight: 2,
  },
  headerTitleContainer: { alignItems: "center" as const },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: t.colors.onInk,
  },
}));

export default Profile;
