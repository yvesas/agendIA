// Nomes dos cookies httpOnly emitidos pela API.
// O browser nunca lê/grava esses cookies via JS — o proxy Next.js (edge)
// acessa via `request.cookies.get(...)` para fazer o route gating.
export const ACCESS_TOKEN_COOKIE = 'agendia_access_token';
export const REFRESH_TOKEN_COOKIE = 'agendia_refresh_token';
