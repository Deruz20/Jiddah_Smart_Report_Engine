import fs from 'fs';

const transcriptPath = 'C:/Users/USER/.gemini/antigravity-ide/brain/fb94679d-ee10-4641-8335-f3a783ee8a9d/.system_generated/logs/transcript_full.jsonl';
if (fs.existsSync(transcriptPath)) {
  const lines = fs.readFileSync(transcriptPath, 'utf8').trim().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const obj = JSON.parse(lines[i]);
      if (obj.type === 'USER_INPUT') {
        const text = typeof obj.content === 'string' ? obj.content : JSON.stringify(obj.content);
        const idx = text.indexOf('{"tables":');
        if (idx !== -1) {
          const raw = text.substring(idx);
          fs.writeFileSync('scratch/raw_pasted_catalog.txt', raw, 'utf8');
          console.log(`Found catalog in step ${obj.step_index}, length: ${raw.length}`);
          break;
        }
      }
    } catch (e) {}
  }
} else {
  console.log('Transcript not found');
}
