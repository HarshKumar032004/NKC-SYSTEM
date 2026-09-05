'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const paymentSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  paymentMethod: z.enum(['CASH', 'UPI', 'CHEQUE', 'ONLINE']),
  referenceNumber: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  installment: any;
}

export function PaymentModal({ isOpen, onClose, studentId, installment }: PaymentModalProps) {
  const queryClient = useQueryClient();
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setIdempotencyKey(crypto.randomUUID());
    }
  }, [isOpen]);

  const maxPayable = installment ? (installment.amountDue - installment.amountPaid) / 100 : 0;

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema) as any,
    defaultValues: {
      amount: maxPayable,
      paymentMethod: 'CASH',
      referenceNumber: '',
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async (data: PaymentFormValues) => {
      // Convert to cents before sending to API
      const amountInCents = Math.round(data.amount * 100);
      const res = await apiClient.post(`/fees/student/${studentId}/installments/${installment.id}/pay`, {
        amount: amountInCents,
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber,
      }, {
        headers: {
          'Idempotency-Key': idempotencyKey
        }
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['student-ledger', studentId] });
      if (data.receipt?.documentUrl) {
        setReceiptUrl(data.receipt.documentUrl);
      }
    },
  });

  const onSubmit = (data: PaymentFormValues) => {
    if (data.amount > maxPayable) {
      form.setError('amount', { message: `Cannot exceed remaining due of ₹${maxPayable.toFixed(2)}` });
      return;
    }
    paymentMutation.mutate(data);
  };

  if (!installment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        {receiptUrl ? (
          <div className="flex flex-col items-center justify-center py-6 gap-4 text-center">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl">
              ✓
            </div>
            <h3 className="font-semibold text-lg">Payment Successful</h3>
            <p className="text-muted-foreground text-sm">The payment has been recorded and the receipt is ready.</p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button asChild>
                <a href={receiptUrl} target="_blank" rel="noopener noreferrer">Download Receipt</a>
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount to Pay (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} readOnly className="bg-gray-100 cursor-not-allowed" />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Exact amount payable: ₹{maxPayable.toFixed(2)} (Partial payments disabled)</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                        <SelectItem value="ONLINE">Online Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="referenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Transaction ID, Cheque No, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={paymentMutation.isPending}>
                  {paymentMutation.isPending ? 'Processing...' : 'Confirm Payment'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
