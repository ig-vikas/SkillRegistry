import { notFound } from 'next/navigation';
import { SecurityReportView } from '../../../../components/security-report';
import { getSecurityReport } from '../../../../lib/api';

export default async function SecurityPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  try {
    const report = await getSecurityReport(name);
    return (
      <div>
        <h1 className="mb-6 text-3xl font-bold">Security report: {name}</h1>
        <SecurityReportView report={report} />
      </div>
    );
  } catch {
    notFound();
  }
}
