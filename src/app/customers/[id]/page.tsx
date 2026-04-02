import CustomerDetailClient from "./CustomerDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <CustomerDetailClient id={id} />;
}
