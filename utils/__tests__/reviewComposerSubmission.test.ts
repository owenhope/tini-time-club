import {
  submitEditedReview,
  submitNewReview,
  type ReviewComposerLocation,
} from "../reviewComposerSubmission";

const location: ReviewComposerLocation = {
  id: "location-1",
  name: "Bar",
  address: "123 Main Street",
  place_id: "place-1",
  coordinates: { latitude: 49.28, longitude: -123.12 },
};

describe("review composer submission orchestration", () => {
  it("maps a new review into the publishing service and forwards its hooks", async () => {
    const publishReview = jest.fn(async (draft, dependencies) => {
      dependencies.onStage?.("upload");
      return {
        reviewId: "review-1",
        locationId: "location-1",
        locationName: "Bar",
        imagePath: "member-1/review.jpg",
        reviewCount: 3,
        rankUp: null,
        becameRegular: false,
      };
    });
    const onStage = jest.fn();
    const uploadImage = jest.fn(async () => "member-1/review.jpg");
    const removeImage = jest.fn(async () => undefined);

    const result = await submitNewReview(
      {
        location,
        spiritId: 1,
        typeId: 2,
        taste: 4,
        presentation: 5,
        comment: "A caption",
        mentions: [],
      },
      {
        publishReview,
        uploadImage,
        removeImage,
        onStage,
      }
    );

    expect(result.reviewId).toBe("review-1");
    expect(publishReview).toHaveBeenCalledWith(
      expect.objectContaining({
        location: expect.objectContaining({
          id: null,
          placeId: "place-1",
          latitude: 49.28,
        }),
        spiritId: 1,
        typeId: 2,
      }),
      expect.objectContaining({ uploadImage, removeImage, onStage })
    );
    expect(onStage).toHaveBeenCalledWith("upload");
  });

  it("replaces the old image only after an edit succeeds", async () => {
    const events: string[] = [];
    const updateReview = jest.fn(async () => {
      events.push("update");
    });

    await submitEditedReview(
      {
        reviewId: "review-1",
        userId: "member-1",
        originalImagePath: "member-1/old.jpg",
        photoChanged: true,
        spirit: 1,
        type: 2,
        taste: 4,
        presentation: 5,
        comment: "Updated",
        mentions: [],
      },
      {
        uploadImage: async () => {
          events.push("upload");
          return "member-1/new.jpg";
        },
        removeImage: async (path) => {
          events.push(`remove:${path}`);
        },
        resolveLocationId: async () => "location-2",
        updateReview,
      }
    );

    expect(events).toEqual(["upload", "update", "remove:member-1/old.jpg"]);
    expect(updateReview).toHaveBeenCalledWith(
      "review-1",
      expect.objectContaining({ image_url: "member-1/new.jpg" }),
      "member-1",
      []
    );
  });

  it("removes a replacement image when an edit fails", async () => {
    const removeImage = jest.fn(async () => undefined);

    await expect(
      submitEditedReview(
        {
          reviewId: "review-1",
          userId: "member-1",
          originalImagePath: "member-1/old.jpg",
          photoChanged: true,
          spirit: 1,
          type: 2,
          taste: 4,
          presentation: 5,
          comment: "Updated",
          mentions: [],
        },
        {
          uploadImage: async () => "member-1/new.jpg",
          removeImage,
          resolveLocationId: async () => "location-2",
          updateReview: async () => {
            throw new Error("update failed");
          },
        }
      )
    ).rejects.toThrow("update failed");

    expect(removeImage).toHaveBeenCalledWith("member-1/new.jpg");
  });
});
