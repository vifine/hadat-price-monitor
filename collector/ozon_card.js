/*
 * Карточка товара Ozon — обычная цена, цена с Ozon Картой/банками, зачёркнутая, продавец.
 * Открыть: https://www.ozon.ru/product/<id>/
 * Ожидание: 3 с; сниппет сам ждёт до 10 с, пока виджет цены (data-widget="webPrice") получит «₽».
 * Цену берём из textContent виджета: innerText его не видит (элемент скрыт от innerText при загрузке).
 *
 * Возвращает одну короткую строку:  id | название | продавец | текст виджета цены
 * Разбор текста виджета:
 *   «1 028 ₽ С банками 1 142 ₽ С другими банками»          → checkout_price=1028, price=1142
 *   «3 126 ₽ С банками 3 291 ₽ 6 596 ₽ С другими банками»  → checkout=3126, price=3291, base_price=6596
 *   «2 685 ₽ 2 685 ₽ за 1 шт»                              → price=2685 (без карточной цены)
 * В пакете browser_batch открываем ~10 карточек за вызов (navigate → wait 3 → сниппет).
 */
for (let i = 0; i < 20; i++) {
  const w = document.querySelector('[data-widget="webPrice"]');
  if (w && /₽/.test(w.textContent)) break;
  await new Promise((r) => setTimeout(r, 500));
}
const w = document.querySelector('[data-widget="webPrice"]');
[
  location.pathname.match(/(\d+)\/?$/)[1],
  ((document.querySelector('h1') || {}).textContent || '').trim().slice(0, 90),
  [...document.querySelectorAll('a[href*="/seller/"]')].map((a) => a.textContent.trim()).filter(Boolean)[0],
  w ? w.textContent.replace(/\s+/g, ' ').trim().slice(0, 90) : 'NOPRICE',
].join(' | ');
