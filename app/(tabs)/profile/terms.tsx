import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { makeStyles, useTheme } from "@/theme";

const Terms = () => {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.placeholder} />
      </View>

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

        <Text style={styles.sectionTitle}>2. Zero Tolerance Policy</Text>
        <Text style={styles.text}>
          We have a ZERO TOLERANCE policy for: • Harassment, bullying, or
          threatening behavior • Hate speech, discrimination, or offensive
          language • Inappropriate, explicit, or adult content • Spam, fake
          reviews, or misleading information • Copyright infringement or stolen
          content • Any content that violates local laws
        </Text>

        <Text style={styles.sectionTitle}>3. Content Moderation</Text>
        <Text style={styles.text}>
          We actively monitor and moderate all user-generated content.
          Violations will result in immediate content removal and may lead to
          account suspension or termination.
        </Text>

        <Text style={styles.sectionTitle}>4. Reporting System</Text>
        <Text style={styles.text}>
          If you see inappropriate content or behavior, please report it
          immediately using our in-app reporting feature. We take all reports
          seriously and investigate promptly.
        </Text>

        <Text style={styles.sectionTitle}>5. Account Responsibility</Text>
        <Text style={styles.text}>
          You are responsible for maintaining the security of your account and
          for all activities that occur under your account. Do not share your
          account credentials with others.
        </Text>

        <Text style={styles.sectionTitle}>6. Privacy & Data</Text>
        <Text style={styles.text}>
          We respect your privacy and handle your data according to our Privacy
          Policy. By using the app, you consent to our data practices as
          described in our Privacy Policy.
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
          commercial purposes without permission • Attempt to hack, disrupt, or
          damage the app • Violate any applicable laws or regulations
        </Text>

        <Text style={styles.sectionTitle}>9. Enforcement</Text>
        <Text style={styles.text}>
          We reserve the right to remove content, suspend accounts, or take
          other appropriate action against users who violate these terms.
          Decisions are final and at our sole discretion.
        </Text>

        <Text style={styles.sectionTitle}>10. Changes to Terms</Text>
        <Text style={styles.text}>
          We may update these terms from time to time. Continued use of the app
          after changes constitutes acceptance of the new terms.
        </Text>

        <Text style={styles.footerText}>
          By accepting these terms, you acknowledge that you have read,
          understood, and agree to be bound by them.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.surface,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  backButton: {
    padding: t.spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: t.colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold" as const,
    color: t.colors.text,
    textAlign: "center" as const,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold" as const,
    color: t.colors.text,
    marginTop: t.spacing.lg,
    marginBottom: t.spacing.sm,
  },
  text: {
    fontSize: 14,
    color: t.colors.textSecondary,
    lineHeight: 20,
    marginBottom: t.spacing.md,
  },
  footerText: {
    fontSize: 14,
    color: t.colors.textSecondary,
    fontStyle: "italic" as const,
    textAlign: "center" as const,
    marginTop: t.spacing.lg,
    marginBottom: t.spacing.sm,
  },
}));

export default Terms;
