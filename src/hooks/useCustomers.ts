import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuid } from "uuid";
import { db } from "@/lib/db";
import type { Customer } from "@/lib/types";

export function useCustomers(searchQuery?: string) {
  const customers = useLiveQuery(async () => {
    let collection = db.customers.orderBy("name");
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (await collection.toArray()).filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.email.toLowerCase().includes(q)
      );
    }
    return collection.toArray();
  }, [searchQuery]);

  return customers ?? [];
}

export function useCustomer(id: string) {
  return useLiveQuery(() => db.customers.get(id), [id]);
}

export async function createCustomer(
  data: Omit<Customer, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = new Date().toISOString();
  const id = uuid();
  await db.customers.add({ ...data, id, createdAt: now, updatedAt: now });
  return id;
}

export async function updateCustomer(
  id: string,
  data: Partial<Customer>
): Promise<void> {
  await db.customers.update(id, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteCustomer(id: string): Promise<void> {
  await db.customers.delete(id);
}
