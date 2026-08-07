# Needs Review: PWA & Sync Stream Deployment

- **PowerSync Deployment**: The `powersync.yaml` configuration has been updated to include `students`. You will need to deploy this to your PowerSync instance (Cloud or self-hosted) in order to test the Sync Streams with different user roles. Note: Oracle Cloud signup failed, so we migrated to a self-hosted instance on Render.com using an Infrastructure-as-Code Blueprint (`render.yaml`).
- **Frontend Integration**: The mark entry UI (`MarksEntryClient.tsx`) and roster views (`circular-client.tsx`, `theology-client.tsx`) have been fully refactored to read from and write to the local PowerSync SQLite database instead of directly calling server actions/API endpoints. You will need to verify the sync once the backend is successfully connected.
