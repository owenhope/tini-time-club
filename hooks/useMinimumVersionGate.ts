import { useEffect, useState } from "react";
import { AppState } from "react-native";
import {
  checkMinimumSupportedVersion,
  type RequiredUpdate,
} from "@/services/appVersionService";

/**
 * Whether this build is below the server's minimum supported version. Checked
 * once the app is ready and again whenever it returns to the foreground, so a
 * raised floor reaches open apps without a restart.
 */
export function useMinimumVersionGate(ready: boolean): RequiredUpdate | null {
  const [required, setRequired] = useState<RequiredUpdate | null>(null);

  useEffect(() => {
    if (!ready) return;
    let disposed = false;

    const check = async () => {
      const update = await checkMinimumSupportedVersion();
      if (!disposed) setRequired(update);
    };

    void check();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => {
      disposed = true;
      subscription.remove();
    };
  }, [ready]);

  return required;
}
