const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index2.html');
const publicDir = path.join(__dirname, 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

let content = fs.readFileSync(filePath, 'utf8');

// 1. Extract and replace ALL base64 images
const regex = /(url\(['"]?|src=['"]?)(data:image\/(jpeg|png|gif|webp);base64,([^'")]*))(['")]?)/g;
let match;
let imageCount = 1;

while ((match = regex.exec(content)) !== null) {
  const prefix = match[1];
  const fullBase64 = match[2];
  const ext = match[3];
  const base64Data = match[4];
  const suffix = match[5];

  const filename = `train-asset-${imageCount}.${ext}`;
  const outPath = path.join(publicDir, filename);

  // Write file
  try {
    fs.writeFileSync(outPath, base64Data, { encoding: 'base64' });
    console.log(`Saved ${filename}`);
  } catch (err) {
    console.error(`Failed to save ${filename}:`, err);
  }

  // Replace strictly
  content = content.replace(fullBase64, `/${filename}`);
  imageCount++;
}

// 2. Extract <style>...</style> block
let styleContent = '';
const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/i;
const styleMatch = styleRegex.exec(content);
if (styleMatch) {
  styleContent = styleMatch[1];
}

// 3. Extract <body>...</body> content
let bodyContent = '';
const bodyRegex = /<body[^>]*>([\s\S]*?)<\/body>/i;
const bodyMatch = bodyRegex.exec(content);
if (bodyMatch) {
  bodyContent = bodyMatch[1];
}

// If no body found, just take everything
if (!bodyContent) {
  bodyContent = content;
}

// 4. Convert HTML attributes to React
// class -> className
bodyContent = bodyContent.replace(/\sclass=/g, ' className=');
// for -> htmlFor
bodyContent = bodyContent.replace(/\sfor=/g, ' htmlFor=');
// tabindex -> tabIndex
bodyContent = bodyContent.replace(/\stabindex=/g, ' tabIndex=');
// inline styles -> ignore or remove if complicated, but let's try to pass them through as strings or just strip script tags
bodyContent = bodyContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
// convert <!-- forms --> to {/* forms */}
bodyContent = bodyContent.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');
// close self-closing tags: <img ... >, <input ... >, <br>, <hr>
bodyContent = bodyContent.replace(/<(img|input|br|hr|source|meta|link)([^>]*?)(?!\/)(?=>)/gi, '<$1$2 />');

// Remove SVG errors (often from copy/paste inline SVGs that have attributes like stroke-width)
bodyContent = bodyContent.replace(/stroke-width=/g, 'strokeWidth=');
bodyContent = bodyContent.replace(/stroke-linecap=/g, 'strokeLinecap=');
bodyContent = bodyContent.replace(/stroke-linejoin=/g, 'strokeLinejoin=');
bodyContent = bodyContent.replace(/fill-rule=/g, 'fillRule=');
bodyContent = bodyContent.replace(/clip-rule=/g, 'clipRule=');

// 5. Generate React Component
const reactCode = `import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Parallax Effect
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const train1 = document.getElementById('train-1');
      const train2 = document.getElementById('train-2');
      const train3 = document.getElementById('train-3');
      const train4 = document.getElementById('train-4');
      const heroContent = document.getElementById('hero-content');
      const mist1 = document.getElementById('mist-1');
      const mist2 = document.getElementById('mist-2');

      if (train1) train1.style.transform = \`translateY(\${scrolled * 0.1}px) scale(1.05)\`;
      if (train2) train2.style.transform = \`translateY(\${scrolled * 0.2}px) scale(1.1)\`;
      if (train3) train3.style.transform = \`translateY(\${scrolled * 0.3}px) scale(1.15)\`;
      if (train4) train4.style.transform = \`translateY(\${scrolled * 0.4}px) scale(1.2)\`;
      if (mist1) mist1.style.transform = \`translateX(\${scrolled * -0.5}px) translateY(\${scrolled * 0.1}px)\`;
      if (mist2) mist2.style.transform = \`translateX(\${scrolled * 0.5}px) translateY(\${scrolled * 0.2}px)\`;

      if (heroContent) {
        heroContent.style.transform = \`translateY(\${scrolled * -0.5}px)\`;
        heroContent.style.opacity = 1 - (scrolled * 0.002);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-[#0A0A0A] text-white min-h-screen font-sans">
      <style>{eval(\`\\\`\${styleContent}\\\`\`)}</style>
      ${bodyContent}
    </div>
  );
};

export default LandingPage;
`;

// Save the component
const componentPath = path.join(__dirname, 'src/pages/LandingPage.jsx');
fs.writeFileSync(componentPath, reactCode, 'utf8');

console.log('Successfully generated LandingPage.jsx');
