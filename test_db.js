const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=\"(.*?)\"/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=\"(.*?)\"/);
fetch(urlMatch[1] + '/rest/v1/', {
  headers: { apikey: keyMatch[1], Authorization: 'Bearer ' + keyMatch[1] }
}).then(r => r.json()).then(openapi => {
  const settingsDef = openapi.definitions['school_settings'];
  console.log(settingsDef ? Object.keys(settingsDef.properties).join(', ') : 'Not found');
});
