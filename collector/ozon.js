/*
 * Сборщик цен: Ozon (source_id = "ozon")
 * Открыть: https://www.ozon.ru/brand/hadat-cosmetics-87310671/
 * Ожидание после загрузки: 5 с. Затем выполнить сниппет (javascript_exec), затем get_page_text.
 * Сниппет прокручивает страницу, пока число плиток не перестанет расти. Ниже товаров бренда Ozon
 * подгружает «рекомендации» (вода, наушники и т.п.) — они отсекаются фильтром по слову Hadat.
 * На 20.10.2026 товаров бренда — 32 плитки (а не 62: остальное — рекомендации).
 *
 * Результат: window.__offers + страница заменяется на <pre> со строками через «|»
 * (id|price|base_price|checkout_price|in_stock|seller|title).
 *
 * Как читаются цены в плитке (.tile-root) — ВАЖНО:
 *  - зелёная цена (rgb(0,196,81); в data-state priceStyle = CARD_PRICE) — цена «с банками / Ozon Картой»
 *    → checkout_price; обычная цена (без карты) в плитке НЕ показывается → price = null;
 *  - чёрная цена → price, НО проверка карточек показала, что и чёрная цена у кросс-бордер продавцов
 *    бывает ценой «с банками» (3949025176: в плитке 8 973, на карточке 8 973 с банками / 9 564 без).
 *    Поэтому для точной обычной цены нужен проход по карточкам (ozon_card.js, ~4 вызова на 32 товара);
 *  - зачёркнутая → base_price.
 *  - Продавец в плитке не показывается → seller = '' (есть на карточке).
 * Объём почти всегда есть в названии («…, 50 мл»), но у перепродавцов названия обезличены
 * («Масло для волос, 60 мл») — сопоставление по links.json.
 */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const num = (s) => Number(String(s).replace(/[^\d]/g, '')) || null;
  const idOf = (href) => (href.split('?')[0].match(/(\d+)\/?$/) || [])[1];
  let prev = -1, stable = 0;
  for (let i = 0; i < 30 && stable < 3; i++) {
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(1200);
    const n = document.querySelectorAll('.tile-root').length;
    stable = n === prev ? stable + 1 : 0;
    prev = n;
  }
  const seen = new Set();
  const offers = [];
  for (const tile of document.querySelectorAll('.tile-root')) {
    if (!/hadat/i.test(tile.innerText)) continue; // отсекаем рекомендации
    const a = tile.querySelector('a[href*="/product/"]');
    if (!a) continue;
    const id = idOf(a.href);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    let price = null, base = null, card = null;
    for (const s of tile.querySelectorAll('span')) {
      if (s.children.length || !/\d/.test(s.textContent) || !/₽/.test(s.textContent)) continue;
      const st = getComputedStyle(s);
      const v = num(s.textContent);
      if (st.textDecorationLine.includes('line-through')) { if (base == null) base = v; }
      else if (/rgb\(0, 196, 81\)/.test(st.color)) { if (card == null) card = v; }
      else if (price == null) price = v;
    }
    const lines = tile.innerText.split('\n').map((x) => x.trim()).filter(Boolean);
    const title = lines.filter((l) => !/₽|%|отзыв|^[\d.,]+$/.test(l) && l !== 'HADAT COSMETICS')
      .sort((x, y) => y.length - x.length)[0] || '';
    const soldOut = /Нет в наличии|Закончился/i.test(tile.innerText);
    offers.push({
      external_id: id,
      url: `https://www.ozon.ru/product/${id}/`,
      title,
      price,
      base_price: base,
      checkout_price: card,
      in_stock: (price || card) ? !soldOut : false,
      seller: '',
    });
  }
  window.__offers = offers;
  const rows = offers.map((o) => [o.external_id, o.price, o.base_price, o.checkout_price, o.in_stock, o.seller, o.title].join('|')).join('\n');
  document.body.innerHTML = '<pre id="out"></pre>';
  document.getElementById('out').textContent = 'OFFERS ' + offers.length + '\n' + rows;
  return 'ozon: ' + offers.length + ' карточек';
})();
