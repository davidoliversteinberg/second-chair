// Open only this instance's desk; never accept a renderer-supplied URL.
async function openDesk({ baseURL, fetchHealth = fetch, openExternal }) {
  const url = new URL("/?desk=1", baseURL).href;
  try {
    const response = await fetchHealth(new URL("/api/health", baseURL), {
      signal: AbortSignal.timeout(4000),
    });
    const health = await response.json();
    if (!response.ok || health.service !== "second-chair")
      throw new Error("unavailable");
  } catch {
    return {
      ok: false,
      url,
      error:
        "Your local desk is not responding. Quit and reopen Second Chair, then try again. Your saved chats and reports stay on this Mac.",
    };
  }
  try {
    await openExternal(url);
    return { ok: true, url };
  } catch {
    return {
      ok: false,
      url,
      error:
        "The browser could not open your desk. Copy the address below into your browser, or try again.",
    };
  }
}
module.exports = { openDesk };
