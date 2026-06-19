import https from 'https';
import fs from 'fs';

const titles = [
  'Национальная библиотека Беларуси',
  'Мирский замок',
  'Несвижский дворец',
  'Брестская крепость',
  'Беловежская пуща',
  'Коложская церковь',
  'Ружанский дворец',
  'Браславские озёра',
  'Красный костёл',
  'Троицкое предместье',
  'Верхний город Минск',
  'Остров Мужества и Скорби',
  'Музей истории Великой Отечественной войны',
  'Курган Славы',
  'Линия Сталина',
  'Софийский собор Полоцк',
  'Спасо-Евфросиниевский монастырь',
  'Каменецкая башня',
  'Лидский замок',
  'Новогрудский замок',
  'Кревский замок',
  'Гольшанский замок',
  'Коссовский дворец',
  'Усадьба Костюшко',
  'Дворец в Жиличах',
  'Дворец Булгаков в Жиличах',
  'Гомельский дворец Румянцевых и Паскевичей',
  'парк Гомельского дворца',
  'Витебская ратуша',
  'летний амфитеатр Витебск',
  'Марк Шагал: дом-музей',
  'Могилёвская ратуша',
  'Буйничское поле',
  'Бобруйская крепость',
  'Пинский коллегиум',
  'Пинская набережная',
  'Туровское городище',
  'Припятский национальный парк',
  'Нарочанский национальный парк',
  'Озеро Нарочь',
  'Августовский канал',
  'Налибокская пуща',
  'Березинский биосферный заповедник',
  'меловые карьеры Волковыск',
  'Слонимская синагога',
  'Жировичский монастырь',
  'Будславский костёл',
  'Заславль',
  'Дудутки',
  'Строчицы',
];

const titleMap = {
  'Верхний город Минск': 'Верхний город Минска',
  'Софийский собор Полоцк': 'Полоцкая София',
  'парк Гомельского дворца': 'Парк Гомельского дворца',
  'летний амфитеатр Витебск': 'Летний амфитеатр Витебска',
  'Пинский коллегиум': 'Пинский иезуитский коллегиум',
  'меловые карьеры Волковыск': 'Меловые карьеры под Волковыском',
  'Заславль': 'Заславль: исторический центр',
};

const mappingPath = './scripts/image-mapping.json';
let mapping = {};
try {
  mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
} catch {
  mapping = {};
}

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
            setTimeout(() => resolve(fetchJson(url, retries - 1)), 4000);
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
        setTimeout(() => resolve(fetchJson(url, retries - 1)), 4000);
      } else {
        reject(err);
      }
    });
  });
}

async function searchImage(title) {
  const query = encodeURIComponent(title);
  const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${query}&srnamespace=6&srlimit=3&format=json&origin=*`;
  try {
    const data = await fetchJson(url);
    const results = data.query?.search || [];
    if (results.length === 0) return null;
    const first = results[0].title.replace(/^File:/, '');
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(first)}`;
  } catch (err) {
    console.error(`Error for "${title}":`, err.message);
    return null;
  }
}

for (const queryTitle of titles) {
  const saveTitle = titleMap[queryTitle] || queryTitle;
  if (mapping[saveTitle]) {
    console.log(`${saveTitle} => ${mapping[saveTitle]} (cached)`);
    continue;
  }
  const url = await searchImage(queryTitle);
  mapping[saveTitle] = url;
  console.log(`${saveTitle} => ${url || 'NOT FOUND'}`);
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
  await new Promise((r) => setTimeout(r, 2500));
}

console.log('\n=== JSON MAPPING ===');
console.log(JSON.stringify(mapping, null, 2));
