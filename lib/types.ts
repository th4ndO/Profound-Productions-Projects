export type ProjectCategory = "graphic_design" | "photography" | "website_work";

export type ProjectSubcategory =
  | "logo"
  | "business_card"
  | "poster"
  | "flyer"
  | "other";

export type Project = {
  id: string;
  title: string;
  description: string | null;
  category: ProjectCategory;
  subcategory: ProjectSubcategory | null;
  client_name: string | null;
  image_url: string;
  website_url: string | null;
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  graphic_design: "Graphic Design",
  photography: "Photography",
  website_work: "Website Work",
};

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as [
  ProjectCategory,
  string
][];

export const SUBCATEGORY_LABELS: Record<ProjectSubcategory, string> = {
  logo: "Logos",
  business_card: "Business Cards",
  poster: "Posters",
  flyer: "Flyers",
  other: "Other",
};

export const SUBCATEGORY_OPTIONS = Object.entries(SUBCATEGORY_LABELS) as [
  ProjectSubcategory,
  string
][];
