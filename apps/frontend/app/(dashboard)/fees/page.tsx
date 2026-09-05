'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Plus } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DataTableFilter } from '@/components/ui/data-table-filter';
import { Loading } from '@/components/ui/loading';

export default function FeesGlobalLedgerPage() {
  const activeBranchId = useAuthStore(s => s.activeBranchId);
  const queryClient = useQueryClient();
  
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [isNewStructureOpen, setIsNewStructureOpen] = useState(false);
  const [newStructureData, setNewStructureData] = useState({ name: '', totalAmount: '' });

  const { data: students = [], isLoading: loadingLedger } = useQuery({
    queryKey: ['fees-ledger', activeBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/fees', { params: { branchId: activeBranchId } });
      return res.data;
    },
    enabled: !!activeBranchId,
  });

  const { data: feeStructures = [], isLoading: loadingStructures } = useQuery({
    queryKey: ['fees-structures', activeBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/fees/structures', { params: { branchId: activeBranchId } });
      return res.data;
    },
    enabled: !!activeBranchId,
  });

  const createStructureMutation = useMutation({
    mutationFn: async (data: { name: string, totalAmount: number }) => {
      await apiClient.post('/fees/structures', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees-structures', activeBranchId] });
      setIsNewStructureOpen(false);
      setNewStructureData({ name: '', totalAmount: '' });
    }
  });

  const handleCreateStructure = (e: React.FormEvent) => {
    e.preventDefault();
    createStructureMutation.mutate({
      name: newStructureData.name,
      totalAmount: Math.round(parseFloat(newStructureData.totalAmount) * 100) // convert to cents
    });
  };

  const filteredStudents = students.filter((student: any) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!student.firstName.toLowerCase().includes(q) && 
          !student.lastName.toLowerCase().includes(q) && 
          !student.enrollmentNumber?.toLowerCase().includes(q)) {
        return false;
      }
    }
    
    // Status filter logic
    let hasOverdue = false;
    let totalDue = 0;
    let totalPaid = 0;
    student.feeInstallments.forEach((inst: any) => {
      totalDue += inst.amountDue;
      totalPaid += inst.amountPaid;
      if (inst.status === 'OVERDUE') hasOverdue = true;
    });
    
    let computedStatus = hasOverdue ? 'OVERDUE' : (totalDue > 0 && totalDue === totalPaid) ? 'PAID' : 'PENDING';
    
    if (filters.feeStatus && filters.feeStatus !== computedStatus) {
      return false;
    }
    return true;
  });

  const defaulters = students.filter((student: any) => {
    return student.feeInstallments.some((inst: any) => inst.status === 'OVERDUE');
  });

  const filterOptions = [
    {
      id: 'feeStatus',
      label: 'Fee Status',
      options: [
        { label: 'Pending', value: 'PENDING' },
        { label: 'Overdue', value: 'OVERDUE' },
        { label: 'Paid', value: 'PAID' },
      ]
    }
  ];

  if (loadingLedger) return <Loading variant="page" text="Loading Fee Dashboard..." />;

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Fees Dashboard</h1>
      </div>
      
      <Tabs defaultValue="ledger" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="ledger">Fee Ledger</TabsTrigger>
          <TabsTrigger value="defaulters">Defaulters ({defaulters.length})</TabsTrigger>
          {useAuthStore.getState().user?.role === 'SUPER_ADMIN' && (
            <TabsTrigger value="structures">Fee Structures</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="ledger" className="space-y-4">
          <DataTableFilter 
            searchPlaceholder="Search students by name or ID..."
            filters={filterOptions}
            onFilterChange={setFilters}
          />
          
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium">Student Name</th>
                      <th className="px-4 py-3 font-medium">Enrollment No</th>
                      <th className="px-4 py-3 font-medium">Total Due</th>
                      <th className="px-4 py-3 font-medium">Total Paid</th>
                      <th className="px-4 py-3 font-medium">Next Due Date</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredStudents.map((student: any) => {
                      let totalDue = 0;
                      let totalPaid = 0;
                      let hasOverdue = false;
                      let nextDueDate: Date | null = null;

                      student.feeInstallments.forEach((inst: any) => {
                        totalDue += inst.amountDue;
                        totalPaid += inst.amountPaid;
                        if (inst.status === 'OVERDUE') hasOverdue = true;
                        if (inst.status === 'PENDING' || inst.status === 'PARTIALLY_PAID') {
                          const dDate = new Date(inst.dueDate);
                          if (!nextDueDate || dDate < nextDueDate) {
                            nextDueDate = dDate;
                          }
                        }
                      });

                      const statusBadge = hasOverdue 
                        ? <Badge variant="destructive">Overdue</Badge> 
                        : (totalDue > 0 && totalDue === totalPaid) 
                          ? <Badge variant="secondary" className="bg-green-100 text-green-800">Fully Paid</Badge>
                          : <Badge variant="outline">Pending</Badge>;

                      return (
                        <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="px-4 py-3 font-medium">{student.firstName} {student.lastName}</td>
                          <td className="px-4 py-3 text-muted-foreground">{student.enrollmentNumber || 'N/A'}</td>
                          <td className="px-4 py-3">₹{(totalDue / 100).toFixed(2)}</td>
                          <td className="px-4 py-3 text-green-600">₹{(totalPaid / 100).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            {nextDueDate ? (nextDueDate as Date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-4 py-3">{statusBadge}</td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/fees/${student.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4 mr-2" />
                                Ledger
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defaulters">
          <Card className="border-red-200 dark:border-red-900/50">
            <CardHeader className="bg-red-50 dark:bg-red-900/10">
              <CardTitle className="text-red-600">Defaulters List</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium">Student Name</th>
                      <th className="px-4 py-3 font-medium">Phone</th>
                      <th className="px-4 py-3 font-medium">Overdue Amount</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {defaulters.map((student: any) => {
                      let overdueAmount = 0;
                      student.feeInstallments.forEach((inst: any) => {
                        if (inst.status === 'OVERDUE') {
                          overdueAmount += (inst.amountDue - inst.amountPaid);
                        }
                      });

                      return (
                        <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                          <td className="px-4 py-3 font-medium">{student.firstName} {student.lastName}</td>
                          <td className="px-4 py-3">{student.phone || 'N/A'}</td>
                          <td className="px-4 py-3 text-red-600 font-semibold">₹{(overdueAmount / 100).toFixed(2)}</td>
                          <td className="px-4 py-3 flex items-center gap-2">
                            <Link href={`/fees/${student.id}`}>
                              <Button variant="outline" size="sm">Collect Payment</Button>
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => alert(`Reminder sent to ${student.firstName} for ₹${(overdueAmount / 100).toFixed(2)}!`)}
                            >
                              Send Reminder
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="structures">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Fee Structures Configuration</CardTitle>
              <Dialog open={isNewStructureOpen} onOpenChange={setIsNewStructureOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="mr-2 h-4 w-4" /> New Structure</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Fee Structure</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateStructure} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Template Name (e.g. Class 10 PCM, Hostel A)</Label>
                      <Input required value={newStructureData.name} onChange={e => setNewStructureData({...newStructureData, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Total Amount (₹)</Label>
                      <Input type="number" required min="1" step="0.01" value={newStructureData.totalAmount} onChange={e => setNewStructureData({...newStructureData, totalAmount: e.target.value})} />
                    </div>
                    <Button type="submit" className="w-full" disabled={createStructureMutation.isPending}>
                      {createStructureMutation.isPending ? 'Saving...' : 'Create Structure'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium">Template Name</th>
                      <th className="px-4 py-3 font-medium">Total Amount</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loadingStructures ? (
                      <tr><td colSpan={3} className="px-4 py-6 text-center"><Loading variant="inline" /></td></tr>
                    ) : (
                      feeStructures.map((struct: any) => (
                        <tr key={struct.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                          <td className="px-4 py-3 font-medium">{struct.name}</td>
                          <td className="px-4 py-3">₹{(struct.totalAmount / 100).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={struct.isArchived ? "secondary" : "default"}>
                              {struct.isArchived ? 'Archived' : 'Active'}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
