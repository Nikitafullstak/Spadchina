import https from 'https';
import fs from 'fs';

const mappingPath = './scripts/image-mapping.json';
const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

const fixes = {
  'Верхний город Минска': 'Upper Town Minsk',
  'Пинский иезуитский коллегиум': 'Pinsk Jesuit College',
  'Меловые карьеры под Волковыском': 'Volkovysk chalk quarries',
};

function fetchJson(url, retries = 5) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'SpadchynaApp/1.0 (educational project; contact: none)',
        'Accept': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          if (retries > 0 && res.statusCode === 429) {
            setTimeout(() => resolve(fetchJson(url, retries - 1)), 5000);
            return;
          }
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', (err) => {
      if (retries > 0) {
        setTimeout(() => resolve(fetchJson(url, retries - 1)), 5000);
      } else {
        reject(err);
      }
    });
  });
}

async function searchImage(query) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&srlimit=5&format=json&origin=*`;
  try {
    const data = await fetchJson(url);
    const results = data.query?.search || [];
    if (results.length === 0) return null;
    // Skip PDF files
    const imageResult = results.find((r) => !r.title.toLowerCase().endsWith('.pdf'));
    if (!imageResult) return null;
    const first = imageResult.title.replace(/^File:/, '');
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(first)}`;
  } catch (err) {
    console.error(`Error for "${query}":`, err.message);
    return null;
  }
}

for (const [title, query] of Object.entries(fixes)) {
  const url = await searchImage(query);
  if (url) {
    mapping[title] = url;
    console.log(`${title} => ${url}`);
  } else {
    console.log(`${title} => NOT FOUND`);
  }
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
  await new Promise((r) => setTimeout(r, 3000));
}
