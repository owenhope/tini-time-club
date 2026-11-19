import React, { useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  TouchableOpacity,
  View,
} from "react-native";
import AppText from "@/components/shared/AppText";
import LocationSearchField from "@/components/shared/LocationSearchField";
import { useSelectionRowStyles } from "@/components/shared/selection-row-styles";
import Button from "@/components/shared/Button";
import { makeStyles } from "@/theme";
import { useProfile } from "@/context/profile-context";
import { PassportToastContext } from "@/context/passport-toast-context";
import AnalyticService from "@/services/analyticsService";
import {
  cityLabel,
  createCitySession,
  detectHomeCity,
  hasHomeCityLocationPermission,
  HomeCityPermissionDeniedError,
  saveHomeCity,
  searchCities,
  selectCity,
  type CitySuggestion,
  type HomeCity,
} from "@/services/homeCityService";

/** Shared city-only editor. A typed string is never a savable selection. */
export default function HomeCityPicker({
  origin,
  onContinue,
  onBusyChange,
  preview = false,
  autoDetect = false,
  renderLayout,
}: {
  origin: "onboarding" | "profile";
  onContinue?: () => void;
  onBusyChange?: (busy: boolean) => void;
  preview?: boolean;
  autoDetect?: boolean;
  renderLayout?: (props: {
    content: React.ReactNode;
    busy: boolean;
    canSave: boolean;
    onSave: () => void;
    onSkip: () => void;
  }) => React.ReactNode;
}) {
  const { profile, refreshProfile } = useProfile();
  const { showPassportStamps } = useContext(PassportToastContext);
  const styles = useStyles();
  const selectionStyles = useSelectionRowStyles();
  const [selected, setSelected] = useState<HomeCity | null>(
    profile?.home_city ?? null
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CitySuggestion[]>([]);
  const [shouldAutoDetect] = useState(() => autoDetect && !profile?.home_city);
  const [busy, setBusy] = useState(shouldAutoDetect);
  const initialDetection = useRef<Promise<HomeCity> | null>(null);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<{
    message: string;
    source: "location" | "permission" | "action";
  } | null>(null);
  const [saved, setSaved] = useState(false);
  const session = useRef(createCitySession());
  const generation = useRef(0);
  const waitingForSettings = useRef(false);
  useEffect(() => {
    if (!shouldAutoDetect) return;
    let active = true;
    onBusyChange?.(true);
    initialDetection.current ??= detectHomeCity();
    void initialDetection.current
      .then((city) => {
        if (active) setSelected(city);
      })
      .catch((e: unknown) => {
        if (active)
          setError({
            message:
              e instanceof Error ? e.message : "Search for your home city.",
            source:
              e instanceof HomeCityPermissionDeniedError
                ? "permission"
                : "location",
          });
      })
      .finally(() => {
        if (active) {
          setBusy(false);
          onBusyChange?.(false);
        }
      });
    return () => {
      active = false;
      onBusyChange?.(false);
    };
  }, [shouldAutoDetect, onBusyChange]);
  useEffect(() => {
    let active = true;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" || !waitingForSettings.current) return;
      waitingForSettings.current = false;
      setBusy(true);
      onBusyChange?.(true);
      void (async () => {
        try {
          if (!(await hasHomeCityLocationPermission()) || !active) return;
          const city = await detectHomeCity();
          if (!active) return;
          setSelected(city);
          setQuery("");
          setResults([]);
          setSearched(false);
          setSearching(false);
          setError(null);
        } catch (e) {
          if (active)
            setError({
              message:
                e instanceof Error ? e.message : "Search for your home city.",
              source: "location",
            });
        } finally {
          if (active) {
            setBusy(false);
            onBusyChange?.(false);
          }
        }
      })();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [onBusyChange]);

  async function openLocationSettings() {
    waitingForSettings.current = true;
    try {
      await Linking.openSettings();
    } catch {
      waitingForSettings.current = false;
      setError({
        message:
          "Couldn't open Settings. Please open your device settings to enable location.",
        source: "action",
      });
    }
  }
  useEffect(() => {
    if (!preview)
      void AnalyticService.capture(
        origin === "onboarding"
          ? "home_city_onboarding_opened"
          : "home_city_profile_opened"
      );
    return () => {
      generation.current += 1;
    };
  }, [origin, preview]);
  useEffect(() => {
    const controller = new AbortController();
    if (query.trim().length < 2) return;
    const timer = setTimeout(() => {
      searchCities(query, session.current, controller.signal)
        .then((rows) => {
          if (!controller.signal.aborted) {
            setResults(rows);
            setSearched(true);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setError({
              message: "City search is unavailable. Please try again.",
              source: "action",
            });
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  function updateQuery(value: string) {
    setQuery(value);
    setResults([]);
    setSearched(false);
    setSearching(value.trim().length >= 2);
  }

  async function run(action: () => Promise<void>) {
    if (busy) return;
    const version = generation.current;
    setBusy(true);
    onBusyChange?.(true);
    setError(null);
    setSaved(false);
    try {
      await action();
    } catch (e) {
      if (generation.current === version)
        setError({
          message: e instanceof Error ? e.message : "Please try again.",
          source: "action",
        });
    } finally {
      onBusyChange?.(false);
      if (generation.current === version) setBusy(false);
    }
  }
  async function save(city: HomeCity | null) {
    if (!preview) {
      const stamps = await saveHomeCity(city, origin);
      if (profile) showPassportStamps(stamps, profile.id);
      await refreshProfile();
    }
    setSelected(city);
    updateQuery("");
    setSaved(true);
    onContinue?.();
  }
  const onSave = () => {
    void run(() => save(selected));
  };
  const onSkip = () => {
    if (!preview) void AnalyticService.capture("home_city_skipped");
    onContinue?.();
  };
  const content = (
    <View style={styles.container}>
      <AppText tone="secondary">
        Set your home city to find Martinis near you.
      </AppText>
      {origin === "profile" ? (
        <Button
          title="Use my location"
          icon="location-outline"
          variant="secondary"
          disabled={busy}
          onPress={() => {
            void run(async () => {
              const city = await detectHomeCity();
              setSelected(city);
              updateQuery("");
            });
          }}
        />
      ) : null}
      <View style={styles.fieldGroup}>
        <AppText variant="bodyStrong" tone="secondary">
          Home City
        </AppText>
        <LocationSearchField
          placeholder="Search cities"
          accessibilityLabel="Search home cities"
          value={selected ? cityLabel(selected) : query}
          disabled={busy}
          onChangeText={(value) => {
            updateQuery(value);
            setSelected(null);
            setError(null);
            setSaved(false);
          }}
        />
      </View>
      {searching ? (
        <ActivityIndicator accessibilityLabel="Searching cities" />
      ) : null}
      {results.length > 0 ? (
        <View style={styles.results}>
          {results.map((result) => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Select ${result.label}`}
              key={result.id}
              disabled={busy}
              style={selectionStyles.row}
              activeOpacity={0.7}
              onPress={() => {
                void run(async () => {
                  const city = await selectCity(result.id, session.current);
                  session.current = createCitySession();
                  setSelected(city);
                  updateQuery("");
                });
              }}
            >
              <AppText style={selectionStyles.title}>
                {result.label.split(", ")[0]}
              </AppText>
              {result.label.includes(", ") ? (
                <AppText
                  variant="caption"
                  tone="secondary"
                  style={styles.resultDetail}
                >
                  {result.label.split(", ").slice(1).join(", ")}
                </AppText>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {results.length ? (
        <AppText variant="caption" tone="muted">
          Google Maps
        </AppText>
      ) : null}
      {searched && !searching && !results.length ? (
        <AppText tone="secondary">
          No cities found. Try another spelling.
        </AppText>
      ) : null}
      {error?.source === "permission" && !selected ? (
        <View style={styles.permissionCard}>
          <AppText>
            Tini Time works best with location on.{"\n"}
            You can still select a city manually.
          </AppText>
          <Button
            title="Open Settings"
            variant="secondary"
            size="small"
            disabled={busy}
            onPress={() => void openLocationSettings()}
          />
        </View>
      ) : null}
      {error?.message &&
      error.source !== "permission" &&
      (error.source !== "location" || !selected) ? (
        <View style={styles.errorCard} accessibilityRole="alert">
          <AppText tone="danger">{error.message}</AppText>
        </View>
      ) : null}
      {saved ? (
        <AppText accessibilityLiveRegion="polite">Home city saved.</AppText>
      ) : null}
    </View>
  );
  if (renderLayout)
    // The layout renders these event handlers; it does not invoke them during render.
    // eslint-disable-next-line react-hooks/refs
    return renderLayout({
      content,
      busy,
      canSave: !!selected && !busy,
      onSave,
      onSkip,
    });
  return (
    <View style={styles.container}>
      {content}
      <Button
        title={onContinue ? "Save city & continue" : "Save home city"}
        disabled={!selected || busy}
        loading={busy}
        onPress={onSave}
      />
      {origin === "profile" && profile?.home_city ? (
        <Button
          title="Remove home city"
          variant="ghost"
          disabled={busy}
          onPress={() => {
            void run(() => save(null));
          }}
        />
      ) : null}
      {onContinue ? (
        <Button
          title="Skip for now"
          variant="ghost"
          disabled={busy}
          onPress={onSkip}
        />
      ) : null}
    </View>
  );
}
const useStyles = makeStyles((t) => ({
  container: { gap: t.spacing.md },
  fieldGroup: { gap: 6 },
  permissionCard: {
    gap: t.spacing.md,
    padding: t.spacing.md,
    borderRadius: t.radius.card,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  errorCard: {
    padding: t.spacing.md,
    borderRadius: t.radius.input,
    backgroundColor: t.colors.dangerSubtle,
    borderWidth: 1,
    borderColor: t.colors.danger,
  },
  results: { gap: t.spacing.sm },
  resultDetail: { marginTop: t.spacing.xs },
}));
