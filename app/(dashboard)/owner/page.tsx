import { auth } from '@/auth';
import { ownerService } from '@/src/services';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProductDataOverview } from './_components/product-data-overview';
import { PracticesTable } from './_components/practices-table';

export default async function OwnerPage() {
  const session = await auth();
  // The middleware already guards this, but service also checks.
  
  const [practices, overviewData] = await Promise.all([
    ownerService.listPractices(session?.user?.email),
    ownerService.getProductDataOverview(session?.user?.email)
  ]);

  return (
    <div className="space-y-6 p-6">
        <PageHeader title="Owner Console" subtitle="Platform overview and practice management" />
        
        <ProductDataOverview data={overviewData} />

        <div className="space-y-4">
           <h2 className="text-lg font-semibold tracking-tight">All Practices</h2>
           <PracticesTable practices={practices} />
        </div>
    </div>
  );
}

