'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Loading } from '@/components/ui/loading';
import { useAuthStore } from '@/store/auth-store';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, CreditCard, CheckCircle2 } from 'lucide-react';
import { PaymentModal } from '../components/payment-modal';

export default function StudentFeeLedgerPage() {
  const { studentId } = useParams();
  const activeBranchId = useAuthStore(s => s.activeBranchId);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<any>(null);

  const { data: student, isLoading } = useQuery({
    queryKey: ['student-ledger', studentId],
    queryFn: async () => {
      const res = await apiClient.get(`/fees/student/${studentId}`);
      return res.data;
    },
    enabled: !!studentId,
  });

  if (isLoading) return <Loading variant="page" text="Loading Ledger..." />;
  if (!student) return <div className="p-8 text-red-500">Student not found</div>;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{student.firstName} {student.lastName}'s Fee Ledger</h1>
          <p className="text-muted-foreground">Enrollment No: {student.enrollmentNumber || 'N/A'}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Installments</CardTitle>
            <CardDescription>Scheduled fee breakdowns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {student.feeInstallments.map((inst: any) => {
              const dueAmount = inst.amountDue / 100;
              const paidAmount = inst.amountPaid / 100;
              const isFullyPaid = inst.status === 'PAID';
              
              return (
                <div key={inst.id} className={`p-4 border rounded-lg flex flex-col gap-3 ${isFullyPaid ? 'bg-green-50/50 dark:bg-green-950/20' : 'bg-slate-50 dark:bg-slate-900/50'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{inst.feeStructure.name}</div>
                      <div className="text-sm text-muted-foreground">Due: {new Date(inst.dueDate).toLocaleDateString()}</div>
                    </div>
                    {isFullyPaid ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Paid</Badge>
                    ) : inst.status === 'OVERDUE' ? (
                      <Badge variant="destructive">Overdue</Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <div>
                      <span className="text-muted-foreground">Paid:</span> <span className="font-medium text-green-600">₹{paidAmount.toFixed(2)}</span>
                      <span className="mx-2">/</span>
                      <span className="text-muted-foreground">Total:</span> <span className="font-medium">₹{dueAmount.toFixed(2)}</span>
                    </div>
                    {!isFullyPaid && (
                      <Button size="sm" onClick={() => { setSelectedInstallment(inst); setIsPaymentModalOpen(true); }}>
                        <CreditCard className="w-4 h-4 mr-2" /> Pay Now
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {student.feeInstallments.length === 0 && (
              <div className="text-center text-muted-foreground py-8 border border-dashed rounded-lg">
                No fee installments found.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Past payments and receipts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {student.paymentTransactions.map((tx: any) => (
              <div key={tx.id} className="p-3 border-b last:border-0 flex justify-between items-center">
                <div>
                  <div className="font-medium">₹{(tx.amount / 100).toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleDateString()} • {tx.paymentMethod}
                    {tx.referenceNumber && ` • Ref: ${tx.referenceNumber}`}
                  </div>
                </div>
                {tx.receipt?.documentUrl ? (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={tx.receipt.documentUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 mr-2" /> Receipt
                    </a>
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground italic">Generating...</span>
                )}
              </div>
            ))}
            {student.paymentTransactions.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No payment transactions yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PaymentModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => { setIsPaymentModalOpen(false); setSelectedInstallment(null); }} 
        studentId={studentId as string}
        installment={selectedInstallment}
      />
    </div>
  );
}
