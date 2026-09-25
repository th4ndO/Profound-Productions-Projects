import { z } from "zod";
import { LIMITS } from "@/config";

export const serviceSchema = z.object({
  name: z.string().trim().min(1, "Service name is required").max(100),
  priceFrom: z.coerce.number().int().min(0).max(100000),
  priceTo: z.coerce.number().int().min(0).max(100000).optional().nullable(),
  durationMinutes: z.coerce.number().int().min(0).max(1000).optional().nullable(),
});

export const sellerOnboardingSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is too short").max(100),
  bio: z.string().trim().max(LIMITS.bioMaxChars).optional().default(""),
  areaNote: z.string().trim().max(100).optional().default(""),
  instagramHandle: z.string().trim().max(50).optional().default(""),
  whatsappNumber: z.string().trim().min(1, "WhatsApp number is required"),
  categorySlugs: z.array(z.string()).min(1, "Pick at least one category"),
  services: z.array(serviceSchema).min(LIMITS.minServicesToOnboard, "Add at least one service"),
  consent: z
    .boolean()
    .refine((v) => v === true, "You must agree before your profile can go live"),
});

export type SellerOnboardingInput = z.infer<typeof sellerOnboardingSchema>;

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Pick a rating").max(5),
  comment: z.string().trim().max(LIMITS.reviewCommentMaxChars).optional().default(""),
});

export const reportSchema = z.object({
  reason: z.string().trim().min(1, "Tell us what's wrong").max(300),
});

export const micrositeSchema = z.object({
  tagline: z.string().trim().max(80).optional().default(""),
  themeColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Pick a color")
    .optional()
    .or(z.literal(""))
    .default(""),
  story: z.string().trim().max(1000).optional().default(""),
});

export const availabilityRuleSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Pick a start time"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Pick an end time"),
  slotMinutes: z.coerce.number().int().min(5).max(480),
});

export const bookAppointmentSchema = z.object({
  startAt: z.string().datetime({ message: "Pick a valid time" }),
  endAt: z.string().datetime({ message: "Pick a valid time" }),
  serviceId: z.string().uuid().optional().or(z.literal("")),
  note: z.string().trim().max(300).optional().default(""),
});

export type PasswordRequirement = { label: string; met: boolean };

export function passwordRequirements(password: string): PasswordRequirement[] {
  return [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One lowercase letter", met: /[a-z]/.test(password) },
    { label: "One number", met: /[0-9]/.test(password) },
  ];
}

export function isStrongPassword(password: string): boolean {
  return passwordRequirements(password).every((r) => r.met);
}
