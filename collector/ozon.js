/*
 * Сборщик цен: Ozon (source_id = "ozon")
 * Открыть: https://www.ozon.ru/brand/hadat-cosmetics-87310671/
 * Ожидание после загрузки: 5 с. Затем выполнить сниппет (javascript_exec), затем get_page_text.
 * Сниппет сам прокручивает страницу, пока число карточек не перестанет расти (~62 карточки).
 *
 * Результат: window.__offers + страница заменяется на <pre> с TSV
 * (id, price, base_price, checkout_price, in_stock, seller, title).
 *
 * Как читаются цены в плитке (.tile-root):
 *  - зелёная цена (rgb(0,196,81), в data-state priceStyle = CARD_PRICE) — цена с Ozon Картой → checkout_price;
 *    обычная цена (без карты) в такой плитке НЕ показывается → price = null (её видно только на карточке товара);
 *  - чёрная цена — обычная цена → price;
 *  - зачёркнутая — base_price.
 *  - Продавец в плитке не показывается → seller = ''.
 * Объём почти всегда есть в названии («…, 50 мл») — сопоставление по названию.
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
    const text = tile.innerText;
    const soldOut = /Нет в наличии|Закончился|Товар закончился/i.test(text);
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
  const tsv = offers.map((o) => [o.external_id, o.price, o.base_price, o.checkout_price, o.in_stock, o.seller, o.title].join('\t')).join('\n');
  document.body.innerHTML = '<pre id="out"></pre>';
  document.getElementById('out').textContent = 'OFFERS ' + offers.length + '\n' + tsv;
  return 'ozon: ' + offers.length + ' карточек';
})();
