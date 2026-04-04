import { z } from 'zod'

export const RegisterSchema = z.object({
  firebaseToken: z.string().min(1),
  displayName: z.string().min(1).max(100).optional(),
})

export type RegisterDto = z.infer<typeof RegisterSchema>
