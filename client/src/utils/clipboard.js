/** Copies text, resolving to false when the browser refuses (insecure context, no permission). */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
