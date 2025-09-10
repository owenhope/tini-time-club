export interface NamedEntity {
  name: string;
}

export interface ReviewSpirit {
  name: string;
}

export interface Location {
  name: string;
  address?: string;
}

export interface ReviewLocation {
  id: string;
  name: string;
  address?: string;
}

export interface ReviewType {
  name: string;
}

export interface ReviewProfile {
  id: string;
  username: string;
  avatar_url?: string | null;
}

export interface Review {
  id: string;
  comment: string;
  image_url: string;
  inserted_at: string;
  taste: number;
  presentation: number;
  location: ReviewLocation;
  spirit: ReviewSpirit;
  type: ReviewType;
  user_id: string;
  profile: ReviewProfile;
}


