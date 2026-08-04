import type { FavoriteLocationValue } from "@/services/favoriteLocationSelection";

export interface OnboardingDraft {
  profileId: string;
  username: string;
  avatarUri: string | null;
  selectedSpirits: (number | string)[];
  selectedTypes: (number | string)[];
  favoriteLocation: FavoriteLocationValue | null;
}

let draft: OnboardingDraft | null = null;

const cloneDraft = (value: OnboardingDraft): OnboardingDraft => ({
  ...value,
  selectedSpirits: [...value.selectedSpirits],
  selectedTypes: [...value.selectedTypes],
  favoriteLocation: value.favoriteLocation
    ? { ...value.favoriteLocation }
    : null,
});

export const saveOnboardingDraft = (nextDraft: OnboardingDraft) => {
  draft = cloneDraft(nextDraft);
};

export const getOnboardingDraft = (profileId: string) => {
  if (draft?.profileId !== profileId) {
    draft = null;
    return null;
  }
  return cloneDraft(draft);
};

export const clearOnboardingDraft = (profileId?: string) => {
  if (!profileId || draft?.profileId === profileId) draft = null;
};
