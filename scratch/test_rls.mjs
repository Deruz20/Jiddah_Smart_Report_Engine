import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vismrobdsdsaxmqegcay.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpc21yb2Jkc2RzYXhtcWVnY2F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzgwMjUwNSwiZXhwIjoyMDkzMzc4NTA1fQ.8jSbEyXwqezVTPm1pxcQ6VnKNfcDWF9NQj526x8jShM'
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: policies, error } = await supabase
    .rpc('get_policies', {}) // we might not have a function for this, let's just query pg_policies using postgres standard connection?
    // standard supabase-js client cannot query pg_catalog directly unless exposed. Let's try it anyway via REST endpoint just in case, but it probably won't work.
}

run().catch(console.error)
