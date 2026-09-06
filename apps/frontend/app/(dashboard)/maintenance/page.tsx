'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import { Loading } from '@/components/ui/loading';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Wrench, MoreVertical, Loader2, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTableFilter } from '@/components/ui/data-table-filter';

export default function MaintenanceExpensesPage() {
  const activeBranchId = useAuthStore(s => s.activeBranchId);
  const queryClient = useQueryClient();
  
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  
  const [newExpense, setNewExpense] = useState({
    title: '',
    category: 'MAINTENANCE',
    amount: '',
    paymentMode: 'CASH',
    explanation: '',
  });

  const { data: expenses = [], isLoading, isFetching } = useQuery({
    queryKey: ['maintenance-expenses', activeBranchId, filters],
    queryFn: async () => {
      const res = await apiClient.get('/maintenance', { 
        params: { 
          branchId: activeBranchId,
          search: filters.search || undefined,
          status: filters.status || undefined,
        } 
      });
      return res.data;
    },
    enabled: !!activeBranchId,
    placeholderData: keepPreviousData,
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiClient.post('/maintenance', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-expenses', activeBranchId] });
      setIsNewExpenseOpen(false);
      setNewExpense({ title: '', category: 'MAINTENANCE', amount: '', paymentMode: 'CASH', explanation: '' });
    }
  });

  const resolveExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/maintenance/${id}/resolve`, {}, { params: { branchId: activeBranchId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-expenses', activeBranchId] });
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createExpenseMutation.mutate({
      title: newExpense.title,
      category: newExpense.category,
      amount: Math.round(parseFloat(newExpense.amount) * 100), // convert to cents
      paymentMode: newExpense.paymentMode,
      explanation: newExpense.explanation,
      branchId: activeBranchId,
    });
  };

  const filterOptions = [
    {
      id: 'status',
      label: 'Status',
      options: [
        { label: 'Pending', value: 'PENDING' },
        { label: 'Resolved', value: 'RESOLVED' },
      ]
    }
  ];

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Maintenance & Expenses</h1>
          {isFetching && !isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
        
        <Dialog open={isNewExpenseOpen} onOpenChange={setIsNewExpenseOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Log Expense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log New Maintenance / Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Title / Issue</Label>
                <Input required placeholder="e.g. Broken AC Repair, Painting" value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newExpense.category} onValueChange={(val) => setNewExpense({...newExpense, category: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ELECTRONICS">Electronics</SelectItem>
                      <SelectItem value="FURNITURE">Furniture</SelectItem>
                      <SelectItem value="MAINTENANCE">General Maintenance</SelectItem>
                      <SelectItem value="STATIONERY">Stationery</SelectItem>
                      <SelectItem value="UTILITIES">Utilities</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Payment Mode</Label>
                  <Select value={newExpense.paymentMode} onValueChange={(val) => setNewExpense({...newExpense, paymentMode: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                      <SelectItem value="ONLINE">Online</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input type="number" required min="1" step="0.01" placeholder="e.g. 5000" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} />
              </div>

              <div className="space-y-2">
                <Label>Explanation / Details</Label>
                <Textarea placeholder="Explain the issue and resolution..." rows={3} value={newExpense.explanation} onChange={e => setNewExpense({...newExpense, explanation: e.target.value})} />
              </div>
              
              <Button type="submit" className="w-full" isLoading={createExpenseMutation.isPending}>
                Log Expense
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <DataTableFilter 
        searchPlaceholder="Search maintenance records..."
        filters={filterOptions}
        onFilterChange={setFilters}
      />
      
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Payment Mode</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr><td colSpan={7} className="px-4 py-8"><Loading variant="inline" text="Loading expenses..." /></td></tr>
                ) : expenses.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No maintenance records found.</td></tr>
                ) : (
                  expenses.map((exp: any) => (
                    <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="px-4 py-3">{new Date(exp.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-medium">
                        {exp.title}
                        {exp.explanation && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{exp.explanation}</p>}
                      </td>
                      <td className="px-4 py-3"><Badge variant="outline">{exp.category}</Badge></td>
                      <td className="px-4 py-3 font-medium text-red-600">₹{(exp.amount / 100).toFixed(2)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{exp.paymentMode}</td>
                      <td className="px-4 py-3">
                        {exp.status === 'RESOLVED' 
                          ? <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1"/> Resolved</Badge>
                          : <Badge variant="outline">Pending</Badge>
                        }
                      </td>
                      <td className="px-4 py-3 text-right">
                        {exp.status === 'PENDING' && (
                          <Button 
                            size="sm" 
                            onClick={() => resolveExpenseMutation.mutate(exp.id)}
                            isLoading={resolveExpenseMutation.isPending}
                          >
                            Resolve
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
