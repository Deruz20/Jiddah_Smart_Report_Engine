const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupPolicies() {
  const sql = `
    -- Enable RLS on storage.objects if not already
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

    -- Create policies for documents bucket
    CREATE POLICY "Allow authenticated uploads to documents"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK ( bucket_id = 'documents' );

    CREATE POLICY "Allow authenticated updates to documents"
    ON storage.objects FOR UPDATE TO authenticated
    USING ( bucket_id = 'documents' );

    CREATE POLICY "Allow public read from documents"
    ON storage.objects FOR SELECT TO public
    USING ( bucket_id = 'documents' );

    CREATE POLICY "Allow authenticated deletes from documents"
    ON storage.objects FOR DELETE TO authenticated
    USING ( bucket_id = 'documents' );

    -- Create policies for user-avatars bucket
    CREATE POLICY "Allow authenticated uploads to user-avatars"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK ( bucket_id = 'user-avatars' );

    CREATE POLICY "Allow public read from user-avatars"
    ON storage.objects FOR SELECT TO public
    USING ( bucket_id = 'user-avatars' );

    CREATE POLICY "Allow authenticated updates to user-avatars"
    ON storage.objects FOR UPDATE TO authenticated
    USING ( bucket_id = 'user-avatars' );

    -- Create policies for signatures bucket
    CREATE POLICY "Allow authenticated uploads to signatures"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK ( bucket_id = 'signatures' );

    CREATE POLICY "Allow public read from signatures"
    ON storage.objects FOR SELECT TO public
    USING ( bucket_id = 'signatures' );
    
    CREATE POLICY "Allow authenticated updates to signatures"
    ON storage.objects FOR UPDATE TO authenticated
    USING ( bucket_id = 'signatures' );
  `;

  // We can't use rpc('run_sql') because it doesn't exist.
  // Instead, let's use the pg driver to run this!
}

setupPolicies();
