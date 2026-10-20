/*
 * Сборщик цен: Wildberries (source_id = "wb")
 * Открыть: https://www.wildberries.ru/catalog/0/search.aspx?search=hadat%20cosmetics
 * Ожидание после загрузки: 5 с. Затем выполнить этот сниппет (javascript_exec), затем get_page_text.
 * Сниппет сам прокручивает выдачу, пока число карточек не перестанет расти (~80 карточек).
 *
 * Результат: window.__offers (массив офферов) + страница заменяется на <pre> со строками через «|»
 * (id|price|base_price|checkout_price|in_stock|seller|title) — их читает get_page_text.
 * (Ответ javascript_exec обрезается на ~1500 символах, поэтому данные выводятся через страницу.)
 *
 * Заметки:
 *  - Внутренние JSON-эндпоинты WB отвечают 403 — НЕ используем, читаем только отрендеренную страницу.
 *  - В выдаче первая цена ₽ — цена без WB Кошелька, вторая — зачёркнутая.
 *    Цена с WB Кошельком в выдаче не показывается → checkout_price = null
 *    (она есть на карточке товара — см. wb_card.js).
 *  - Продавец в выдаче не виден → seller = ''. Продавца/объём смотреть на карточке (wb_card.js).
 *  - Наличие в выдаче не видно: у карточек «Нет в наличии» WB всё равно показывает цену.
 *    in_stock = null; точное наличие — только с карточки.
 *  - В выдачу попадают чужие бренды (Medavita и др.) — отсекаются на этапе сопоставления (links.json).
 */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const num = (s) => Number(String(s).replace(/[^\d]/g, '')) || null;
  let prev = -1, stable = 0;
  for (let i = 0; i < 30 && stable < 3; i++) {
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(1200);
    const n = document.querySelectorAll('article[data-nm-id]').length;
    stable = n === prev ? stable + 1 : 0;
    prev = n;
  }
  const MONTHS = 'января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря';
  const seen = new Set();
  const offers = [];
  for (const card of document.querySelectorAll('article[data-nm-id]')) {
    const id = card.dataset.nmId;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const text = card.textContent.replace(/[\s   ]+/g, ' ').trim();
    // цены: числа перед «₽» (первая — текущая, вторая — зачёркнутая)
    const prices = [...text.matchAll(/(\d{1,3}(?: \d{3})*) ₽/g)].map((m) => num(m[1]));
    // название: после последнего «₽»; срезаем рейтинг и дату доставки
    const title = text.slice(text.lastIndexOf('₽') + 1)
      .replace(/\s*\d(,\d)?\s?·.*$/, '')
      .replace(new RegExp('\\s*(\\d{1,2} (' + MONTHS + ')|Завтра|Послезавтра|Сегодня|Нет оценок).*$'), '')
      .trim();
    offers.push({
      external_id: id,
      url: `https://www.wildberries.ru/catalog/${id}/detail.aspx`,
      title,
      price: prices[0] ?? null,
      base_price: prices[1] ?? null,
      checkout_price: null,
      in_stock: null,
      seller: '',
    });
  }
  window.__offers = offers;
  const rows = offers.map((o) => [o.external_id, o.price, o.base_price, o.checkout_price, o.in_stock, o.seller, o.title].join('|')).join('\n');
  document.body.innerHTML = '<pre id="out"></pre>';
  document.getElementById('out').textContent = 'OFFERS ' + offers.length + '\n' + rows;
  return 'wb: ' + offers.length + ' карточек';
})();
