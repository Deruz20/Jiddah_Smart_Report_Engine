# Needs Review: PWA & Sync Stream Deployment

- **PowerSync Deployment**: The `powersync.yaml` configuration has been updated to include `students`. We have pivoted from Render to **local Docker** due to Render deployment issues (specifically, configuration collection failures on their newest containers). 
  - **IMPORTANT WARNING:** **"Local Docker only runs while this laptop is on — it is not a production destination. Before real teachers use this day to day, the PowerSync service needs to move to somewhere always-on. Working locally is not the same as done."**
- **Frontend Integration**: The mark entry UI (`MarksEntryClient.tsx`) and roster views (`circular-client.tsx`, `theology-client.tsx`) have been fully refactored to read from and write to the local PowerSync SQLite database instead of directly calling server actions/API endpoints. You will need to verify the sync once the backend is successfully connected.
