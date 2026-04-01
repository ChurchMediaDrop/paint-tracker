// Setting revalidate = 0 bypasses the static export check for dynamic routes.
// All data is loaded client-side via IndexedDB (Dexie), so no server-side
// data is needed. The client component handles all rendering.
export const revalidate = 0;

import CustomerDetailClient from "./CustomerDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <CustomerDetailClient id={id} />;
}
