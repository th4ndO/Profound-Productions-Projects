export type ProjectCategory = "graphic_design" | "photography" | "website_work";

export type Project = {
  id: string;
  title: string;
  description: string | null;
  category: ProjectCategory;
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
