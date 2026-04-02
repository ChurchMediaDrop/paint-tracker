import JobDetailClient from "./JobDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <JobDetailClient id={id} />;
}
