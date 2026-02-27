import type { EntityTable } from "dexie"

interface HasTimestamps {
  createdAt: Date
  updatedAt: Date
}

export interface CrudService<T, FormData> {
  getAll(): Promise<T[]>
  getById(id: number): Promise<T | undefined>
  create(data: FormData): Promise<number>
  update(id: number, data: FormData): Promise<void>
  remove(id: number): Promise<void>
  count(): Promise<number>
}

interface CrudServiceOptions<T, FormData> {
  table: EntityTable<T, "id">
  orderBy: string
  transformData?: (data: FormData) => Partial<T>
}

export function createCrudService<
  T extends HasTimestamps & { id?: number },
  FormData,
>(options: CrudServiceOptions<T, FormData>): CrudService<T, FormData> {
  const { table, orderBy, transformData } = options

  return {
    async getAll() {
      return table.orderBy(orderBy).toArray()
    },

    async getById(id: number) {
      return table.get(id)
    },

    async create(data: FormData) {
      const now = new Date()
      const record = transformData ? transformData(data) : data
      const id = await table.add({
        ...record,
        createdAt: now,
        updatedAt: now,
      } as T)
      return id as number
    },

    async update(id: number, data: FormData) {
      const record = transformData ? transformData(data) : data
      await table.update(id, {
        ...record,
        updatedAt: new Date(),
      })
    },

    async remove(id: number) {
      await table.delete(id)
    },

    async count() {
      return table.count()
    },
  }
}
