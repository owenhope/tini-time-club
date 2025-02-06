export interface NamedEntity {
  name: string;
}

export interface Location {
  name: string;
  address?: string;
}

export interface Review {
  id: number;
  comment: string;
  image_url: string;
  inserted_at: string;
  taste: number;
  presentation: number;
  location?: Location;
  spirit?: NamedEntity;
  type?: NamedEntity;
  user_id: string;
  profile?: {
    username: string;
  };
}
