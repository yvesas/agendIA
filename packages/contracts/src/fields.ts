import { z } from 'zod';

export const nameSchema = z
  .string()
  .trim()
  .min(3, 'Informe pelo menos 3 caracteres')
  .max(100, 'Máximo de 100 caracteres');

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Informe um e-mail')
  .email('E-mail inválido')
  .max(254, 'E-mail muito longo');

export const passwordSchema = z
  .string()
  .min(8, 'Mínimo de 8 caracteres')
  .max(128, 'Máximo de 128 caracteres')
  .regex(/[A-Z]/, 'Inclua ao menos uma letra maiúscula')
  .regex(/[a-z]/, 'Inclua ao menos uma letra minúscula')
  .regex(/\d/, 'Inclua ao menos um número')
  .regex(/[^A-Za-z0-9]/, 'Inclua ao menos um caractere especial');
