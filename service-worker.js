chrome.runtime.onStartup.addListener(async () => {
  await checkTokenRefresh();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FETCH_APPFLOWY") {
    handleFetch(message.payload)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

async function handleFetch({ endpoint, method, headers, body }) {
  if (!endpoint.includes('gotrue/token')) {
    await checkTokenRefresh();
    const { authToken } = await chrome.storage.local.get("authToken");
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
  }

  const url = endpoint.startsWith('http') ? endpoint : `https://beta.appflowy.cloud${endpoint}`;
  
  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }
  
  console.log(`Fetching: ${method} ${url}`);
  const response = await fetch(url, options);

  let data;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = { message: text };
  }

  if (!response.ok) {
    const errorMsg = data.error_description || data.error || data.message || `HTTP error! status: ${response.status}`;
    console.error(`API Error: ${response.status} - ${errorMsg}`, data);
    throw new Error(errorMsg);
  }
  return data;
}

async function checkTokenRefresh() {
  const { expireAt, refreshToken } = await chrome.storage.local.get([
    "expireAt",
    "refreshToken",
  ]);

  if (expireAt && new Date(expireAt) < new Date()) {
    try {
      const data = await handleFetch({
        endpoint: "/gotrue/token?grant_type=refresh_token",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { refresh_token: refreshToken }
      });

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
