import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { getMyPassport, type Passport } from "@/services/passportService";
import { reportError } from "@/utils/log";

export function usePassport() {
  const [passport, setPassport] = useState<Passport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPassport(await getMyPassport());
    } catch (cause) {
      reportError("Unable to load Martini Passport:", cause);
      setError("We couldn't load your Passport. Pull to try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return { passport, loading, error, refresh };
}
