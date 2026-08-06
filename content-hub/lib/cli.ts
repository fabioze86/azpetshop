export function getArg(argv: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

export function requireArg(argv: string[], name: string): string {
  const value = getArg(argv, name);
  if (!value) {
    throw new Error(`faltou --${name}=<valor>`);
  }
  return value;
}

export function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(`--${name}`);
}
