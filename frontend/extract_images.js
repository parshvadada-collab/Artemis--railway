const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index2.html');
const publicDir = path.join(__dirname, 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

let content = fs.readFileSync(filePath, 'utf8');

// Also handle single quotes or no quotes
const regex = /url\(['"]?data:image\/(jpeg|png|gif|webp);base64,([^'")\s]+)['"]?\)/g;
let match;
let imageCount = 1;

while ((match = regex.exec(content)) !== null) {
  const ext = match[1];
  const base64Data = match[2];
  const filename = `train-bg-${imageCount}.${ext}`;
  const outPath = path.join(publicDir, filename);

  fs.writeFileSync(outPath, base64Data, 'base64');
  console.log(`Saved ${filename}`);

  // We need to replace it carefully in the original content
  content = content.split(match[0]).join(`url('/${filename}')`);
  imageCount++;
}

const imgRegex = /src=['"]?data:image\/(jpeg|png|gif|webp);base64,([^'">\s]+)['"]?/g;
while ((match = imgRegex.exec(content)) !== null) {
  const ext = match[1];
  const base64Data = match[2];
  const filename = `train-img-${imageCount}.${ext}`;
  const outPath = path.join(publicDir, filename);

  fs.writeFileSync(outPath, base64Data, 'base64');
  console.log(`Saved ${filename}`);

  content = content.split(match[0]).join(`src="/${filename}"`);
  imageCount++;
}

fs.writeFileSync(path.join(__dirname, 'index2_clean.html'), content, 'utf8');
console.log('Clean HTML saved to index2_clean.html');
