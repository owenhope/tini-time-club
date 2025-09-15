import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

const Terms = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
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
          reviews for venues you haven't visited • Use the app for commercial
          purposes without permission • Attempt to hack, disrupt, or damage the
          app • Violate any applicable laws or regulations
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
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
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 12,
  },
  footerText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
});

export default Terms;
