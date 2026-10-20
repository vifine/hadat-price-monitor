/*
 * Сборщик цен: Л'Этуаль (source_id = "letu", пока только в файлах)
 * Открыть: https://www.letu.ru/brand/hadat-cosmetics
 * Ожидание после загрузки: 5 с. Затем выполнить сниппет (javascript_exec), затем get_page_text.
 * Сниппет сам нажимает «Показать ещё» (обычная кнопка подгрузки, не отправка формы),
 * пока она есть, затем читает плитки .product-tile.
 *
 * Результат: window.__offers + <pre> со строками через «|»
 * (id|price|base_price|checkout_price|in_stock|seller|variants|title).
 *
 * Заметки:
 *  - В плитке одна цена (класс product-tile-price__text) — цена варианта по умолчанию;
 *    зачёркнутая (если есть) → base_price. «919 ₽ x 4 частями» — рассрочка, игнорируется.
 *  - Объём в плитке НЕ показывается; «Доступно N варианта» = у товара несколько объёмов,
 *    цена в плитке — для одного из них (обычно минимального). Для цен по объёмам нужна карточка товара.
 *  - Продавец — сам Л'Этуаль → seller = 'Л\'Этуаль'.
 */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const num = (s) => Number(String(s).replace(/[^\d]/g, '')) || null;
  for (let i = 0; i < 10; i++) {
    const btn = [...document.querySelectorAll('button')].find((b) => /Показать ещ/.test(b.textContent));
    if (!btn) break;
    btn.click();
    await sleep(2500);
  }
  const seen = new Set();
  const offers = [];
  for (const tile of document.querySelectorAll('.product-tile')) {
    const a = tile.querySelector('a[href*="/product/"]');
    if (!a) continue;
    const href = a.getAttribute('href').split('?')[0];
    const id = (href.match(/(\d+)\/?$/) || [])[1];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const priceEls = [...tile.querySelectorAll('[class*="product-tile-price"]')].filter((e) => !e.children.length && /\d/.test(e.textContent));
    const struck = priceEls.filter((e) => getComputedStyle(e).textDecorationLine.includes('line-through') || /old/.test(e.className)).map((e) => num(e.textContent));
    const live = priceEls.filter((e) => !(getComputedStyle(e).textDecorationLine.includes('line-through') || /old/.test(e.className))).map((e) => num(e.textContent));
    const lines = tile.innerText.split('\n').map((x) => x.trim()).filter(Boolean);
    const bi = lines.findIndex((l) => /^HADAT/i.test(l));
    const title = bi >= 0 ? lines[bi + 1] || '' : '';
    const variants = (tile.innerText.match(/Доступно (\d+) вариант/) || [])[1] || '1';
    const soldOut = /Нет в наличии|Сообщить о поступлении/i.test(tile.innerText);
    offers.push({
      external_id: id,
      url: 'https://www.letu.ru' + href,
      title,
      variants: Number(variants),
      price: live[0] ?? null,
      base_price: struck[0] ?? null,
      checkout_price: null,
      in_stock: live.length ? !soldOut : false,
      seller: "Л'Этуаль",
    });
  }
  window.__offers = offers;
  const rows = offers.map((o) => [o.external_id, o.price, o.base_price, o.checkout_price, o.in_stock, '', o.variants, o.title, o.url.replace('https://www.letu.ru/product/', '')].join('|')).join('\n');
  document.body.innerHTML = '<pre id="out"></pre>';
  document.getElementById('out').textContent = 'OFFERS ' + offers.length + '\n' + rows;
  return 'letu: ' + offers.length + ' карточек';
})();
