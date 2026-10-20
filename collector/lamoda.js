/*
 * Сборщик цен: Lamoda (source_id = "lamoda")
 * Открыть: https://www.lamoda.ru/catalogsearch/result/?q=hadat
 * Ожидание после загрузки: 4 с. Затем выполнить сниппет (javascript_exec), затем get_page_text.
 * Все ~70 карточек грузятся на одной странице после прокрутки (пагинация не нужна).
 *
 * Результат: window.__offers + страница заменяется на <pre> со строками через «|»
 * (id|price|base_price|checkout_price|in_stock|seller|volume|title).
 *
 * Цены в карточке (пример «−53% 9 014 6 044 4 230 ₽»):
 *  - 9 014 — зачёркнутая исходная цена → base_price;
 *  - 6 044 — тоже зачёркнутая «цена до акции» (класс …price-second) → price_before_promo (доп. поле);
 *  - 4 230 ₽ — итоговая цена, которую платит покупатель (акция применяется автоматически) → price.
 *  Если зачёркнутая только одна — это base_price. checkout_price = null (карточных цен на Lamoda нет).
 *  Числа разделены пробелами/тонкими пробелами — берём значения из отдельных span, а не из общего текста.
 * Объём: у карточки есть переключатель объёмов («800 | 250 | мл»); цена и ссылка относятся к
 * выделенному объёму (_currentProportion_). Продавец в выдаче не показывается → seller = ''.
 */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const num = (s) => Number(String(s).replace(/[^\d]/g, '')) || null;
  for (let i = 0; i < 12; i++) { window.scrollTo(0, document.body.scrollHeight); await sleep(800); }
  const seen = new Set();
  const offers = [];
  for (const item of document.querySelectorAll('[class*="_gridItem_"]')) {
    const a = item.querySelector('a[href*="/p/"]');
    if (!a) continue;
    const id = (a.href.match(/\/p\/([^/]+)/) || [])[1];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const leaves = [...item.querySelectorAll('span,div')].filter((s) => !s.children.length && /\d/.test(s.textContent));
    const priceEls = leaves.filter((s) => /price/.test(s.className));
    const struck = priceEls.filter((s) => getComputedStyle(s).textDecorationLine.includes('line-through')).map((s) => num(s.textContent));
    const live = priceEls.filter((s) => !getComputedStyle(s).textDecorationLine.includes('line-through') && /₽/.test(s.textContent)).map((s) => num(s.textContent));
    const cur = item.querySelector('[class*="_currentProportion_"]');
    const lines = item.innerText.split('\n').map((x) => x.trim()).filter(Boolean);
    const unit = lines.find((l) => /^(мл|г|шт)$/.test(l)) || '';
    const volume = cur ? cur.textContent.trim() + ' ' + unit : '';
    const bi = lines.findIndex((l) => /hadat/i.test(l));
    const title = bi >= 0 ? lines.slice(bi, bi + 2).join(' / ') : lines.find((l) => l.length > 15) || '';
    const soldOut = /Нет в наличии|Распродано/i.test(item.innerText);
    offers.push({
      external_id: id,
      url: `https://www.lamoda.ru/p/${id.toLowerCase()}/`,
      title,
      volume,
      price: live[0] ?? null,
      base_price: struck[0] ?? null,
      price_before_promo: struck.length > 1 ? struck[1] : null,
      checkout_price: null,
      in_stock: live.length ? !soldOut : false,
      seller: '',
    });
  }
  window.__offers = offers;
  const rows = offers.map((o) => [o.external_id, o.price, o.base_price, o.checkout_price, o.in_stock, o.seller, o.volume, o.price_before_promo, o.title].join('|')).join('\n');
  document.body.innerHTML = '<pre id="out"></pre>';
  document.getElementById('out').textContent = 'OFFERS ' + offers.length + '\n' + rows;
  return 'lamoda: ' + offers.length + ' карточек';
})();
