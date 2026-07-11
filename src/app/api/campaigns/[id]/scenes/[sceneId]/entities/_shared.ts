import { z } from "zod";

export const addSceneEntitySchema = z.object({
  entityId: z.string().uuid(),
});
