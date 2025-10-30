import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { supabase } from "../utils/supabase";
import { useRouter } from "expo-router";
import AnalyticService from "@/services/analyticsService";

export function GoogleAuth() {
  GoogleSignin.configure({
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    webClientId:
      "732397011472-41tr3sghlftkc5kcsr57v3570l9uot05.apps.googleusercontent.com",
    iosClientId:
      "732397011472-41tr3sghlftkc5kcsr57v3570l9uot05.apps.googleusercontent.com",
  });
  const router = useRouter();
  return (
    <GoogleSigninButton
      size={GoogleSigninButton.Size.Standard}
      color={GoogleSigninButton.Color.Dark}
      onPress={async () => {
        try {
          const result = await GoogleSignin.hasPlayServices();
          const userInfo = await GoogleSignin.signIn();
          if (userInfo.data && userInfo.data.idToken) {
            // Try to sign in first (for existing users)
            const { error: signInError } =
              await supabase.auth.signInWithIdToken({
                provider: "google",
                token: userInfo.data.idToken,
              });

            // If sign in succeeds, track login event
            if (!signInError) {
              AnalyticService.capture('login', { method: 'google' });
            }

            // If sign in fails, try to sign up (for new users)
            if (signInError) {
              const { error: signUpError } =
                await supabase.auth.signUpWithIdToken({
                  provider: "google",
                  token: userInfo.data.idToken,
                });

              if (signUpError) {
                throw new Error(
                  `Authentication failed: ${signUpError.message}`
                );
              } else {
                AnalyticService.capture('create_account', { method: 'google' });
              }
            }

            router.replace("/(tabs)/home");
          } else {
            throw new Error("no ID token present!");
          }
        } catch (error: any) {
          if (error.code === statusCodes.SIGN_IN_CANCELLED) {
            // user cancelled the login flowr
          } else if (error.code === statusCodes.IN_PROGRESS) {
            // operation (e.g. sign in) is in progress already
          } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            // play services not available or outdated
          } else {
            // some other error happened
          }
        }
      }}
    />
  );
}
