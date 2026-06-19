import fs from 'fs';

const mappingPath = './scripts/image-mapping.json';
const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

mapping['Верхний город Минска'] = 'https://commons.wikimedia.org/wiki/Special:FilePath/Belarus-Minsk-Upper%20Town-2.jpg';
mapping['Пинский иезуитский коллегиум'] = 'https://commons.wikimedia.org/wiki/Special:FilePath/Pinsk%20Jesuit%20collegium.jpg';
mapping['Меловые карьеры под Волковыском'] = 'https://commons.wikimedia.org/wiki/Special:FilePath/%D0%9C%D0%B5%D0%BB%D0%B0%D0%B2%D1%8B%D1%8F%20%D0%BA%D0%B0%D1%80%27%D0%B5%D1%80%D1%8B%20%D0%BF%D0%B0%D0%B4%20%D0%9A%D1%80%D0%B0%D1%81%D0%BD%D0%B0%D1%81%D0%B5%D0%BB%D1%8C%D1%81%D0%BA%D1%96%D0%BC%2004.jpg';

fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
console.log('Fixes applied');
