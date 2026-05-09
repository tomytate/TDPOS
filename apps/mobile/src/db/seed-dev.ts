import type { SQLiteDatabase } from 'expo-sqlite'

/**
 * Dev-only sample data so the Sale screen has products on a fresh install.
 * Idempotent: only inserts if `products` is empty. Gate calls on `__DEV__`
 * — never run in production builds.
 */
export async function seedDevDatabase(db: SQLiteDatabase) {
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM products',
    [],
  )
  if (existing && existing.count > 0) return

  await db.execAsync(`
    INSERT OR IGNORE INTO categories (id, business_id, name, color) VALUES
      ('cat-shampoo', 'demo-business', 'Shampoo', '#4A90D9'),
      ('cat-yosi', 'demo-business', 'Yosi', '#E74C3C'),
      ('cat-kape', 'demo-business', 'Kape', '#8B4513'),
      ('cat-noodles', 'demo-business', 'Noodles', '#F39C12'),
      ('cat-kendi', 'demo-business', 'Kendi', '#27AE60'),
      ('cat-drink', 'demo-business', 'Softdrinks', '#3498DB');

    INSERT OR IGNORE INTO products
      (id, business_id, name, category_id, price_per_piece, price_per_pack, cost_per_piece,
       stock_pieces, pieces_per_pack, reorder_point_pieces, unit_label, is_tingi, is_active)
    VALUES
      ('prod-shampoo', 'demo-business', 'Palmolive Sachet', 'cat-shampoo',
        7, 75, 5.5, 120, 12, 24, 'sachet', 1, 1),
      ('prod-yosi', 'demo-business', 'Marlboro Red (per stick)', 'cat-yosi',
        8, 145, 6.5, 200, 20, 40, 'stick', 1, 1),
      ('prod-kape', 'demo-business', 'Nescafe 3-in-1', 'cat-kape',
        8, 70, 6, 50, 10, 20, 'sachet', 1, 1),
      ('prod-noodles', 'demo-business', 'Lucky Me Pancit Canton', 'cat-noodles',
        12, NULL, 9, 48, 1, 12, 'pack', 0, 1),
      ('prod-mentos', 'demo-business', 'Mentos', 'cat-kendi',
        2, NULL, 1.2, 50, 1, 10, 'piece', 0, 1),
      ('prod-coke', 'demo-business', 'Coca-Cola 250ml', 'cat-drink',
        15, 330, 11, 48, 24, 24, 'bottle', 1, 1);
  `)
}
