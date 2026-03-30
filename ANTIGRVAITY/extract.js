const fs = require('fs');
const path = require('path');

const filePath = '/Users/lucasmoitinho/Downloads/ANTIGRVAITY/esquina-digital 2.html';
const assetsDir = path.join('/Users/lucasmoitinho/Downloads/ANTIGRVAITY/', 'assets');

if (!fs.existsSync(assetsDir)){
    fs.mkdirSync(assetsDir);
}

const html = fs.readFileSync(filePath, 'utf8');

// The first base64 image is the logo, the second is the leader photo.
// Regex will match data:image/png;base64,...
const regex = /data:image\/png;base64,([^"]+)/g;
let match;
let count = 0;

while ((match = regex.exec(html)) !== null) {
    const base64Data = match[1];
    const buffer = Buffer.from(base64Data, 'base64');
    let filename = '';
    
    if (count === 0) {
        filename = 'logo.png';
    } else if (count === 1) {
        filename = 'leader-photo.png';
    }
    
    if (filename) {
        const outPath = path.join(assetsDir, filename);
        fs.writeFileSync(outPath, buffer);
        console.log(`Saved ${filename}`);
    }
    
    count++;
}
