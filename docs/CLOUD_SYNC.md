# Cloud Sync Setup Guide

Formula Mapper supports syncing your data to Cloudflare KV for backup and cross-device access. This is completely optional - your data is always stored locally by default.

## Features

- **Automatic Versioning**: Up to 100 versions are kept automatically
- **Version History**: View and restore any previous version
- **Cross-Device Access**: Access your data from any device

## Setup Steps

### 1. Create a Cloudflare Account

If you don't have one, sign up at [cloudflare.com](https://cloudflare.com)

### 2. Create a KV Namespace

```bash
cd cloud/cloudflare-workers
npx wrangler kv:namespace create "FORMULA_DATA"
```

### 3. Update wrangler.toml

Copy the namespace ID from the previous step and update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "FORMULA_DATA"
id = "your-namespace-id-here"
```

### 4. Set Security Password (Recommended)

To protect your data, it's recommended to set a write password:

```bash
cd cloud/cloudflare-workers

# Set write password (protects save and delete operations)
wrangler secret put WRITE_PASSWORD
# Enter your password when prompted

# (Optional) Set API Key
wrangler secret put API_KEY
```

**Security Notes**:
- ✅ Password only exists on the Worker server
- ✅ Frontend does not store or transmit password
- ✅ Save and delete operations require password verification
- ✅ Read operations do not require password

### 5. Deploy the Worker

```bash
npx wrangler deploy
```

### 6. Configure in App

1. Click the "Cloud Sync" button in the top-right of the app
2. Enter your Worker URL (e.g., `https://your-worker.your-subdomain.workers.dev`)
3. (Optional) Add API key for additional security

## Usage

| Action | Steps |
|--------|-------|
| Save to Cloud | Click "Cloud Sync" → "Save to Cloud" |
| Load from Cloud | Click "Cloud Sync" → "Load from Cloud" |
| View History | Click "Cloud Sync" → "Version History" |
| Restore Version | Select any version from history and click "Restore" |

## Architecture

The cloud sync feature uses a strategy pattern for extensibility:

- **Current Provider**: Cloudflare KV via Cloudflare Workers
- **Storage Interface**: `CloudStorageProvider` - easy to add new providers (AWS, Aliyun, etc.)
- **Version Management**: Automatic versioning with configurable retention (default: 100 versions)

---

[← Back to README](../README.md)
