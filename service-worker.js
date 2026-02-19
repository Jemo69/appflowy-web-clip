chrome.runtime.onStartup.addListener(async () => {
  await checkTokenRefresh();
});

async function checkTokenRefresh() {
  const { expireAt, refreshToken } = await chrome.storage.local.get([
    "expireAt",
    "refreshToken",
  ]);

  if (expireAt && new Date(expireAt) < new Date()) {
    try {
      const response = await fetch(
        "https://beta.appflowy.cloud/gotrue/token?grant_type=refresh_token",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        },
      );

      const data = await response.json();

      if (data.access_token) {
        await chrome.storage.local.set({
          authToken: data.access_token,
          refreshToken: data.refresh_token,
          expireIn: data.expires_in,
          expireAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        });
      }
    } catch (err) {
      console.error("Token refresh failed:", err);
    }
  }
}
