const mockRpc = jest.fn();

jest.mock("@/utils/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import {
  publishReview,
  ReviewPublishingError,
} from "@/services/reviewPublishingService";

const draft = {
  location: {
    name: "The Test Bar",
    address: "100 Test Street",
    placeId: "test-place-id",
    latitude: 49.28,
    longitude: -123.12,
  },
  spiritId: 2,
  typeId: 3,
  taste: 4.5,
  presentation: 4,
  comment: "Cold and bright.",
};

describe("publishReview", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it("publishes the uploaded image and returns database transitions", async () => {
    const uploadImage = jest.fn(async () => "member-1/review.jpg");
    const removeImage = jest.fn(async () => undefined);
    mockRpc.mockResolvedValue({
      data: {
        reviewId: 91,
        locationId: 42,
        locationName: "The Test Bar",
        reviewCount: 10,
        rankUp: "call",
        becameRegular: true,
      },
      error: null,
    });

    await expect(
      publishReview(draft, { uploadImage, removeImage })
    ).resolves.toEqual({
      reviewId: "91",
      locationId: "42",
      locationName: "The Test Bar",
      imagePath: "member-1/review.jpg",
      reviewCount: 10,
      rankUp: expect.objectContaining({ key: "call" }),
      becameRegular: true,
    });

    expect(mockRpc).toHaveBeenCalledWith("publish_review_v2", {
      p_comment: "Cold and bright.",
      p_image_url: "member-1/review.jpg",
      p_latitude: 49.28,
      p_location_address: "100 Test Street",
      p_location_id: null,
      p_location_name: "The Test Bar",
      p_longitude: -123.12,
      p_mentions: [],
      p_place_id: "test-place-id",
      p_presentation: 4,
      p_spirit_id: 2,
      p_taste: 4.5,
      p_type_id: 3,
    });
    expect(removeImage).not.toHaveBeenCalled();
  });

  it("deletes the uploaded image when the transaction fails", async () => {
    const uploadImage = jest.fn(async () => "member-1/review.jpg");
    const removeImage = jest.fn(async () => undefined);
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "Database unavailable" },
    });

    await expect(
      publishReview(draft, { uploadImage, removeImage })
    ).rejects.toMatchObject({
      name: "ReviewPublishingError",
      stage: "database",
    });
    expect(removeImage).toHaveBeenCalledWith("member-1/review.jpg");
  });

  it("does not call the database when upload returns no path", async () => {
    const uploadImage = jest.fn(async () => null);

    await expect(
      publishReview(draft, {
        uploadImage,
        removeImage: jest.fn(async () => undefined),
      })
    ).rejects.toEqual(
      expect.objectContaining<Partial<ReviewPublishingError>>({
        stage: "upload",
      })
    );
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
