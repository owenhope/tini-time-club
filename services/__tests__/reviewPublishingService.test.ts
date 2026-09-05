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
    mockRpc.mockResolvedValueOnce({
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
    mockRpc.mockResolvedValueOnce({
      data: {
        points: 50,
        previousPoints: 49,
        unlocked: [{
          id: "stamp-1", key: "locations-5", series: "Venues",
          metric: "locations", threshold: 5, points: 25,
          title: "Total Locations", label: "5 locations", unit: "locations",
          hint: "Review different venues.", artwork_key: "locations",
          progress: 5, earned: true, awarded_at: "2026-09-04T20:00:00Z",
          subject_a: null, subject_b: null,
        }],
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
      passportPoints: 50,
      rankUp: expect.objectContaining({ key: "call" }),
      becameRegular: true,
      passportStamps: [expect.objectContaining({ key: "locations-5", points: 25 })],
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
    expect(mockRpc).toHaveBeenCalledWith("reconcile_my_passport_v1");
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
