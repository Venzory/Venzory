import { auth } from '@/auth';
import { ownerService } from '@/src/services';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { notFound } from 'next/navigation';

export default async function PracticeDetailPage({ params }: { params: Promise<{ practiceId: string }> }) {
    const { practiceId } = await params;
    const session = await auth();
    const result = await ownerService.getPracticeMembers(session?.user?.email, practiceId);

    if (!result) {
        notFound();
    }

    const { practice, members } = result;

    const columns = [
        { key: 'name', label: 'User', render: (row: any) => row.name || 'N/A' },
        { key: 'email', label: 'Email' },
        { 
            key: 'role', 
            label: 'Role', 
            render: (row: any) => <Badge variant="neutral">{row.role}</Badge> 
        },
        { 
            key: 'status', 
            label: 'Status', 
            render: (row: any) => (
                <Badge variant={row.status === 'ACTIVE' ? 'success' : 'neutral'}>
                    {row.status}
                </Badge>
            ) 
        }
    ];

    return (
        <div className="space-y-6 p-6">
             <PageHeader title={practice.name} subtitle={`Slug: ${practice.slug}`} />
             
             <Card>
                <CardHeader>
                    <CardTitle>Members</CardTitle>
                </CardHeader>
                <CardContent>
                    <DataTable columns={columns} rows={members} />
                </CardContent>
             </Card>
        </div>
    );
}

