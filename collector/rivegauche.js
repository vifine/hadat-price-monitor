/*
 * Сборщик цен: Рив Гош (source_id = "rivegauche", пока только в файлах)
 * Открыть: https://rivegauche.ru/search?text=hadat → ждать 5 с → выполнить сниппет → get_page_text.
 * 20.10.2026 после прокрутки на первой странице оказались все 50 товаров; вторая страница
 * (&offset=36) новых не добавила. Если товаров станет больше — в том же browser_batch открыть
 * https://rivegauche.ru/search?text=hadat&offset=36, снова выполнить сниппет и только потом get_page_text:
 * сниппет копит офферы в sessionStorage (ключ hadat_rg) и выводит общий итог.
 * Перед первой страницей sessionStorage очищается, если в URL нет offset.
 *
 * Результат: window.__offers + <pre> со строками через «|»
 * (id|price|base_price|checkout_price|in_stock|seller|title).
 *
 * Заметки:
 *  - id = slug из /product/<slug>; объём обычно в конце slug (…-shampoo-50, …-scrub-150).
 *  - Цена: элемент .price (без зачёркивания) → price; зачёркнутая → base_price.
 *  - «Только в магазинах» — онлайн купить нельзя, цена показана → in_stock = null.
 *  - Продавец — сам Рив Гош → seller = 'Рив Гош'.
 */
(async () => {
  const num = (s) => Number(String(s).replace(/[^\d]/g, '')) || null;
  const KEY = 'hadat_rg';
  if (!/offset=/.test(location.search)) { try { sessionStorage.removeItem(KEY); } catch (e) {} }
  for (let i = 0; i < 6; i++) { window.scrollTo(0, document.body.scrollHeight); await new Promise((r) => setTimeout(r, 700)); }
  let acc = [];
  try { acc = JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch (e) {}
  const seen = new Set(acc.map((o) => o.external_id));
  for (const item of document.querySelectorAll('product-item, .product-item')) {
    const a = item.querySelector('a[href*="/product/"]');
    if (!a) continue;
    const slug = (a.getAttribute('href').split('?')[0].match(/\/product\/([^/]+)/) || [])[1];
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const priceEls = [...item.querySelectorAll('[class*="price"]')].filter((e) => !e.children.length && /\d/.test(e.textContent) && /₽/.test(e.textContent));
    const isOld = (e) => getComputedStyle(e).textDecorationLine.includes('line-through') || /old/.test(e.className);
    const live = priceEls.filter((e) => !isOld(e)).map((e) => num(e.textContent));
    const struck = priceEls.filter(isOld).map((e) => num(e.textContent));
    const lines = item.innerText.split('\n').map((x) => x.trim()).filter(Boolean);
    const bi = lines.findIndex((l) => /^HADAT COSMETICS$/i.test(l));
    const title = bi >= 0 ? lines[bi + 1] || '' : lines.find((l) => /hadat/i.test(l)) || '';
    const offline = /Только в магазинах/i.test(item.innerText);
    acc.push({
      external_id: slug,
      url: 'https://rivegauche.ru/product/' + slug,
      title,
      price: live[0] ?? null,
      base_price: struck[0] ?? null,
      checkout_price: null,
      in_stock: offline ? null : (live.length ? true : false),
      seller: 'Рив Гош',
    });
  }
  try { sessionStorage.setItem(KEY, JSON.stringify(acc)); } catch (e) {}
  window.__offers = acc;
  const rows = acc.map((o) => [o.external_id, o.price, o.base_price, o.checkout_price, o.in_stock, '', o.title].join('|')).join('\n');
  document.body.innerHTML = '<pre id="out"></pre>';
  document.getElementById('out').textContent = 'OFFERS ' + acc.length + '\n' + rows;
  return 'rivegauche: ' + acc.length + ' карточек (накоплено)';
})();
