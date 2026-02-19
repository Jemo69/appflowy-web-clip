async function appFlowyApi(endpoint, method = 'GET', body = null) {
  const { authToken } = await chrome.storage.local.get("authToken");
  if (!authToken) {
    throw new Error("No auth token found");
  }

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  };
  if (body) options.body = JSON.stringify(body);
  
  const response = await fetch(`https://beta.appflowy.cloud${endpoint}`, options);
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `API error: ${response.status}`);
  }
  return response.json();
}

// Helper to refresh token if needed
async function checkAndRefreshToken() {
    const { expireAt, refreshToken } = await chrome.storage.local.get(["expireAt", "refreshToken"]);
    if (expireAt && new Date(expireAt) < new Date()) {
        const response = await fetch("https://beta.appflowy.cloud/gotrue/token?grant_type=refresh_token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });
        const data = await response.json();
        if (data.access_token) {
            await chrome.storage.local.set({
                authToken: data.access_token,
                refreshToken: data.refresh_token,
                expireIn: data.expires_in,
                expireAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
            });
            return data.access_token;
        }
    }
    return null;
}
