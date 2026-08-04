# Needs Review: PWA & Sync Stream Deployment

- **PowerSync Deployment**: The `powersync.yaml` configuration has been updated to include `students`. You will need to deploy this to your PowerSync instance (Cloud or self-hosted) in order to test the Sync Streams with different user roles.
- **Frontend Integration**: The mark entry UI (`MarksEntryClient.tsx`) and roster views (`circular-client.tsx`, `theology-client.tsx`) have been fully refactored to read from and write to the local PowerSync SQLite database instead of directly calling server actions/API endpoints. You will need to verify the sync once the backend is successfully connected.
