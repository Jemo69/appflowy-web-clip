document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const authContainer = document.getElementById("auth-container");
  const workspaceContainer = document.getElementById("workspace-container");
  const spaceContainer = document.getElementById("space-container");
  const databaseContainer = document.getElementById("database-container");
  const createDatabaseContainer = document.getElementById("create-database-container");
  const webClipper = document.getElementById("web-clipper");

  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const emailInput = document.getElementById("email");
  const passInput = document.getElementById("password");
  const messageEl = document.getElementById("message");

  const workspaceSelect = document.getElementById("workspace-select");
  const spaceSelect = document.getElementById("space-select");
  const databaseSelect = document.getElementById("database-select");
  const fieldsPreview = document.getElementById("fields-preview");
  const fieldsList = document.getElementById("fields-list");
  const confirmDbBtn = document.getElementById("confirm-db-btn");
  const showCreateDbBtn = document.getElementById("show-create-db-btn");
  const initDbBtn = document.getElementById("init-db-btn");
  const backToSelectDbBtn = document.getElementById("back-to-select-db-btn");
  const newDbNameInput = document.getElementById("new-db-name");

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
      databaseContainer,
      createDatabaseContainer,
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
        active = databaseContainer;
        loadDatabases(selectedWorkspaceId, selectedSpaceId);
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
      const response = await appFlowyApi(
        `/api/workspace/${workspaceId}/folder?depth=1`,
      );
      const folderData = response.data || response;

      spaceSelect.innerHTML =
        '<option value="">CHOOSE A SPACE...</option>';

      const items = folderData.items || (Array.isArray(folderData) ? folderData : []);

      items.forEach((item) => {
        if (item.is_space) {
          const opt = document.createElement("option");
          opt.value = item.view_id;
          opt.textContent = item.name.toUpperCase();
          spaceSelect.appendChild(opt);
        }
      });
    } catch (err) {
      console.error("Load Spaces Error:", err);
    }
  }

  async function loadDatabases(workspaceId, spaceId) {
    try {
      // Fetch all databases in workspace
      const response = await appFlowyApi(`/api/workspace/${workspaceId}/database`);
      const databases = response.data || response;

      databaseSelect.innerHTML = '<option value="">CHOOSE A DATABASE...</option>';

      if (Array.isArray(databases)) {
        // Filter databases that belong to the selected space
        const filtered = databases.filter(db => db.parent_view_id === spaceId);

        filtered.forEach(db => {
          const opt = document.createElement("option");
          opt.value = db.database_id || db.id;
          opt.textContent = db.name.toUpperCase();
          databaseSelect.appendChild(opt);
        });
      }
    } catch (err) {
      console.error("Load Databases Error:", err);
    }
  }

  async function loadDatabaseFields(workspaceId, databaseId) {
    try {
      const response = await appFlowyApi(`/api/workspace/${workspaceId}/database/${databaseId}/fields`);
      const fields = response.data || response;

      fieldsList.innerHTML = "";
      if (Array.isArray(fields)) {
        fields.forEach(field => {
          const li = document.createElement("li");
          li.innerHTML = `${field.name.toUpperCase()} <span>${getFieldTypeName(field.field_type)}</span>`;
          fieldsList.appendChild(li);
        });
        fieldsPreview.style.display = "block";
        confirmDbBtn.style.display = "block";
      }
    } catch (err) {
      console.error("Load Fields Error:", err);
    }
  }

  function getFieldTypeName(type) {
    const types = {
      0: "TEXT",
      1: "NUMBER",
      2: "SELECT",
      3: "MULTI-SELECT",
      4: "DATE",
      5: "CHECKBOX",
      6: "URL",
      10: "RELATION"
    };
    return types[type] || "UNKNOWN";
  }

  // Event Handlers
  loginBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passInput.value.trim();

    if (!email || !password) {
      showMessage("Please enter both email and password.", "error");
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "LOGGING IN...";
    
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
        showMessage("Login successful.", "success");
        updateUI();
      } else {
        showMessage("Login failed.", "error");
        loginBtn.disabled = false;
        loginBtn.textContent = "SIGN IN";
      }
    } catch (err) {
      console.error("Auth Error:", err);
      showMessage("Login failed: " + err.message, "error");
      loginBtn.disabled = false;
      loginBtn.textContent = "SIGN IN";
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

  databaseSelect.addEventListener("change", async () => {
    if (databaseSelect.value) {
      const { selectedWorkspaceId } = await chrome.storage.local.get("selectedWorkspaceId");
      loadDatabaseFields(selectedWorkspaceId, databaseSelect.value);
    } else {
      fieldsPreview.style.display = "none";
      confirmDbBtn.style.display = "none";
    }
  });

  confirmDbBtn.addEventListener("click", async () => {
    if (databaseSelect.value) {
      await chrome.storage.local.set({ selectedDatabaseId: databaseSelect.value });
      updateUI();
    }
  });

  showCreateDbBtn.addEventListener("click", () => {
    databaseContainer.style.display = "none";
    createDatabaseContainer.style.display = "block";
    createDatabaseContainer.style.opacity = "1";
  });

  backToSelectDbBtn.addEventListener("click", () => {
    createDatabaseContainer.style.display = "none";
    databaseContainer.style.display = "block";
    databaseContainer.style.opacity = "1";
  });

  initDbBtn.addEventListener("click", async () => {
    const dbName = newDbNameInput.value.trim();
    if (!dbName) {
      showMessage("Please enter a database name.", "error");
      return;
    }

    const { selectedWorkspaceId, selectedSpaceId } =
      await chrome.storage.local.get([
        "selectedWorkspaceId",
        "selectedSpaceId",
      ]);

    try {
      const createResponse = await appFlowyApi(
        `/api/workspace/${selectedWorkspaceId}/database`,
        "POST",
        {
          name: dbName,
          layout_type: 0,
          parent_view_id: selectedSpaceId,
        },
      );

      const databaseId = createResponse.database_id || createResponse.id;
      if (databaseId) {
        await chrome.storage.local.set({ selectedDatabaseId: databaseId });
        showMessage(`Database created successfully.`, "success");
        updateUI();
      }
    } catch (err) {
      console.error("Init DB Error:", err);
      showMessage("Database creation failed.", "error");
    }
  });

  webClipperBtn.addEventListener("click", async () => {
    const { selectedWorkspaceId, selectedDatabaseId } =
      await chrome.storage.local.get([
        "selectedWorkspaceId",
        "selectedDatabaseId",
      ]);

    try {
      // Fetch fields to find the correct mapping
      const fieldsResponse = await appFlowyApi(`/api/workspace/${selectedWorkspaceId}/database/${selectedDatabaseId}/fields`);
      const fields = fieldsResponse.data || fieldsResponse;

      const cells = {};

      // Attempt to map to common field names
      if (Array.isArray(fields)) {
        fields.forEach(field => {
          const name = field.name.toLowerCase();
          if (name === "name" || name === "title") {
            cells[field.name] = webClipInput.value;
          } else if (name === "url" || name === "link") {
            cells[field.name] = webClipInput.value;
          }
        });
      }

      // Fallback if no mapping found
      if (Object.keys(cells).length === 0) {
        cells["Name"] = webClipInput.value;
      }

      await appFlowyApi(
        `/api/workspace/${selectedWorkspaceId}/database/${selectedDatabaseId}/row`,
        "POST",
        { cells },
      );
      showMessage("Page clipped to AppFlowy.", "success");
    } catch (err) {
      showMessage("Clip failed: " + err.message, "error");
    }
  });

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = type;
    messageEl.style.display = "block";
    setTimeout(() => {
      messageEl.style.display = "none";
    }, 3000);
  }

  copyIdBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(databaseIdDisplay.textContent);
    const originalText = copyIdBtn.textContent;
    copyIdBtn.textContent = "COPIED!";
    setTimeout(() => (copyIdBtn.textContent = originalText), 1500);
  });

  logoutBtn.addEventListener("click", async () => {
    await chrome.storage.local.clear();
    location.reload();
  });

  updateUI();
});
