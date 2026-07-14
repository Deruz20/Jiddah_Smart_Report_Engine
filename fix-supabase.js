const fs = require('fs');
const path = require('path');

const clientFiles = [
  "src/components/layout/circular-client.tsx",
  "src/components/layout/theology-client.tsx",
  "src/components/layout/terms-client.tsx",
  "src/components/layout/teachers-client.tsx",
  "src/components/layout/subjects-client.tsx",
  "src/components/layout/remarks-client.tsx",
  "src/components/layout/classes-client.tsx",
  "src/components/layout/account-client.tsx",
  "src/app/login/page.tsx",
  "src/app/onboarding/page.tsx"
];

clientFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // First, comment out the root `const supabase = createClient();`
    content = content.replace(/(\s+)const supabase = createClient\(\);/g, '$1// const supabase = createClient(); /* removed to fix ssr */');
    
    // Then, replace all usages of supabase with createClient() if they are not already locally declared.
    // To be safe, we just prepend `const supabase = createClient();` into useEffects and functions.
    
    // Replace `useEffect(() => {` with `useEffect(() => { \n const supabase = createClient();`
    content = content.replace(/useEffect\(\(\) => \{/g, 'useEffect(() => {\n    const supabase = createClient();');
    content = content.replace(/useEffect\(\(.*?\) => \{/g, (match) => {
        if (match.includes('() => {')) return match;
        return match + '\n    const supabase = createClient();';
    });
    
    // Replace async functions like `const handleSave = async () => {`
    content = content.replace(/const (\w+) = async \((.*?)\) => \{/g, 'const $1 = async ($2) => {\n    const supabase = createClient();');
    content = content.replace(/const (\w+) = \((.*?)\) => \{/g, 'const $1 = ($2) => {\n    const supabase = createClient();');
    
    // Write it back
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
