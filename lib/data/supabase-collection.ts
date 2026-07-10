import { getSupabase } from "@/lib/supabase/client";

/**
 * INFRASTRUCTURE -- generic Supabase CRUD layer.
 *
 * Every feature so far (Personas, Skills, Knowledge, Capsules,
 * Conversations) hand-rolled its own storage.ts with near-identical
 * fetch/insert/update/delete functions differing only in table name and
 * row<->domain-object mapping. This factory extracts that boilerplate once,
 * so a new feature's storage.ts shrinks to just its `fromRow`/`toRow`
 * mapping, and fixes/improvements here (error messages, pagination,
 * batching) apply to every feature at once instead of needing to be copied
 * around by hand.
 */

export interface SupabaseCollection<T> {
  fetchAll(): Promise<T[]>;
  fetchOne(id: string): Promise<T | null>;
  /** Paginated fetch -- use for tables that can grow into the thousands. */
  fetchPage(offset: number, limit: number): Promise<{ items: T[]; total: number }>;
  insert(item: T): Promise<void>;
  insertMany(items: T[]): Promise<void>;
  update(item: T): Promise<void>;
  remove(id: string): Promise<void>;
  /** Deletes every row where `column` equals `value` -- used for cascade
   * deletes (e.g. clearing knowledge items for a deleted conversation). */
  removeWhere(column: string, value: string): Promise<void>;
  /** Full table wipe -- used by "Reset all data" actions. */
  removeAll(): Promise<void>;
}

export interface CollectionConfig<T, Row extends object> {
  /** Table name in Supabase. */
  table: string;
  /** Column used as the primary key. Defaults to "id". */
  idColumn?: string;
  /** Maps a raw Supabase row to the domain type. */
  fromRow: (row: Row) => T;
  /** Maps a domain object to a raw row for insert/update. */
  toRow: (item: T) => Row;
  /** Reads the id off a domain object -- must match what's in `idColumn`. */
  getId: (item: T) => string;
  /** Default ordering applied by fetchAll()/fetchPage(). */
  orderBy?: { column: string; ascending?: boolean };
}

export function createSupabaseCollection<T, Row extends object>(
  config: CollectionConfig<T, Row>
): SupabaseCollection<T> {
  const idColumn = config.idColumn ?? "id";

  function fail(action: string, message: string): never {
    throw new Error(`Failed to ${action} ${config.table}: ${message}`);
  }

  return {
    async fetchAll() {
      const supabase = getSupabase();
      let query = supabase.from(config.table).select("*");
      if (config.orderBy) {
        query = query.order(config.orderBy.column, { ascending: config.orderBy.ascending ?? true });
      }
      const { data, error } = await query;
      if (error) fail("load", error.message);
      return ((data ?? []) as Row[]).map(config.fromRow);
    },

    async fetchOne(id) {
      const supabase = getSupabase();
      const { data, error } = await supabase.from(config.table).select("*").eq(idColumn, id).maybeSingle();
      if (error) fail("load a single row from", error.message);
      return data ? config.fromRow(data as Row) : null;
    },

    async fetchPage(offset, limit) {
      const supabase = getSupabase();
      let query = supabase.from(config.table).select("*", { count: "exact" });
      if (config.orderBy) {
        query = query.order(config.orderBy.column, { ascending: config.orderBy.ascending ?? true });
      }
      const { data, error, count } = await query.range(offset, offset + limit - 1);
      if (error) fail("load a page of", error.message);
      return { items: ((data ?? []) as Row[]).map(config.fromRow), total: count ?? 0 };
    },

    async insert(item) {
      const supabase = getSupabase();
      // getSupabase() has no Database schema generic, so passing a generic
      // Row type parameter into .insert()/.update() trips up Supabase's
      // excess-property overload matching (it works fine with concrete
      // object literals, which is how every hand-written storage.ts used
      // it before this factory existed). `as never` here is a narrow,
      // deliberate escape hatch scoped to this one call -- everything above
      // it is still fully typed via CollectionConfig<T, Row>.
      const { error } = await supabase.from(config.table).insert(config.toRow(item) as never);
      if (error) fail("save", error.message);
    },

    async insertMany(items) {
      if (items.length === 0) return;
      const supabase = getSupabase();
      const { error } = await supabase.from(config.table).insert(items.map(config.toRow) as never[]);
      if (error) fail("save", error.message);
    },

    async update(item) {
      const supabase = getSupabase();
      const { error } = await supabase
        .from(config.table)
        .update(config.toRow(item) as never)
        .eq(idColumn, config.getId(item));
      if (error) fail("update", error.message);
    },

    async remove(id) {
      const supabase = getSupabase();
      const { error } = await supabase.from(config.table).delete().eq(idColumn, id);
      if (error) fail("delete", error.message);
    },

    async removeWhere(column, value) {
      const supabase = getSupabase();
      const { error } = await supabase.from(config.table).delete().eq(column, value);
      if (error) fail("delete matching rows from", error.message);
    },

    async removeAll() {
      const supabase = getSupabase();
      const { error } = await supabase.from(config.table).delete().not(idColumn, "is", null);
      if (error) fail("reset", error.message);
    },
  };
}
