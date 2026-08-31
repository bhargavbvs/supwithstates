// A squarified treemap: values in, rectangles out.
//
// Area is the one visual encoding a reader can trust for money — twice the
// rupees is twice the ink, at any shape — and squarifying keeps each tile
// near enough to square that its label fits and its size can be judged.
// This is the Bruls–Huizing–van Wijk algorithm: lay tiles greedily along
// the container's shorter side, and start a new row the moment adding
// another tile would make the worst aspect ratio worse instead of better.
//
// Pure geometry, no DOM: the caller decides what a rectangle becomes.

/** Worst aspect ratio a row would have at this length. */
function worst(row, length) {
  const sum = row.reduce((a, v) => a + v, 0);
  const max = Math.max(...row);
  const min = Math.min(...row);
  const s2 = sum * sum;
  const l2 = length * length;
  return Math.max((l2 * max) / s2, s2 / (l2 * min));
}

/** items: [{ value, ... }] in any order. Returns [{ x, y, w, h, item }]
 *  in the same order, filling width × height. Values must be positive. */
export function treemap(items, width, height) {
  const total = items.reduce((a, it) => a + it.value, 0);
  if (!(total > 0) || !(width > 0) || !(height > 0)) return [];

  // Work in area units so value maps straight to pixels².
  const scale = (width * height) / total;
  const sorted = [...items].sort((a, b) => b.value - a.value);

  const out = [];
  let x = 0; let y = 0; let w = width; let h = height;
  let row = [];

  const layoutRow = () => {
    const sum = row.reduce((a, v) => a + v.area, 0);
    // The row was sized against the shorter side, so it is laid along that
    // side: in a wide region it is a vertical strip advancing x, in a tall
    // one a horizontal strip advancing y. Getting this backwards stacks
    // thickness along the short side and runs out of it — a tile 540px
    // deep in a 420px box.
    const along = Math.min(w, h);
    const thick = sum / along;
    let offset = 0;
    for (const tile of row) {
      const len = tile.area / thick;
      out.push(w >= h
        ? { x, y: y + offset, w: thick, h: len, item: tile.item }
        : { x: x + offset, y, w: len, h: thick, item: tile.item });
      offset += len;
    }
    if (w >= h) { x += thick; w -= thick; } else { y += thick; h -= thick; }
    row = [];
  };

  for (const item of sorted) {
    const area = item.value * scale;
    const along = Math.min(w, h);
    const areas = row.map((t) => t.area);
    if (row.length && worst([...areas, area], along) > worst(areas, along)) layoutRow();
    row.push({ area, item });
  }
  if (row.length) layoutRow();
  return out;
}

/** Integer shares that sum exactly to `to` (largest-remainder method).
 *  "₹37 + ₹6 + ₹19 + ₹11 + ₹27 of every ₹100" has to reach ₹100 — a
 *  strip that adds to ₹99 invites the reader to hunt for the missing
 *  rupee, and rounding each share alone loses one. */
export function shares(values, to = 100) {
  const total = values.reduce((a, v) => a + v, 0);
  if (!(total > 0)) return values.map(() => 0);
  const exact = values.map((v) => (v / total) * to);
  const floors = exact.map(Math.floor);
  let left = to - floors.reduce((a, v) => a + v, 0);
  const order = exact.map((v, i) => [v - floors[i], i]).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) { if (left <= 0) break; floors[i] += 1; left -= 1; }
  return floors;
}
