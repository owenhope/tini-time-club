export function adminActionFeedback(params) {
  if (params.get("error")) {
    const errors = {
      name: "Enter a valid name.",
      address: "The address is too long.",
      neighborhood: "The neighborhood is too long.",
      placeId: "Check the Google place ID; it may already be in use.",
      eligibility: "Enter a valid reason for changing eligibility.",
      verificationReason: "Enter a reason for verification.",
      reason: "Enter a reason before continuing.",
      manager: "No active member matched that manager.",
      slug: "Use a unique slug containing lowercase letters, numbers, and hyphens.",
      fields: "Check the name and display order.",
      coordinates: "Check the map coordinates and catchment radius.",
      body: "Enter a notification message of 180 characters or fewer.",
      url: "The notification link must be an in-app path starting with /.",
      audience: "No eligible recipients matched that audience.",
    };
    return {
      kind: "error",
      message:
        (Object.hasOwn(errors, params.get("error"))
          ? errors[params.get("error")]
          : null) ??
        "The action could not be completed. Check your entries and try again.",
    };
  }
  if (
    params.get("refresh") === "failed" ||
    params.get("eligibility") === "blocked"
  ) {
    return {
      kind: "error",
      message:
        "Region settings were saved, but activation or Golden Glass refresh needs attention. Review the details on this page.",
    };
  }
  const updated = params.get("updated");
  if (updated) {
    const messages = {
      approved: "Claim approved successfully.",
      rejected: "Claim rejected successfully.",
      verified: "Place verified successfully.",
      revoked: "Verification revoked successfully.",
      restored: "Verification restored successfully.",
      "manager-added": "Manager added successfully.",
      "manager-removed": "Manager removed successfully.",
    };
    return {
      kind: "success",
      message:
        (Object.hasOwn(messages, updated) ? messages[updated] : null) ??
        "Changes saved successfully.",
    };
  }
  if (params.get("refreshed") === "1")
    return { kind: "success", message: "Golden Glass refreshed successfully." };
  if (/^[1-9]\d*$/.test(params.get("sent") ?? ""))
    return {
      kind: "success",
      message: `Notification queued for ${params.get("sent")} recipient(s).`,
    };
  return null;
}
