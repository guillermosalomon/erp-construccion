/**
 * Control de acceso compartido (cliente y servidor).
 * Lista única de correos corporativos con acceso total al ERP.
 */
export const CORPORATE_EMAILS = [
  'gsalo90@outlook.com',
  'guillermosalomonsolarte@gmail.com',
  'arq.guillermo_salomon@kalarti.com',
];

export function isCorporateEmail(email) {
  if (!email) return false;
  const e = String(email).toLowerCase();
  return e.endsWith('@kalarti.com') || CORPORATE_EMAILS.includes(e);
}
