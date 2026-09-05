'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calculator, CheckCircle2, Play } from 'lucide-react';
import { format } from 'date-fns';
import { Loading } from '@/components/ui/loading';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Teacher {
  id: string;
  user: { email: string };
  baseSalary: number;
  hourlyRate: number;
  payrollRecords: Array<{
    id: string;
    month: number;
    year: number;
    amountPaid: number;
    bonus: number;
    deductions: number;
    status: 'PENDING' | 'PROCESSED' | 'PAID';
  }>;
}

export default function PayrollProcessingPage() {
  const queryClient = useQueryClient();
  const [targetMonth, setTargetMonth] = useState(new Date().getMonth() + 1);
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: teachers, isLoading } = useQuery({
    queryKey: ['teachers-payroll'],
    queryFn: async () => {
      // Reusing the teachers endpoint which includes payrollRecords
      const { data } = await apiClient.get<Teacher[]>('/hr/teachers');
      return data;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/hr/payroll/generate', {
        month: targetMonth,
        year: targetYear
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers-payroll'] });
    }
  });

  const updatePayrollMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const response = await apiClient.put(`/hr/payroll/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers-payroll'] });
    }
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateMutation.mutateAsync();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkPaid = async (payrollId: string) => {
    await updatePayrollMutation.mutateAsync({ id: payrollId, data: { status: 'PAID' } });
  };

  // Filter payroll records for the current target month/year
  const getRecordForTarget = (teacher: Teacher) => {
    return teacher.payrollRecords.find(
      (r) => r.month === targetMonth && r.year === targetYear
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calculator className="h-8 w-8 text-primary" />
            Payroll Processing
          </h1>
          <p className="text-muted-foreground">Generate, review, and dispatch monthly payrolls.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-3 rounded-lg border shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Period:</span>
            <select 
              className="border rounded px-3 py-1.5 bg-background text-sm"
              value={targetMonth}
              onChange={(e) => setTargetMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{format(new Date(2000, m - 1), 'MMMM')}</option>
              ))}
            </select>
            <select 
              className="border rounded px-3 py-1.5 bg-background text-sm"
              value={targetYear}
              onChange={(e) => setTargetYear(Number(e.target.value))}
            >
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="whitespace-nowrap"
          >
            <Play className="mr-2 h-4 w-4" />
            {isGenerating ? 'Generating...' : 'Auto-Generate Drafts'}
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Teacher</TableHead>
              <TableHead>Rate Type</TableHead>
              <TableHead>Calculated Base</TableHead>
              <TableHead>Bonus (₹)</TableHead>
              <TableHead>Deductions (₹)</TableHead>
              <TableHead>Net Payable</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="px-4 py-8"><Loading variant="inline" text="Loading payroll data..." /></TableCell>
              </TableRow>
            ) : teachers?.length ? (
              teachers.map((teacher) => {
                const record = getRecordForTarget(teacher);
                
                if (!record) {
                  return (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">{teacher.user.email}</TableCell>
                      <TableCell>{teacher.hourlyRate > 0 ? 'Hourly' : 'Fixed Salary'}</TableCell>
                      <TableCell colSpan={6} className="text-muted-foreground italic text-center">
                        No payroll generated for {format(new Date(targetYear, targetMonth - 1), 'MMM yyyy')}. Click Auto-Generate.
                      </TableCell>
                    </TableRow>
                  );
                }

                const netPayable = record.amountPaid + record.bonus - record.deductions;

                return (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">{teacher.user.email}</TableCell>
                    <TableCell>
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                        {teacher.hourlyRate > 0 ? 'Hourly' : 'Fixed'}
                      </span>
                    </TableCell>
                    <TableCell>₹{(record.amountPaid / 100).toFixed(2)}</TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        defaultValue={(record.bonus / 100).toFixed(2)}
                        disabled={record.status === 'PAID'}
                        className="w-24 h-8"
                        onBlur={(e) => {
                          const val = Math.round(Number(e.target.value) * 100);
                          if (val !== record.bonus) {
                            updatePayrollMutation.mutate({ id: record.id, data: { bonus: val } });
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        defaultValue={(record.deductions / 100).toFixed(2)}
                        disabled={record.status === 'PAID'}
                        className="w-24 h-8 text-red-500"
                        onBlur={(e) => {
                          const val = Math.round(Number(e.target.value) * 100);
                          if (val !== record.deductions) {
                            updatePayrollMutation.mutate({ id: record.id, data: { deductions: val } });
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-bold text-green-600">
                      ₹{(netPayable / 100).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          record.status === 'PAID' ? 'bg-green-100 text-green-700' : 
                          record.status === 'PROCESSED' ? 'bg-blue-100 text-blue-700' : 
                          'bg-amber-100 text-amber-700'
                        }`}>
                        {record.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {record.status !== 'PAID' ? (
                        <Button 
                          size="sm" 
                          variant="default"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleMarkPaid(record.id)}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Mark Paid
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground flex items-center justify-end gap-1">
                          <CheckCircle2 className="h-4 w-4 text-green-600" /> Dispatched
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">No teachers found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
