import QuoteDetailClient from "./QuoteDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function QuoteDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <QuoteDetailClient id={id} />;
}
