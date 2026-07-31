import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { makeStyles, useTheme } from "@/theme";

interface EULAModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  loading?: boolean;
}

const EULAModal: React.FC<EULAModalProps> = ({
  visible,
  onAccept,
  onDecline,
  loading = false,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
    if (isAtBottom) setHasScrolledToBottom(true);
  };

  // If the terms ever fit without scrolling (short text, large screen,
  // small font setting) there is no scroll event to fire and "I Agree" would
  // stay disabled forever — a soft-lock out of the app.
  const handleContentFits = (event: any) => {
    setViewportHeight(event.nativeEvent.layout.height);
  };

  const handleContentSizeChange = (_w: number, h: number) => {
    setContentHeight(h);
  };

  useEffect(() => {
    if (
      viewportHeight > 0 &&
      contentHeight > 0 &&
      contentHeight <= viewportHeight
    ) {
      setHasScrolledToBottom(true);
    }
  }, [viewportHeight, contentHeight]);

  const handleAccept = () => {
    if (loading) return; // Prevent action while loading

    if (!hasScrolledToBottom) {
      Alert.alert(
        "Please Read the Terms",
        "Please scroll to the bottom and read the complete terms before accepting.",
        [{ text: "OK" }]
      );
      return;
    }
    onAccept();
  };

  const handleDecline = () => {
    if (loading) return; // Prevent action while loading

    Alert.alert(
      "Terms Required",
      "You must accept the terms and conditions to use Tini Time Club. Would you like to read them again?",
      [
        { text: "Read Again", style: "cancel" },
        { text: "Exit App", onPress: onDecline, style: "destructive" },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>
            Terms of Service & Community Guidelines
          </Text>

          <ScrollView
            style={styles.scrollView}
            onScroll={handleScroll}
            onLayout={handleContentFits}
            onContentSizeChange={handleContentSizeChange}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.sectionTitle}>Welcome to Tini Time Club</Text>
            <Text style={styles.text}>
              By using Tini Time Club, you agree to these terms and our
              community guidelines. Please read them carefully.
            </Text>

            <Text style={styles.sectionTitle}>1. User-Generated Content</Text>
            <Text style={styles.text}>
              Tini Time Club allows users to share reviews, photos, and comments
              about cocktails and venues. You are responsible for all content
              you post.
            </Text>

            <Text style={styles.sectionTitle}>2. Zero Tolerance Policy</Text>
            <Text style={styles.text}>
              We have a ZERO TOLERANCE policy for: • Harassment, bullying, or
              threatening behavior • Hate speech, discrimination, or offensive
              language • Inappropriate, explicit, or adult content • Spam, fake
              reviews, or misleading information • Copyright infringement or
              stolen content • Any content that violates local laws
            </Text>

            <Text style={styles.sectionTitle}>3. Content Moderation</Text>
            <Text style={styles.text}>
              We actively monitor and moderate all user-generated content.
              Violations will result in immediate content removal and may lead
              to account suspension or termination.
            </Text>

            <Text style={styles.sectionTitle}>4. Reporting System</Text>
            <Text style={styles.text}>
              If you see inappropriate content or behavior, please report it
              immediately using our in-app reporting feature. We take all
              reports seriously and investigate promptly.
            </Text>

            <Text style={styles.sectionTitle}>5. Account Responsibility</Text>
            <Text style={styles.text}>
              You are responsible for maintaining the security of your account
              and for all activities that occur under your account. Do not share
              your account credentials with others.
            </Text>

            <Text style={styles.sectionTitle}>6. Privacy & Data</Text>
            <Text style={styles.text}>
              We respect your privacy and handle your data according to our
              Privacy Policy. By using the app, you consent to our data
              practices as described in our Privacy Policy.
            </Text>

            <Text style={styles.sectionTitle}>7. Age Requirements</Text>
            <Text style={styles.text}>
              You must be at least 21 years old to use Tini Time Club. We do not
              knowingly collect information from users under 21.
            </Text>

            <Text style={styles.sectionTitle}>8. Prohibited Activities</Text>
            <Text style={styles.text}>
              You may not: • Create fake accounts or impersonate others • Post
              reviews for venues you haven&apos;t visited • Use the app for
              commercial purposes without permission • Attempt to hack, disrupt,
              or damage the app • Violate any applicable laws or regulations
            </Text>

            <Text style={styles.sectionTitle}>9. Enforcement</Text>
            <Text style={styles.text}>
              We reserve the right to remove content, suspend accounts, or take
              other appropriate action against users who violate these terms.
              Decisions are final and at our sole discretion.
            </Text>

            <Text style={styles.sectionTitle}>10. Changes to Terms</Text>
            <Text style={styles.text}>
              We may update these terms from time to time. Continued use of the
              app after changes constitutes acceptance of the new terms.
            </Text>

            <Text style={styles.footerText}>
              By accepting these terms, you acknowledge that you have read,
              understood, and agree to be bound by them.
            </Text>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.declineButton]}
              onPress={handleDecline}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.acceptButton,
                (!hasScrolledToBottom || loading) && styles.disabledButton,
              ]}
              onPress={handleAccept}
              disabled={!hasScrolledToBottom || loading}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.onAccent} />
                  <Text style={styles.acceptButtonText}>Accepting...</Text>
                </View>
              ) : (
                <Text style={styles.acceptButtonText}>I Agree</Text>
              )}
            </TouchableOpacity>
          </View>

          {!hasScrolledToBottom && (
            <Text style={styles.scrollHint}>
              Please scroll to the bottom to enable the &quot;I Agree&quot;
              button
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const useStyles = makeStyles((t) => ({
  modalContainer: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: t.colors.scrim,
    padding: t.spacing.xl - 4,
  },
  modalContent: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.md,
    width: "100%" as const,
    maxHeight: "90%" as const,
    padding: t.spacing.xl - 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold" as const,
    color: t.colors.text,
    textAlign: "center" as const,
    marginBottom: t.spacing.xl - 4,
  },
  scrollView: {
    maxHeight: 400,
    marginBottom: t.spacing.xl - 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold" as const,
    color: t.colors.text,
    marginTop: t.spacing.lg,
    marginBottom: t.spacing.sm,
  },
  text: {
    fontSize: 13,
    color: t.colors.text,
    lineHeight: 20,
    marginBottom: t.spacing.md,
  },
  footerText: {
    fontSize: 13,
    color: t.colors.textSecondary,
    fontStyle: "italic" as const,
    textAlign: "center" as const,
    marginTop: t.spacing.lg,
    marginBottom: t.spacing.sm,
  },
  buttonContainer: {
    flexDirection: "row" as const,
    gap: t.spacing.md,
    marginTop: 10,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  acceptButton: {
    backgroundColor: t.colors.accent,
  },
  declineButton: {
    backgroundColor: t.colors.surface,
    borderWidth: 2,
    borderColor: t.colors.accent,
  },
  disabledButton: {
    opacity: 0.6,
  },
  acceptButtonText: {
    color: t.colors.onAccent,
    fontSize: 15,
    fontWeight: "600" as const,
  },
  declineButtonText: {
    color: t.colors.accent,
    fontSize: 15,
    fontWeight: "600" as const,
  },
  scrollHint: {
    fontSize: 12,
    color: t.colors.textSecondary,
    textAlign: "center" as const,
    marginTop: t.spacing.sm,
    fontStyle: "italic" as const,
  },
  loadingContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
}));

export default EULAModal;
