'use client';

import { useState, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Package, AlertTriangle, IdCard, Send } from 'lucide-react';
import { Loading } from '@/components/ui/loading';
import { toast } from 'sonner';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  sku: string;
  stockQuantity: number;
  minStockThreshold: number;
  price: number;
}

export default function InventoryDashboardPage() {
  const queryClient = useQueryClient();
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  // Issue Modal State
  const [studentId, setStudentId] = useState('');
  const [issueQuantity, setIssueQuantity] = useState(1);
  const [issueRemarks, setIssueRemarks] = useState('');

  // Add Modal State
  const [newItemData, setNewItemData] = useState({
    name: '',
    category: 'STATIONERY',
    sku: '',
    price: 0,
    minStockThreshold: 10,
    initialStock: 0,
  });

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data } = await apiClient.get<InventoryItem[]>('/operations/inventory');
      return data;
    },
  });

  const issueMutation = useMutation({
    mutationFn: async (payload: { studentId: string; itemId: string; quantity: number; remarks: string }) => {
      const { data } = await apiClient.post('/operations/inventory/issue', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setIssueModalOpen(false);
      setStudentId('');
      setIssueQuantity(1);
      setIssueRemarks('');
    }
  });

  const addMutation = useMutation({
    mutationFn: async (payload: typeof newItemData) => {
      const { data } = await apiClient.post('/operations/inventory', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setAddModalOpen(false);
      toast.success('Inventory item created successfully!');
      setNewItemData({
        name: '',
        category: 'STATIONERY',
        sku: '',
        price: 0,
        minStockThreshold: 10,
        initialStock: 0,
      });
    }
  });

  const columns = useMemo<ColumnDef<InventoryItem>[]>(() => [
    {
      accessorKey: 'sku',
      header: 'SKU',
      cell: ({ row }) => <span className="font-mono text-sm">{row.getValue('sku')}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Item Name',
      cell: ({ row }) => <span className="font-medium">{row.getValue('name')}</span>,
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800">
          {row.getValue('category')}
        </span>
      ),
    },
    {
      accessorKey: 'stockQuantity',
      header: 'In Stock',
      cell: ({ row }) => {
        const qty = row.original.stockQuantity;
        const min = row.original.minStockThreshold;
        const isLow = qty <= min;
        
        return (
          <div className="flex items-center gap-2">
            <span className={`font-bold ${isLow ? 'text-red-600' : ''}`}>{qty}</span>
            {isLow && <span title="Low Stock"><AlertTriangle className="h-4 w-4 text-red-500" /></span>}
          </div>
        );
      },
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => {
        const price = row.getValue('price') as number;
        return price > 0 ? `₹${(price / 100).toFixed(2)}` : 'Free';
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            setSelectedItemId(row.original.id);
            setIssueModalOpen(true);
          }}
          disabled={row.original.stockQuantity <= 0}
        >
          <Send className="mr-2 h-4 w-4" />
          Issue to Student
        </Button>
      ),
    },
  ], []);

  const table = useReactTable({
    data: inventory || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !studentId) return;
    issueMutation.mutate({
      studentId,
      itemId: selectedItemId,
      quantity: issueQuantity,
      remarks: issueRemarks,
    });
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate(newItemData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            Inventory Management
          </h1>
          <p className="text-muted-foreground">Track stock levels and issue materials.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/operations/id-cards">
              <IdCard className="mr-2 h-4 w-4" />
              ID Card Print Center
            </Link>
          </Button>
          <Button onClick={() => setAddModalOpen(true)}>
            <Package className="mr-2 h-4 w-4" />
            Add New Item
          </Button>
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
                  <Loading variant="inline" text="Loading inventory..." />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
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
                  No inventory items found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={issueModalOpen} onOpenChange={setIssueModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Material</DialogTitle>
            <DialogDescription>
              Record material distributed to a student. This will deduct from available stock.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleIssue}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID (UUID)</Label>
                <Input 
                  id="studentId" 
                  required 
                  value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                />
                <p className="text-xs text-muted-foreground">In a full UI, this would be an autocomplete search field.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input 
                  id="quantity" 
                  type="number" 
                  min="1" 
                  required 
                  value={issueQuantity}
                  onChange={e => setIssueQuantity(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks (Optional)</Label>
                <Input 
                  id="remarks" 
                  value={issueRemarks}
                  onChange={e => setIssueRemarks(e.target.value)}
                  placeholder="e.g. Free uniform bundle"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIssueModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={issueMutation.isPending}>
                Issue Item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add New Item Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Inventory Item</DialogTitle>
            <DialogDescription>
              Create a new item to track in the inventory system.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name</Label>
                  <Input 
                    id="name" 
                    required 
                    value={newItemData.name}
                    onChange={e => setNewItemData({...newItemData, name: e.target.value})}
                    placeholder="e.g. NoteBook A4"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU / Code</Label>
                  <Input 
                    id="sku" 
                    required 
                    value={newItemData.sku}
                    onChange={e => setNewItemData({...newItemData, sku: e.target.value})}
                    placeholder="e.g. NB-A4-100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select 
                    id="category"
                    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus:ring-slate-300"
                    value={newItemData.category}
                    onChange={e => setNewItemData({...newItemData, category: e.target.value})}
                  >
                    <option value="UNIFORM">Uniform</option>
                    <option value="STATIONERY">Stationery</option>
                    <option value="BOOKS">Books</option>
                    <option value="EQUIPMENT">Equipment</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (₹)</Label>
                  <Input 
                    id="price" 
                    type="number" 
                    min="0"
                    step="0.01"
                    required 
                    value={newItemData.price / 100}
                    onChange={e => setNewItemData({...newItemData, price: Math.round(Number(e.target.value) * 100)})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="initialStock">Initial Stock</Label>
                  <Input 
                    id="initialStock" 
                    type="number" 
                    min="0"
                    required 
                    value={newItemData.initialStock}
                    onChange={e => setNewItemData({...newItemData, initialStock: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minThreshold">Low Stock Alert at</Label>
                  <Input 
                    id="minThreshold" 
                    type="number" 
                    min="0"
                    required 
                    value={newItemData.minStockThreshold}
                    onChange={e => setNewItemData({...newItemData, minStockThreshold: Number(e.target.value)})}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addMutation.isPending}>
                Create Item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
