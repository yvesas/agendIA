import { createHash } from 'node:crypto';

// sha256 em hex (64 chars). Não é segredo de senha, é só um
// identificador opaco para lookup/revogação no DB sem guardar o JWT cru.
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
