'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Plus, MoreHorizontal, Building2, Pencil, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateBranchSchema, UpdateBranchSchema } from '@nkc/shared-types';

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function BranchesPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await apiClient.get('/branches');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof CreateBranchSchema>) => apiClient.post('/branches', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setIsCreateOpen(false);
      createForm.reset();
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to create branch.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: z.infer<typeof UpdateBranchSchema> }) =>
      apiClient.patch(`/branches/${data.id}`, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setIsEditOpen(false);
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to update branch.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/branches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setIsDeleteOpen(false);
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to deactivate branch.');
    },
  });

  const createForm = useForm<z.input<typeof CreateBranchSchema>, any, z.infer<typeof CreateBranchSchema>>({
    resolver: zodResolver(CreateBranchSchema),
    defaultValues: {
      name: '',
      code: '',
      address: '',
      contactPhone: '',
      email: '',
      city: '',
      state: '',
      zipCode: '',
      managerName: '',
      hostelFee: 0,
      messFee: 0,
      isActive: true,
    },
  });

  const editForm = useForm<z.input<typeof UpdateBranchSchema>, any, z.infer<typeof UpdateBranchSchema>>({
    resolver: zodResolver(UpdateBranchSchema),
    defaultValues: {
      name: '',
      code: '',
      address: '',
      contactPhone: '',
      email: '',
      city: '',
      state: '',
      zipCode: '',
      managerName: '',
      hostelFee: 0,
      messFee: 0,
      isActive: true,
    },
  });

  const handleEditClick = (branch: any) => {
    setSelectedBranch(branch);
    editForm.reset({
      name: branch.name,
      code: branch.code,
      address: branch.address,
      contactPhone: branch.contactPhone,
      email: branch.email || '',
      city: branch.city || '',
      state: branch.state || '',
      zipCode: branch.zipCode || '',
      managerName: branch.managerName || '',
      hostelFee: branch.hostelFee || 0,
      messFee: branch.messFee || 0,
      isActive: branch.isActive,
    });
    setIsEditOpen(true);
  };

  const handleDeleteClick = (branch: any) => {
    setSelectedBranch(branch);
    setIsDeleteOpen(true);
  };

  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Branch Name',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'code',
      header: 'Code',
    },
    {
      accessorKey: 'contactPhone',
      header: 'Phone',
    },
    {
      accessorKey: 'hostelFee',
      header: 'Hostel Fee',
      cell: ({ row }: any) => `₹${row.original.hostelFee?.toLocaleString() || 0}`,
    },
    {
      accessorKey: 'messFee',
      header: 'Mess Fee',
      cell: ({ row }: any) => `₹${row.original.messFee?.toLocaleString() || 0}`,
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }: any) => (
        <Badge variant={row.original.isActive ? 'default' : 'destructive'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }: any) => {
        if (user?.role !== 'SUPER_ADMIN') return null;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleEditClick(row.original)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Branch
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => handleDeleteClick(row.original)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Deactivate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [user]);

  const table = useReactTable({
    data: branches,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-6 p-2 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Branches</h1>
          <p className="text-muted-foreground">Manage institute branches and campuses.</p>
        </div>
        {user?.role === 'SUPER_ADMIN' && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Branch
          </Button>
        )}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
                  {isLoading ? <Loading variant="inline" text="Loading branches..." /> : 'No branches found.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* CREATE MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add New Branch</DialogTitle>
            <DialogDescription>
              Create a new branch or campus. Click save when you are done.
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Main Campus" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch Code</FormLabel>
                    <FormControl>
                      <Input placeholder="BR-01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 234 567 8900" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contact@branch.com" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Mumbai" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="Maharashtra" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zip/Postal Code</FormLabel>
                    <FormControl>
                      <Input placeholder="400001" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="managerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch Manager / Principal</FormLabel>
                    <FormControl>
                      <Input placeholder="Dr. John Doe" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="hostelFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hostel Fee (per year)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="50000" {...field} value={field.value as string | number} onChange={e => field.onChange(parseFloat(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="messFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mess Fee (per year)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="30000" {...field} value={field.value as string | number} onChange={e => field.onChange(parseFloat(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Full Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="123 Education St." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm md:col-span-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        className="h-4 w-4 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active Branch</FormLabel>
                      <DialogDescription>
                        This branch is currently operational and accepts enrollments.
                      </DialogDescription>
                    </div>
                  </FormItem>
                )}
              />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving...' : 'Save Branch'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
            <DialogDescription>
              Modify branch details.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((data) =>
                updateMutation.mutate({ id: selectedBranch?.id, payload: data })
              )}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch Code</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zip/Postal Code</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="managerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch Manager / Principal</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="hostelFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hostel Fee (per year)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value as string | number} onChange={e => field.onChange(parseFloat(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="messFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mess Fee (per year)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value as string | number} onChange={e => field.onChange(parseFloat(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Full Address</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm md:col-span-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        className="h-4 w-4 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active Branch</FormLabel>
                      <DialogDescription>
                        This branch is currently operational and accepts enrollments.
                      </DialogDescription>
                    </div>
                  </FormItem>
                )}
              />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* DELETE/DEACTIVATE CONFIRMATION */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action will deactivate the branch "{selectedBranch?.name}". 
              You can restore it later if needed, but it will be hidden from users.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedBranch?.id) {
                  deleteMutation.mutate(selectedBranch.id);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deactivating...' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
