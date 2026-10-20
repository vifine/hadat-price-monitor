/*
 * Карточка товара Wildberries — уточнение объёма, продавца, цены с WB Кошельком и наличия.
 * Открыть: https://www.wildberries.ru/catalog/<nmId>/detail.aspx
 * Ожидание: 3 с (страница иногда перезагружается сама в первые 1–2 с — если javascript_exec
 * падает с «Inspected target navigated», просто повторить). Сниппет сам ждёт до 10 с отрисовки.
 *
 * Возвращает одну короткую строку (влезает в ответ javascript_exec):
 *   nmId|объём|продавец|полное наименование (60 симв.)|кошелёк/цена/зачёркнутая  — или OOS
 *
 * Как читать цены: на карточке подряд идут «4 085 ₽ / 4 212 ₽ / 8 000 ₽» =
 *   цена с WB Кошельком (checkout_price) / обычная цена (price, совпадает с выдачей и с <title>) / зачёркнутая.
 * Если товара нет в наличии, в <title> нет «купить за N ₽» → OOS.
 *
 * В пакете browser_batch можно открыть ~10 карточек за один вызов (navigate → wait 3 → этот сниппет).
 * Нужна только при первичном сопоставлении (links.json) и для проверки спорных карточек,
 * в ежедневном прогоне не используется.
 */
for (let i = 0; i < 20; i++) {
  if (/купить/.test(document.title) && /Артикул/.test(document.body.innerText)) break;
  await new Promise((r) => setTimeout(r, 500));
}
const t = document.body.innerText;
const g = (k) => (t.match(RegExp(k + '\n([^\n]+)')) || [])[1] || '';
const o = t.indexOf('оцен');
const p = [...t.slice(o).matchAll(/(\d[\d   ]*) ?₽/g)].slice(0, 3).map((m) => m[1].replace(/\D/g, ''));
const tp = (document.title.match(/купить за ([\d   ]+)/) || [])[1];
[
  location.pathname.match(/\d+/)[0],
  g('Объем товара') || (t.match(/\n(\d+ (?:мл|г))\n/) || [])[1],
  ((document.querySelector('a[href*="/seller/"]') || {}).textContent || '').replace(/\d,\d$/, ''),
  (g('Полное наименование товара') || document.title).slice(0, 60),
  tp ? p.join('/') : 'OOS',
].join('|');
