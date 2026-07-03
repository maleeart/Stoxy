/** Fire-and-forget LINE push to all configured admin user IDs */
export async function notifyLine(message: string): Promise<void> {
  try {
    await fetch("/api/notify-line", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
  } catch {
    // non-critical — ignore failures
  }
}
