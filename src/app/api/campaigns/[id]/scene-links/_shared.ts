import { z } from "zod";

export { requireOwnedCampaign } from "../scenes/_shared";

export const createSceneLinkSchema = z
  .object({
    fromSceneId: z.string().uuid(),
    toSceneId: z.string().uuid(),
    label: z.string().trim().nullable().optional(),
  })
  .refine((data) => data.fromSceneId !== data.toSceneId, {
    message: "A scene cannot link to itself",
    path: ["toSceneId"],
  });

export const updateSceneLinkSchema = z.object({
  label: z.string().trim().nullable(),
});
