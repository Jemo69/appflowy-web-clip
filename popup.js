document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const authContainer = document.getElementById("auth-container");
  const workspaceContainer = document.getElementById("workspace-container");
  const spaceContainer = document.getElementById("space-container");
  const categoryContainer = document.getElementById("category-container");
  const webClipper = document.getElementById("web-clipper");

  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const emailInput = document.getElementById("email");
  const passInput = document.getElementById("password");

  const workspaceSelect = document.getElementById("workspace-select");
  const spaceSelect = document.getElementById("space-select");
  const categorySelect = document.getElementById("category-select");
  const initDbBtn = document.getElementById("init-db-btn");
  const addFieldBtn = document.getElementById("add-field-btn");
  const newFieldNameInput = document.getElementById("new-field-name");
  const fieldsList = document.getElementById("fields-list");

  const webClipInput = document.getElementById("web-clipper-input");
  const webClipperBtn = document.getElementById("web-clipper-btn");
  const targetInfo = document.getElementById("target-info");
  const databaseIdDisplay = document.getElementById("database-id-display");
  const copyIdBtn = document.getElementById("copy-id-btn");

  let customFields = [];

  // UI Updates
  async function updateUI() {
    const {
      authToken,
      selectedWorkspaceId,
      selectedSpaceId,
      selectedDatabaseId,
    } = await chrome.storage.local.get([
      "authToken",
      "selectedWorkspaceId",
      "selectedSpaceId",
      "selectedDatabaseId",
    ]);

    const containers = [
      authContainer,
      workspaceContainer,
      spaceContainer,
      categoryContainer,
      webClipper,
    ];

    // Simple fade transition logic
    containers.forEach((c) => {
      if (c.style.display !== "none") {
        c.style.opacity = "0";
        setTimeout(() => (c.style.display = "none"), 200);
      }
    });

    setTimeout(() => {
      let active;
      if (!authToken) {
        active = authContainer;
      } else if (!selectedWorkspaceId) {
        active = workspaceContainer;
        loadWorkspaces();
      } else if (!selectedSpaceId) {
        active = spaceContainer;
        loadSpaces(selectedWorkspaceId);
      } else if (!selectedDatabaseId) {
        active = categoryContainer;
      } else {
        active = webClipper;
        targetInfo.textContent = `WS: ${selectedWorkspaceId.substring(0, 5)}... Space: ${selectedSpaceId.substring(0, 5)}...`;
        databaseIdDisplay.textContent = selectedDatabaseId;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            webClipInput.value = tabs[0].url;
          }
        });
      }

      if (active) {
        active.style.display = "block";
        active.style.opacity = "0";
        active.style.transition = "opacity 0.3s ease-in-out";
        setTimeout(() => (active.style.opacity = "1"), 50);
      }
    }, 250);
  }

  async function loadWorkspaces() {
    try {
      const response = await appFlowyApi("/api/workspace");
      const workspaces = response.data || response;
      workspaceSelect.innerHTML =
        '<option value="">Select a workspace</option>';
      if (Array.isArray(workspaces)) {
        workspaces.forEach((ws) => {
          const opt = document.createElement("option");
          opt.value = ws.workspace_id;
          opt.textContent = ws.name;
          workspaceSelect.appendChild(opt);
        });
      }
    } catch (err) {
      console.error("Load Workspaces Error:", err);
    }
  }

  async function loadSpaces(workspaceId) {
    try {
      // Fetch folders/spaces in the workspace
      const response = await appFlowyApi(
        `/api/workspace/${workspaceId}/folder?depth=2`,
      );
      // The response is usually a tree structure. We'll flatten it or show top-level folders.
      const folderData = response.data || response;

      spaceSelect.innerHTML =
        '<option value="">Select a space (folder)</option>';

      // Recursive helper to populate spaces
      function populate(items, indent = "") {
        if (!items) return;
        items.forEach((item) => {
          // Only show items that can act as containers (usually folders or views with children)
          const opt = document.createElement("option");
          opt.value = item.view_id;
          opt.textContent = indent + item.name;
          spaceSelect.appendChild(opt);
          if (item.children) {
            populate(item.children, indent + "-- ");
          }
        });
      }

      if (folderData.items) {
        populate(folderData.items);
      } else if (Array.isArray(folderData)) {
        populate(folderData);
      }
    } catch (err) {
      console.error("Load Spaces Error:", err);
    }
  }

  // Event Handlers
  loginBtn.addEventListener("click", async () => {
    loginBtn.disabled = true;
    loginBtn.textContent = "Logging in...";
    const email = emailInput.value;
    const password = passInput.value;
    try {
      const data = await appFlowyApi(
        "/gotrue/token?grant_type=password",
        "POST",
        { email, password }
      );
      if (data.access_token) {
        await chrome.storage.local.set({
          authToken: data.access_token,
          userEmail: email,
          refreshToken: data.refresh_token,
          expireIn: data.expires_in,
          expireAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        });
        updateUI();
      } else {
        alert("Login failed");
        loginBtn.disabled = false;
        loginBtn.textContent = "Sign In";
      }
    } catch (err) {
      console.error("Auth Error:", err);
      alert("Login failed: " + err.message);
      loginBtn.disabled = false;
      loginBtn.textContent = "Sign In";
    }
  });

  workspaceSelect.addEventListener("change", async () => {
    if (workspaceSelect.value) {
      await chrome.storage.local.set({
        selectedWorkspaceId: workspaceSelect.value,
      });
      updateUI();
    }
  });

  spaceSelect.addEventListener("change", async () => {
    if (spaceSelect.value) {
      await chrome.storage.local.set({ selectedSpaceId: spaceSelect.value });
      updateUI();
    }
  });

  addFieldBtn.addEventListener("click", () => {
    const fieldName = newFieldNameInput.value.trim();
    if (fieldName && !customFields.includes(fieldName)) {
      customFields.push(fieldName);
      const li = document.createElement("li");
      li.textContent = fieldName;
      fieldsList.appendChild(li);
      newFieldNameInput.value = "";
    }
  });

  initDbBtn.addEventListener("click", async () => {
    const category = categorySelect.value;
    const { selectedWorkspaceId, selectedSpaceId } =
      await chrome.storage.local.get([
        "selectedWorkspaceId",
        "selectedSpaceId",
      ]);

    try {
      const dbName = `Tasks (${category})`;
      // Create Database inside the selected space (parent_view_id)
      const createResponse = await appFlowyApi(
        `/api/workspace/${selectedWorkspaceId}/database`,
        "POST",
        {
          name: dbName,
          layout_type: 0,
          parent_view_id: selectedSpaceId, // Pass selected space as parent
        },
      );

      const databaseId = createResponse.database_id || createResponse.id;
      if (databaseId) {
        // Create custom fields
        for (const fieldName of customFields) {
          try {
            await appFlowyApi(
              `/api/workspace/${selectedWorkspaceId}/database/${databaseId}/field`,
              "POST",
              {
                name: fieldName,
                field_type: 0,
              },
            );
          } catch (e) {}
        }
        await chrome.storage.local.set({ selectedDatabaseId: databaseId });
        alert(`Database "${dbName}" created!`);
        updateUI();
      }
    } catch (err) {
      console.error("Init DB Error:", err);
      alert("Failed to initialize database. Ensure you have permissions.");
    }
  });

  webClipperBtn.addEventListener("click", async () => {
    const { selectedWorkspaceId, selectedDatabaseId } =
      await chrome.storage.local.get([
        "selectedWorkspaceId",
        "selectedDatabaseId",
      ]);
    try {
      await appFlowyApi(
        `/api/workspace/${selectedWorkspaceId}/database/${selectedDatabaseId}/row`,
        "POST",
        {
          cells: {
            Name: webClipInput.value,
            URL: webClipInput.value,
          },
        },
      );
      alert("Clipped!");
    } catch (err) {
      alert("Clip failed: " + err.message);
    }
  });

  copyIdBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(databaseIdDisplay.textContent);
    const originalText = copyIdBtn.textContent;
    copyIdBtn.textContent = "Copied!";
    setTimeout(() => (copyIdBtn.textContent = originalText), 1500);
  });

  logoutBtn.addEventListener("click", async () => {
    await chrome.storage.local.clear();
    location.reload();
  });

  updateUI();
});
