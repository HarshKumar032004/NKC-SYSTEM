'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Calculator, ExternalLink } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Teacher {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  specialization: string | null;
  baseSalary: number;
  hourlyRate: number;
  user?: {
    email: string;
    isActive: boolean;
  };
  teacherSubjects: Array<{ subject: { name: string } }>;
}

const columns: ColumnDef<Teacher>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const teacher = row.original;
      return (
        <Link href={`/hr/${teacher.id}`} className="font-medium text-primary hover:underline flex items-center gap-2">
          {teacher.name} <ExternalLink className="h-3 w-3" />
        </Link>
      );
    },
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => row.getValue('phone') || 'N/A',
  },
  {
    accessorKey: 'user.email',
    header: 'Email / Account',
    cell: ({ row }) => {
      const user = row.original.user;
      if (!user) return <span className="text-muted-foreground text-sm">No Account</span>;
      return <span>{user.email}</span>;
    },
  },
  {
    accessorKey: 'specialization',
    header: 'Specialization',
    cell: ({ row }) => row.getValue('specialization') || 'N/A',
  },
  {
    accessorKey: 'baseSalary',
    header: 'Base Salary',
    cell: ({ row }) => {
      const salary = row.getValue('baseSalary') as number;
      return salary > 0 ? `₹${(salary / 100).toFixed(2)}` : '-';
    },
  },
  {
    accessorKey: 'hourlyRate',
    header: 'Hourly Rate',
    cell: ({ row }) => {
      const rate = row.getValue('hourlyRate') as number;
      return rate > 0 ? `₹${(rate / 100).toFixed(2)}/hr` : '-';
    },
  },
];

export default function TeacherDirectoryPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  
  const defaultFormData = {
    name: '',
    phone: '',
    address: '',
    createAccount: false,
    email: '',
    password: '',
    specialization: '',
    baseSalary: 0,
    hourlyRate: 0,
  };
  const [formData, setFormData] = useState(defaultFormData);

  const { data: teachers, isLoading } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const { data } = await apiClient.get<Teacher[]>('/hr/teachers');
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiClient.post('/hr/teachers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setIsOpen(false);
      setFormData(defaultFormData);
      toast.success('Teacher created successfully!');
    },
    onError: (error: any) => {
      console.error('Failed to create teacher:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to create teacher. Please check the inputs.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      // Convert to integer cents/paise for backend storage
      baseSalary: Math.round(formData.baseSalary * 100),
      hourlyRate: Math.round(formData.hourlyRate * 100),
    });
  };

  const table = useReactTable({
    data: teachers || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teacher Directory</h1>
          <p className="text-muted-foreground">Manage teaching staff and HR profiles.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/hr/payroll">
              <Calculator className="mr-2 h-4 w-4" />
              Payroll Processing
            </Link>
          </Button>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Teacher
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Teacher</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-sm font-medium">Full Name</label>
                    <Input 
                      type="text" 
                      required 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-sm font-medium">Phone</label>
                    <Input 
                      type="tel" 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Address</label>
                  <Textarea 
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    placeholder="Full Address"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Specialization (What they teach)</label>
                  <Input 
                    type="text" 
                    value={formData.specialization}
                    onChange={e => setFormData({...formData, specialization: e.target.value})}
                    placeholder="e.g. Mathematics"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 border p-4 rounded-md">
                  <div className="col-span-2 text-sm text-muted-foreground mb-2">
                    Enter either a Base Salary OR an Hourly Rate. Leave as 0 if not applicable.
                  </div>
                  <div>
                    <label className="text-sm font-medium">Base Salary (₹/month)</label>
                    <Input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={formData.baseSalary === 0 ? '' : formData.baseSalary}
                      onChange={e => setFormData({...formData, baseSalary: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Hourly Rate (₹/hr)</label>
                    <Input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={formData.hourlyRate === 0 ? '' : formData.hourlyRate}
                      onChange={e => setFormData({...formData, hourlyRate: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="border p-4 rounded-md bg-muted/50 space-y-4">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox"
                      id="create-account" 
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={formData.createAccount}
                      onChange={(e) => setFormData({...formData, createAccount: e.target.checked})}
                    />
                    <Label htmlFor="create-account">Create Login Account?</Label>
                  </div>
                  
                  {formData.createAccount && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Email Address</label>
                        <Input 
                          type="email" 
                          required={formData.createAccount}
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          placeholder="teacher@branch.com"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Temp Password</label>
                        <Input 
                          type="password" 
                          required={formData.createAccount}
                          value={formData.password}
                          onChange={e => setFormData({...formData, password: e.target.value})}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full" isLoading={createMutation.isPending}>
                  Create Teacher
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-900">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="px-4 py-8">
                  <Loading variant="inline" text="Loading HR directory..." />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No teachers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
