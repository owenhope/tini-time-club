import { ReviewSubmissionError, submitNewReview } from "../reviewSubmission";

const imagePath = "member-1/review.jpg";

const makeDependencies = () => ({
  resolveLocationId: jest.fn(async (): Promise<string | null> => "42"),
  uploadImage: jest.fn(async (): Promise<string | null> => imagePath),
  createReview: jest.fn(async (): Promise<string | null> => "review-1"),
  removeImage: jest.fn(async () => undefined),
  onStage: jest.fn(),
  onLocationResolutionError: jest.fn(),
  onCleanupError: jest.fn(),
});

describe("submitNewReview", () => {
  it("requires a resolved location before uploading an image", async () => {
    const dependencies = makeDependencies();
    dependencies.resolveLocationId.mockResolvedValue(null);

    await expect(submitNewReview(dependencies)).rejects.toMatchObject({
      stage: "location",
    });
    expect(dependencies.uploadImage).not.toHaveBeenCalled();
    expect(dependencies.createReview).not.toHaveBeenCalled();
  });

  it("does not upload when location resolution throws", async () => {
    const dependencies = makeDependencies();
    dependencies.resolveLocationId.mockRejectedValue(
      new Error("Location lookup unavailable")
    );

    await expect(submitNewReview(dependencies)).rejects.toMatchObject({
      stage: "location",
    });
    expect(dependencies.uploadImage).not.toHaveBeenCalled();
    expect(dependencies.createReview).not.toHaveBeenCalled();
  });

  it("removes the uploaded image when review creation returns no ID", async () => {
    const dependencies = makeDependencies();
    dependencies.createReview.mockResolvedValue(null);

    await expect(submitNewReview(dependencies)).rejects.toMatchObject({
      stage: "review",
    });
    expect(dependencies.removeImage).toHaveBeenCalledWith(imagePath);
  });

  it("removes the uploaded image when review creation throws", async () => {
    const dependencies = makeDependencies();
    dependencies.createReview.mockRejectedValue(
      new Error("Database unavailable")
    );

    await expect(submitNewReview(dependencies)).rejects.toThrow(
      "Database unavailable"
    );
    expect(dependencies.removeImage).toHaveBeenCalledWith(imagePath);
  });

  it("preserves the review failure when image cleanup also fails", async () => {
    const dependencies = makeDependencies();
    const cleanupError = new Error("Storage cleanup unavailable");
    dependencies.createReview.mockResolvedValue(null);
    dependencies.removeImage.mockRejectedValue(cleanupError);

    await expect(submitNewReview(dependencies)).rejects.toMatchObject({
      stage: "review",
      message: "Review creation returned no ID.",
    });
    expect(dependencies.onCleanupError).toHaveBeenCalledWith(cleanupError);
  });

  it("resolves location, uploads, and creates in order without cleanup", async () => {
    const dependencies = makeDependencies();

    await expect(submitNewReview(dependencies)).resolves.toEqual({
      reviewId: "review-1",
      imagePath,
      locationId: "42",
    });

    expect(dependencies.onStage.mock.calls).toEqual([
      ["location"],
      ["upload"],
      ["review"],
    ]);
    expect(dependencies.removeImage).not.toHaveBeenCalled();
  });

  it("uses typed failures for orchestration errors", () => {
    expect(new ReviewSubmissionError("review", "failed")).toMatchObject({
      name: "ReviewSubmissionError",
      stage: "review",
      message: "failed",
    });
  });
});
