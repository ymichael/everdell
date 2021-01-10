export function assertUnreachable(x: never, msg: string): never {
  throw new Error(msg);
}
