import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ActivityPage } from "@/types/activity";

const VERSION = 1;
const keyFor = (userId: string) => `activity:v${VERSION}:${userId}`;

export async function readActivityCache(
  userId: string
): Promise<ActivityPage | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActivityPage;
    if (!parsed || !Array.isArray(parsed.events) || !parsed.snapshotAt) {
      await AsyncStorage.removeItem(keyFor(userId));
      return null;
    }
    return { ...parsed, cached: true };
  } catch {
    await AsyncStorage.removeItem(keyFor(userId)).catch(() => {});
    return null;
  }
}

export async function writeActivityCache(
  userId: string,
  page: ActivityPage
): Promise<void> {
  await AsyncStorage.setItem(
    keyFor(userId),
    JSON.stringify({ ...page, cached: false })
  );
}

export async function clearActivityCache(userId: string): Promise<void> {
  await AsyncStorage.removeItem(keyFor(userId));
}
