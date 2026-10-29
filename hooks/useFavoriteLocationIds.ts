import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useProfile } from "@/context/profile-context";
import {
  getProfileFavorites,
  type FavoritesCursor,
} from "@/services/locationFavoritesService";
import { rememberFavoriteList } from "@/services/favoritePlacesCache";
import { reportError } from "@/utils/log";

const EMPTY: ReadonlySet<string> = new Set();
// 30 a page; ten pages covers any realistic list without an unbounded loop.
const MAX_PAGES = 10;

const sameIds = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
  a.size === b.size && [...a].every((id) => b.has(id));

/**
 * The signed-in member's favorite place ids, refreshed whenever the screen
 * regains focus — liking a place happens on its own screen, so returning to
 * the map is when the pins need to catch up. Favorites are only readable
 * through the paged profile RPC, so this walks its pages.
 */
export function useFavoriteLocationIds(): ReadonlySet<string> {
  const memberId = useProfile().profile?.id;
  const [state, setState] = useState<{
    memberId: string;
    ids: ReadonlySet<string>;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!memberId) return;
      let active = true;

      const load = async () => {
        const ids = new Set<string>();
        let cursor: FavoritesCursor | null = null;
        for (let page = 0; page < MAX_PAGES; page++) {
          const result = await getProfileFavorites(memberId, cursor);
          result.items.forEach((item) => ids.add(String(item.location_id)));
          cursor = result.cursor;
          if (!cursor) break;
        }
        // Only a whole list can say a place is not liked.
        if (!cursor) rememberFavoriteList(memberId, ids);
        if (!active) return;
        // Keep the previous set when nothing changed so map pins, keyed on
        // their favorite state, don't remount on every focus.
        setState((previous) =>
          previous?.memberId === memberId && sameIds(previous.ids, ids)
            ? previous
            : { memberId, ids }
        );
      };

      load().catch((cause) =>
        reportError("Unable to load favorite places for the map:", cause)
      );
      return () => {
        active = false;
      };
    }, [memberId])
  );

  return state && state.memberId === memberId ? state.ids : EMPTY;
}
