export function readUsername(argument: string | undefined, environment: string | undefined): string {
  const username = (argument ?? environment ?? '').trim().replace(/^@/, '');
  if (!/^[a-zA-Z0-9_.]{1,24}$/.test(username)) throw new Error('Informe o @perfil que está ao vivo: npm run live -- @perfil');
  return username;
}
