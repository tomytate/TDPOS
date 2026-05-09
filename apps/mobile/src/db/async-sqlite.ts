/**
 * Minimal async SQLite shape that both expo-sqlite's `SQLiteDatabase` and a
 * test-only bun:sqlite adapter satisfy structurally. Keeps `executeCheckout`
 * decoupled from the runtime so the §14 tests can run under bun:test.
 */
export type AsyncSqliteBindValue = string | number | null
export type AsyncSqliteBindParams = AsyncSqliteBindValue[]

export interface AsyncSqliteLike {
  runAsync(sql: string, params: AsyncSqliteBindParams): Promise<unknown>
  getFirstAsync<T = unknown>(sql: string, params: AsyncSqliteBindParams): Promise<T | null>
  getAllAsync<T = unknown>(sql: string, params: AsyncSqliteBindParams): Promise<T[]>
  withTransactionAsync(fn: () => Promise<void>): Promise<void>
}
