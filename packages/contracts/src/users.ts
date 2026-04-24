import { z } from 'zod';

import { emailSchema, nameSchema, passwordSchema } from './fields';

export const updateProfileSchema = z
  .object({
    name: nameSchema.optional(),
    email: emailSchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.email !== undefined, {
    message: 'Informe ao menos um campo para atualizar',
  });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe sua senha atual'),
  newPassword: passwordSchema,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
