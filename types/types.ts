export interface NamedEntity {
  name: string;
}

export interface ReviewSpirit {
  // Define the properties of ReviewSpirit here
}

export interface Location {
  name: string;
  address?: string;
}

export interface ReviewLocation {
  name: string;
  address?: string;
}

export interface ReviewType {
  // Define the properties of ReviewType here
}

export interface ReviewProfile {
  // Define the properties of ReviewProfile here
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
  profile: {
    id: string;
    username: string;
  };
}


