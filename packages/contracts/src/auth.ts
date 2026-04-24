import { z } from 'zod';

import { emailSchema, nameSchema, passwordSchema } from './fields';

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe sua senha'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
