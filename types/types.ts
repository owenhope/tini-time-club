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
  location: {
    name: string;
  };
  spirit: {
    name: string;
  };
  type: {
    name: string;
  };
  profile?: {
    id: string;
    username: string;
  };
}
