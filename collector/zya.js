/*
 * Сборщик цен: Золотое Яблоко (source_id = "zya") — ЧЕРНОВИК, НЕ ПРОВЕРЕН НА ЖИВОЙ СТРАНИЦЕ.
 * Открыть: https://goldapple.ru/brands/hadat-cosmetics
 * Ожидание: ~10 с (при первом заходе сайт показывает экран «проверка устройства», затем пропускает).
 *
 * СТАТУС 20.10.2026: при пилотном прогоне goldapple.ru отдавал «упс… страница не найдена»
 * на страницу бренда, на поиск (/catalogsearch/result?q=hadat) и на карточку товара
 * (/19000029042-hydro-nutrient-nourishing-conditioner) — похоже на антибот-заглушку.
 * Обходить её не пытались (правило: при блокировке источник останавливаем).
 * Если в обычном браузере пользователя страница открывается — выполнить этот сниппет и сверить вывод.
 *
 * Структура по данным предыдущей проверки: 24 товара в <article>; текст брать через textContent
 * (innerText пустой); в выдаче цена «от N ₽» — это цена МИНИМАЛЬНОГО объёма.
 * Решение: цены «от» для мониторинга РРЦ недостаточно — у большинства товаров 2–3 объёма
 * (50 / 250 / 800 мл), и «от» всегда показывает самый дешёвый. Нужен проход по карточкам
 * (по 1 навигации на товар, ~3 вызова browser_batch по 8–10 карточек на 24 товара).
 * Сниппет для карточки пока не написан — сначала нужно, чтобы сайт открывался.
 *
 * Результат: window.__offers + <pre> со строками через «|» (id|price_from|base_price||in_stock||title).
 */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const num = (s) => Number(String(s).replace(/[^\d]/g, '')) || null;
  for (let i = 0; i < 20; i++) { if (document.querySelectorAll('article').length > 3) break; await sleep(1000); }
  for (let i = 0; i < 8; i++) { window.scrollTo(0, document.body.scrollHeight); await sleep(900); }
  const seen = new Set();
  const offers = [];
  for (const art of document.querySelectorAll('article')) {
    const a = [...art.querySelectorAll('a[href]')].find((x) => /\/\d{8,}-/.test(x.getAttribute('href')));
    if (!a) continue;
    const href = a.getAttribute('href').split('?')[0];
    const id = (href.match(/\/(\d{8,})-/) || [])[1];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const text = art.textContent.replace(/[\s   ]+/g, ' ').trim();
    const prices = [...text.matchAll(/(\d{1,3}(?: \d{3})*) ?₽/g)].map((m) => num(m[1]));
    offers.push({
      external_id: id,
      url: 'https://goldapple.ru' + (href.startsWith('/') ? href : '/' + href),
      title: text.replace(/(от )?\d{1,3}(?: \d{3})* ?₽.*$/, '').slice(0, 120),
      price: prices[0] ?? null, // «от N ₽» — минимальный объём
      base_price: prices[1] ?? null,
      checkout_price: null,
      in_stock: prices.length ? true : false,
      seller: 'Золотое Яблоко',
    });
  }
  window.__offers = offers;
  const rows = offers.map((o) => [o.external_id, o.price, o.base_price, o.checkout_price, o.in_stock, '', o.title].join('|')).join('\n');
  document.body.innerHTML = '<pre id="out"></pre>';
  document.getElementById('out').textContent = 'OFFERS ' + offers.length + '\n' + rows;
  return 'zya: ' + offers.length + ' карточек';
})();
