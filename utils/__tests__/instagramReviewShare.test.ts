import { Linking } from "react-native";
import Share from "react-native-share";
import { shareReviewImageToInstagram } from "../instagramReviewShare";

jest.mock("react-native-share", () => ({
  __esModule: true,
  Social: {
    Instagram: "instagram",
    InstagramStories: "instagramstories",
  },
  default: {
    Social: {
      INSTAGRAM: "instagram",
      INSTAGRAM_STORIES: "instagramstories",
    },
    shareSingle: jest.fn(),
  },
}));

const mockCanOpenURL = Linking.canOpenURL as jest.Mock;
const mockShareSingle = Share.shareSingle as jest.Mock;

describe("Instagram review image handoff", () => {
  const originalMetaAppId = process.env.EXPO_PUBLIC_META_APP_ID;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCanOpenURL.mockResolvedValue(true);
    mockShareSingle.mockResolvedValue(undefined);
    process.env.EXPO_PUBLIC_META_APP_ID = "123456789";
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_META_APP_ID = originalMetaAppId;
  });

  it("opens the Instagram Stories composer with the card as a movable sticker", async () => {
    await shareReviewImageToInstagram({
      imageUri: "file:///review-story.png",
      format: "story",
      attributionUrl: "https://tinitimeclub.com/r/42",
    });

    expect(mockCanOpenURL).toHaveBeenCalledWith("instagram-stories://share");
    expect(mockShareSingle).toHaveBeenCalledWith({
      social: "instagramstories",
      appId: "123456789",
      stickerImage: "file:///review-story.png",
      attributionURL: "https://tinitimeclub.com/r/42",
    });
  });

  it("opens the Instagram post composer with the rendered card", async () => {
    await shareReviewImageToInstagram({
      imageUri: "file:///review-post.png",
      format: "post",
      attributionUrl: "https://tinitimeclub.com/r/42",
    });

    expect(mockCanOpenURL).toHaveBeenCalledWith("instagram://app");
    expect(mockShareSingle).toHaveBeenCalledWith({
      social: "instagram",
      url: "file:///review-post.png",
      type: "image/png",
    });
  });

  it("does not capture a false-positive handoff when Instagram is absent", async () => {
    mockCanOpenURL.mockResolvedValue(false);

    await expect(
      shareReviewImageToInstagram({
        imageUri: "file:///review-story.png",
        format: "story",
        attributionUrl: "https://tinitimeclub.com/r/42",
      })
    ).rejects.toMatchObject({
      code: "not_installed",
    });
    expect(mockShareSingle).not.toHaveBeenCalled();
  });

  it("requires the Meta app ID for Instagram Stories", async () => {
    delete process.env.EXPO_PUBLIC_META_APP_ID;

    await expect(
      shareReviewImageToInstagram({
        imageUri: "file:///review-story.png",
        format: "story",
        attributionUrl: "https://tinitimeclub.com/r/42",
      })
    ).rejects.toMatchObject({
      code: "story_not_configured",
    });
    expect(mockShareSingle).not.toHaveBeenCalled();
  });
});
