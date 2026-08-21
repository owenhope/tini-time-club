import React from "react";
import { View, Text, ScrollView } from "react-native";
import { makeStyles } from "@/theme";

const Terms = () => {
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
        <Text style={styles.title}>
          Terms of Service & Community Guidelines
        </Text>

        <Text style={styles.sectionTitle}>Welcome to Tini Time Club</Text>
        <Text style={styles.text}>
          By using Tini Time Club, you agree to these terms and our community
          guidelines. Please read them carefully.
        </Text>

        <Text style={styles.sectionTitle}>1. User-Generated Content</Text>
        <Text style={styles.text}>
          Tini Time Club allows users to share reviews, photos, and comments
          about cocktails and venues. You are responsible for all content you
          post.
        </Text>

        <Text style={styles.sectionTitle}>2. Content License</Text>
        <Text style={styles.text}>
          You retain ownership of your reviews, photos, comments, and other
          content. By submitting content to Tini Time Club, you grant Tini Time
          Club a worldwide, non-exclusive, royalty-free, transferable, and
          sublicensable license to host, store, use, reproduce, modify, adapt,
          publish, display, distribute, and create derivative works from that
          content in any media for providing app functionality, operating,
          maintaining, improving, promoting, and marketing Tini Time Club,
          without compensation to you. You represent that you have all rights
          needed to grant this license.
        </Text>

        <Text style={styles.sectionTitle}>3. Zero Tolerance Policy</Text>
        <Text style={styles.text}>
          We have a ZERO TOLERANCE policy for: • Harassment, bullying, or
          threatening behavior • Hate speech, discrimination, or offensive
          language • Inappropriate, explicit, or adult content • Spam, fake
          reviews, or misleading information • Copyright infringement or stolen
          content • Any content that violates local laws
        </Text>

        <Text style={styles.sectionTitle}>4. Content Moderation</Text>
        <Text style={styles.text}>
          We actively monitor and moderate all user-generated content.
          Violations will result in immediate content removal and may lead to
          account suspension or termination.
        </Text>

        <Text style={styles.sectionTitle}>5. Reporting System</Text>
        <Text style={styles.text}>
          If you see inappropriate content or behavior, please report it
          immediately using our in-app reporting feature. We take all reports
          seriously and investigate promptly.
        </Text>

        <Text style={styles.sectionTitle}>6. Account Responsibility</Text>
        <Text style={styles.text}>
          You are responsible for maintaining the security of your account and
          for all activities that occur under your account. Do not share your
          account credentials with others.
        </Text>

        <Text style={styles.sectionTitle}>7. Privacy & Data</Text>
        <Text style={styles.text}>
          We respect your privacy and handle your data according to our Privacy
          Policy. By using the app, you consent to our data practices as
          described in our Privacy Policy.
        </Text>

        <Text style={styles.sectionTitle}>8. Age Requirements</Text>
        <Text style={styles.text}>
          You must be at least 21 years old to use Tini Time Club. We do not
          knowingly collect information from users under 21.
        </Text>

        <Text style={styles.sectionTitle}>9. Prohibited Activities</Text>
        <Text style={styles.text}>
          You may not: • Create fake accounts or impersonate others • Post
          reviews for venues you haven&apos;t visited • Use the app for
          commercial purposes without permission • Attempt to hack, disrupt, or
          damage the app • Violate any applicable laws or regulations
        </Text>

        <Text style={styles.sectionTitle}>10. Enforcement</Text>
        <Text style={styles.text}>
          We reserve the right to remove content, suspend accounts, or take
          other appropriate action against users who violate these terms.
          Decisions are final and at our sole discretion.
        </Text>

        <Text style={styles.sectionTitle}>11. Changes to Terms</Text>
        <Text style={styles.text}>
          We may update these terms from time to time. Continued use of the app
          after changes constitutes acceptance of the new terms.
        </Text>

        <Text style={styles.footerText}>
          By accepting these terms, you acknowledge that you have read,
          understood, and agree to be bound by them.
        </Text>
      </ScrollView>
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.surface,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    ...t.typography.title,
    color: t.colors.text,
    textAlign: "center" as const,
    marginBottom: 20,
  },
  sectionTitle: {
    ...t.typography.heading,
    color: t.colors.text,
    marginTop: t.spacing.lg,
    marginBottom: t.spacing.sm,
  },
  text: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
    marginBottom: t.spacing.md,
  },
  footerText: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
    fontStyle: "italic" as const,
    textAlign: "center" as const,
    marginTop: t.spacing.lg,
    marginBottom: t.spacing.sm,
  },
}));

export default Terms;
