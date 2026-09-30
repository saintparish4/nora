import { z } from 'zod';

export const UserSchema = z.object({
  id: z.number(),
  email: z.string(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  state: z.string().nullish(),
  phone: z.string().nullish(),
});

export type User = z.infer<typeof UserSchema>;
