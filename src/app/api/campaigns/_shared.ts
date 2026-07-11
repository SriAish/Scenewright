import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const campaignStatusSchema = z.enum(["draft", "running", "completed"]);

export const createCampaignSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  premise: z.string().trim().nullable().optional(),
});

export const updateCampaignSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").optional(),
    premise: z.string().trim().nullable().optional(),
    status: campaignStatusSchema.optional(),
    notesJson: z.unknown().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field is required",
  });

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/*
  Empty ProseMirror/Tiptap document, the shape Tiptap itself produces
  for a blank editor. Used as the initial value for campaigns.notes_json,
  which is not-null with no DB default; the notes editor is out of
  scope for this step.
*/
export const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };
