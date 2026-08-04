import {
  clearOnboardingDraft,
  getOnboardingDraft,
  saveOnboardingDraft,
} from "@/services/onboardingDraftService";

const makeDraft = () => ({
  profileId: "profile-a",
  username: "MartiniMaven",
  avatarUri: "file:///avatar.jpg",
  selectedSpirits: [2],
  selectedTypes: [4],
  favoriteLocation: {
    id: 9,
    name: "The Lounge",
    address: "123 Main St",
  },
});

afterEach(() => clearOnboardingDraft());

describe("onboardingDraftService", () => {
  it("restores a draft for the same profile without sharing mutable arrays", () => {
    const draft = makeDraft();
    saveOnboardingDraft(draft);

    draft.selectedSpirits.push(7);
    const restored = getOnboardingDraft("profile-a");

    expect(restored).toEqual(makeDraft());
    restored?.selectedTypes.push(8);
    expect(getOnboardingDraft("profile-a")?.selectedTypes).toEqual([4]);
  });

  it("discards a draft when a different profile requests it", () => {
    saveOnboardingDraft(makeDraft());

    expect(getOnboardingDraft("profile-b")).toBeNull();
    expect(getOnboardingDraft("profile-a")).toBeNull();
  });
});
