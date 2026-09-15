export interface EmailMember {
  id: string;
  username: string | null;
  name: string | null;
  email: string;
}
export type EmailSegment = "all" | "active" | "inactive";
export type EmailAudienceCounts = Record<EmailSegment, number>;
export interface EmailCampaign {
  id: string;
  subject: string;
  body: string;
  sender: string;
  public_url: string;
  audience: "selected" | EmailSegment;
  created_at: string;
  started_at: string | null;
}
export type EmailStatus =
  "pending" | "sending" | "sent" | "failed" | "skipped" | "uncertain";
export interface EmailRecipient {
  id: string;
  email: string;
  status: EmailStatus;
  provider_id: string | null;
  error_code: string | null;
  lease_until: string | null;
}
export interface EmailCampaignDetail {
  campaign: EmailCampaign;
  counts: Record<EmailStatus, number>;
  recipients: EmailRecipient[];
}
