const { spawn } = require('child_process');

const p = spawn('npx.cmd', ['--yes', 'powersync', 'docker', 'configure', '--database', 'postgres', '--storage', 'postgres'], { shell: true });

p.stdout.on('data', data => {
  const out = data.toString();
  process.stdout.write(out);
  
  if (out.toLowerCase().includes('database') || out.toLowerCase().includes('source') || out.toLowerCase().includes('replication')) {
    p.stdin.write('${PS_DATA_SOURCE_URI}\n');
  } else if (out.toLowerCase().includes('storage') || out.toLowerCase().includes('postgres uri')) {
    p.stdin.write('${PS_PG_URI}\n');
  } else if (out.includes('?')) {
    p.stdin.write('\n'); // Fallback for other prompts like confirm
  }
});

p.stderr.on('data', data => {
  process.stderr.write(data.toString());
});

p.on('close', code => {
  console.log(`\nProcess exited with code ${code}`);
  process.exit(code);
});
