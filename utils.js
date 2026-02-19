async function appFlowyApi(endpoint, method = 'GET', body = null) {
  const { authToken } = await chrome.storage.local.get("authToken");
  
  const headers = {
    'Content-Type': 'application/json'
  };

  if (authToken && !endpoint.includes('gotrue/token')) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: "FETCH_APPFLOWY",
      payload: { endpoint, method, headers, body }
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response.success) {
        resolve(response.data);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}

async function checkAndRefreshToken() {
    const { expireAt, refreshToken } = await chrome.storage.local.get(["expireAt", "refreshToken"]);
    if (expireAt && new Date(expireAt) < new Date()) {
        try {
            const data = await appFlowyApi("/gotrue/token?grant_type=refresh_token", "POST", {
                refresh_token: refreshToken
            });
            if (data.access_token) {
                await chrome.storage.local.set({
                    authToken: data.access_token,
                    refreshToken: data.refresh_token,
                    expireIn: data.expires_in,
                    expireAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
                });
                return data.access_token;
            }
        } catch (err) {
            console.error("Refresh token error:", err);
        }
    }
    return null;
}
