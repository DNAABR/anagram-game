/* global process */
import https from 'https';
import fs from 'fs';
import path from 'path';

const url = 'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt';
const outputPath = path.join(process.cwd(), 'public', 'words.txt');

// Make sure public directory exists
if (!fs.existsSync(path.join(process.cwd(), 'public'))) {
  fs.mkdirSync(path.join(process.cwd(), 'public'));
}

console.log('Downloading word list...');
https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Processing word list...');
    const words = data.split(/\r?\n/);
    const filteredWords = words
      .map(w => w.trim().toUpperCase())
      .filter(w => w.length >= 2 && w.length <= 9 && /^[A-Z]+$/.test(w));
    
    // Sort words to make it look clean
    filteredWords.sort();

    console.log(`Writing ${filteredWords.length} words to ${outputPath}...`);
    fs.writeFileSync(outputPath, filteredWords.join('\n'));
    console.log('Done!');
  });
}).on('error', (err) => {
  console.error('Error downloading words:', err);
});
