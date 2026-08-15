import pg from 'pg';

const uri = process.argv[2] || process.env.PS_PG_URI;

if (!uri) {
  console.error("ERROR: No connection string provided.");
  console.error("Usage: node test_render_db.mjs <PS_PG_URI>");
  process.exit(1);
}

// Mask password for logging
const maskedUri = uri.replace(/:[^:@]+@/, ':***@');
console.log(`Attempting to connect to: ${maskedUri}`);

const client = new pg.Client({
  connectionString: uri,
  // External Render Postgres URLs strictly require SSL
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log("Connecting...");
    await client.connect();
    console.log("SUCCESS: Connected to the database!");
    
    console.log("Running SELECT 1...");
    const res = await client.query('SELECT 1 as result');
    console.log("Query Result:", res.rows[0]);
    
  } catch (err) {
    console.error("\n=== FATAL ERROR ===");
    console.error(err.message);
    console.error(err.stack);
  } finally {
    await client.end();
  }
}

run();
