export function getMasterKey() {
  const key = process.env.MASTER_KEY;

  if (!key) {
    throw new Error("MASTER_KEY is missing (runtime)");
  }

  return key;
}
