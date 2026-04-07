export async function createIfMissing<T>(
  existsQuery: Promise<unknown>,
  createFn: () => Promise<T>,
  label?: string,
): Promise<T | undefined> {
  const existing = await existsQuery;
  if (existing) {
    if (label) {
      console.log(`Skip existing ${label}`);
    }
    return undefined;
  }

  return createFn();
}
