'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import { Loading } from '@/components/ui/loading';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Search, Plus, MoreHorizontal, Loader2 } from 'lucide-react';
import { DataTableFilter } from '@/components/ui/data-table-filter';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface Student {
  id: string;
  enrollmentNumber: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
}

export default function StudentsPage() {
  const activeBranchId = useAuthStore((state) => state.activeBranchId);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data: batches = [] } = useQuery({
    queryKey: ['batches', activeBranchId],
    queryFn: async () => (await apiClient.get('/operations/batches', { params: { branchId: activeBranchId } })).data,
    enabled: !!activeBranchId,
  });

  const { data: students = [], isLoading, isFetching } = useQuery({
    queryKey: ['students', activeBranchId, filters],
    queryFn: async () => {
      const res = await apiClient.get<Student[]>('/students', {
        params: { branchId: activeBranchId, ...filters },
      });
      return res.data;
    },
    enabled: !!activeBranchId,
    placeholderData: keepPreviousData,
  });

  const filterOptions = [
    {
      id: 'batchId',
      label: 'Batch',
      options: batches.map((b: any) => ({ label: b.name, value: b.id })),
    },
    {
      id: 'status',
      label: 'Status',
      options: [
        { label: 'Enrolled', value: 'ENROLLED' },
        { label: 'Suspended', value: 'SUSPENDED' },
        { label: 'Alumni', value: 'ALUMNI' },
        { label: 'Withdrawn', value: 'WITHDRAWN' },
      ],
    },
    {
      id: 'isHosteler',
      label: 'Type',
      options: [
        { label: 'Hosteler', value: 'true' },
        { label: 'Day Scholar', value: 'false' },
      ],
    },
    {
      id: 'feeStatus',
      label: 'Fee Status',
      options: [
        { label: 'Paid', value: 'PAID' },
        { label: 'Pending', value: 'PENDING' },
        { label: 'Overdue', value: 'OVERDUE' },
      ],
    },
  ];

  const columns = useMemo(() => [
    {
      accessorKey: 'enrollmentNumber',
      header: 'Enrollment No.',
    },
    {
      accessorFn: (row: Student) => `${row.firstName} ${row.lastName}`,
      id: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: { row: any }) => (
        <Badge variant={row.original.status === 'ENROLLED' ? 'default' : 'secondary'}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      cell: ({ row }: { row: any }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: 'actions',
      cell: ({ row }: { row: any }) => {
        const student = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href={`/students/${student.id}`}>View Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/students/${student.id}/edit`}>Edit Details</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], []);

  const table = useReactTable({
    data: students,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          {isFetching && !isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
        <Button asChild>
          <Link href="/students/new">
            <Plus className="mr-2 h-4 w-4" /> Add Student
          </Link>
        </Button>
      </div>

      <div className="py-4">
        <DataTableFilter 
          searchPlaceholder="Search students by name or ID..."
          filters={filterOptions}
          onFilterChange={setFilters}
        />
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
                  {isLoading ? <Loading variant="inline" text="Loading students..." /> : 'No results.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
