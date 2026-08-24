const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupBuckets() {
  const bucketsToCreate = ['documents', 'signatures', 'user-avatars'];

  for (const bucket of bucketsToCreate) {
    console.log(`Checking bucket: ${bucket}...`);
    const { data: existingBucket, error: getError } = await supabase.storage.getBucket(bucket);
    
    if (getError && getError.message.includes('not found')) {
       console.log(`Bucket ${bucket} not found. Creating...`);
       const { error: createError } = await supabase.storage.createBucket(bucket, {
         public: true, // we want them accessible via public URL for rendering
         allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
         fileSizeLimit: 10485760 // 10MB
       });

       if (createError) {
         console.error(`Failed to create bucket ${bucket}:`, createError);
       } else {
         console.log(`Bucket ${bucket} created successfully.`);
       }
    } else if (existingBucket) {
       console.log(`Bucket ${bucket} already exists.`);
    } else {
       console.error(`Error checking bucket ${bucket}:`, getError);
    }
  }
}

setupBuckets();
