# AppFlowy Cloud API Guide
This guide provides information on how to authenticate, re-authenticate, and perform common data operations using the AppFlowy Cloud REST API.
---
## 1. Authentication
AppFlowy uses GoTrue for identity management. You must first obtain a Bearer token to access protected data.
### 1.1 Login (Get Initial Token)
**Endpoint:** `POST https://beta.appflowy.cloud/gotrue/token?grant_type=password`
**Headers:**
* `Content-Type: application/json`
**Body:**
```json
{
  "email": "your_email@example.com",
  "password": "your_password"
}
```
**Example Curl:**
```bash
curl -X POST "https://beta.appflowy.cloud/gotrue/token?grant_type=password" \
     -H "Content-Type: application/json" \
     -d '{"email": "your_email@example.com", "password": "your_password"}'
```
**Response:**
```json
{
  "access_token": "eyJhbG...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "ref_token_123",
  "user": { ... }
}
```
### 1.2 Re-authentication (Refresh Token)
When the `access_token` expires, use the `refresh_token` to get a new one.
**Endpoint:** `POST https://beta.appflowy.cloud/gotrue/token?grant_type=refresh_token`
**Headers:**
* `Content-Type: application/json`
**Body:**
```json
{
  "refresh_token": "your_refresh_token_here"
}
```
---
## 2. Request Structure
For all endpoints under `/api/`, the following headers are required:
* `Authorization: Bearer <your_access_token>`
* `Content-Type: application/json` (for POST/PUT requests)
---
## 3. Workspaces
### 3.1 List All Workspaces
Retrieves a list of workspaces you belong to.
**Endpoint:** `GET https://beta.appflowy.cloud/api/workspace`
**Example Curl:**
```bash
curl -H "Authorization: Bearer <token>" https://beta.appflowy.cloud/api/workspace
```
---
## 4. Notes and Pages (Folders)
In AppFlowy, "Notes" are represented as Views/Pages within a Workspace folder structure.
### 4.1 List All Notes/Pages in a Workspace
This endpoint returns the hierarchical folder structure of the workspace.
**Endpoint:** `GET https://beta.appflowy.cloud/api/workspace/{workspace_id}/folder`
**Query Parameters:**
* `depth` (optional): How deep to go into subfolders (default 1).
**Example Curl:**
```bash
curl -H "Authorization: Bearer <token>" \
     "https://beta.appflowy.cloud/api/workspace/{workspace_id}/folder?depth=2"
```
The response will contain a list of views with their `view_id`, `name`, and any `children` (sub-pages).
---
## 5. Databases
### 5.1 List Databases in a Workspace
**Endpoint:** `GET https://beta.appflowy.cloud/api/workspace/{workspace_id}/database`
### 5.2 Get Database Fields
To know what data can be stored in a database, you need to retrieve its fields.
**Endpoint:** `GET https://beta.appflowy.cloud/api/workspace/{workspace_id}/database/{database_id}/fields`
---
## 6. Data Operations (Rows)
### 6.1 List Database Row IDs
Retrieves all row identifiers for a database.
**Endpoint:** `GET https://beta.appflowy.cloud/api/workspace/{workspace_id}/database/{database_id}/row`
### 6.2 Fetch All Data (Row Details)
To get the actual content (cells) of the rows, you use the details endpoint. You can pass multiple IDs.
**Endpoint:** `GET https://beta.appflowy.cloud/api/workspace/{workspace_id}/database/{database_id}/row/detail`
**Query Parameters:**
* `ids`: Comma-separated list of row UUIDs.
* `with_doc` (optional): Set to `true` to include the markdown document content.
**Example Curl:**
```bash
curl -H "Authorization: Bearer <token>" \
     "https://beta.appflowy.cloud/api/workspace/{workspace_id}/database/{database_id}/row/detail?ids=uuid1,uuid2&with_doc=true"
```
### 6.3 Create a New Row
**Endpoint:** `POST https://beta.appflowy.cloud/api/workspace/{workspace_id}/database/{database_id}/row`
**Body:**
```json
{
  "cells": {
    "Field_ID_or_Name": "Value",
    "Another_Field": 123
  },
  "document": "Optional Markdown content for the row"
}
```
### 6.4 Upsert a Row
Update an existing row or create it if it doesn't exist.
**Endpoint:** `PUT https://beta.appflowy.cloud/api/workspace/{workspace_id}/database/{database_id}/row`
**Body:**
```json
{
  "pre_hash": "optional_string",
  "cells": {
    "Field_ID": "New Value"
  },
  "document": "Updated markdown content"
}
```
---
## Summary of Common Endpoints
|Action|Method|URL|
|---|---|---|
|Login|POST|`/gotrue/token?grant_type=password`|
|Refresh Token|POST|`/gotrue/token?grant_type=refresh_token`|
|List Workspaces|GET|`/api/workspace`|
|List Notes/Pages|GET|`/api/workspace/{workspace_id}/folder`|
|List Databases|GET|`/api/workspace/{workspace_id}/database`|
|Get Row Details|GET|`/api/workspace/{workspace_id}/database/{database_id}/row/detail`|
|Create Row|POST|`/api/workspace/{workspace_id}/database/{database_id}/row`|
