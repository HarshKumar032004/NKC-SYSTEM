'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Save } from 'lucide-react';

export default function MarksEntryPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const activeBranchId = useAuthStore(s => s.activeBranchId);

  // 1. Fetch Exam Details (includes subjects and batchId)
  const { data: exam, isLoading: examLoading } = useQuery({
    queryKey: ['exam', examId],
    queryFn: async () =>
      (await apiClient.get(`/exams/${examId}`, { params: { branchId: activeBranchId } })).data,
    enabled: !!examId && !!activeBranchId,
  });

  // 2. Fetch Enrollments for the Batch
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['enrollments-for-exam', exam?.batchId],
    queryFn: async () =>
      (await apiClient.get(`/students/enrollments/batch/${exam.batchId}`, {
        params: { branchId: activeBranchId },
      })).data,
    enabled: !!exam?.batchId && !!activeBranchId,
  });

  const subjects = exam?.subjects ?? [];

  // 3. Editable marks state: "studentId_subjectId" → value string
  const [marks, setMarks] = useState<Record<string, string>>({});

  const handleMarkChange = (studentId: string, subjectId: string, value: string) => {
    setMarks(prev => ({ ...prev, [`${studentId}_${subjectId}`]: value }));
  };

  // 4. Table columns
  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'enrollmentNumber',
      header: 'Enrol. No.',
      cell: info => (
        <span className="font-mono text-xs text-slate-500">
          {info.row.original.student.enrollmentNumber}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Student Name',
      cell: info => (
        <span className="font-medium text-slate-900">
          {info.row.original.student.firstName} {info.row.original.student.lastName}
        </span>
      ),
    },
    ...subjects.map((sub: any) => ({
      id: sub.id,
      header: () => (
        <span className="whitespace-nowrap">
          {sub.name}
          <span className="font-normal text-slate-400 ml-1">/{sub.maxMarks}</span>
        </span>
      ),
      cell: ({ row }: any) => {
        const key = `${row.original.studentId}_${sub.id}`;
        const val = marks[key] ?? '';
        const numVal = Number(val);
        const isOver = val !== '' && numVal > sub.maxMarks;
        return (
          <Input
            type="number"
            value={val}
            onChange={e => handleMarkChange(row.original.studentId, sub.id, e.target.value)}
            className={[
              'w-24 h-8 tabular-nums text-center',
              isOver ? 'border-red-400 focus-visible:border-red-500' : '',
            ].join(' ')}
            max={sub.maxMarks}
            min={0}
            aria-label={`Marks for ${row.original.student.firstName} in ${sub.name}`}
          />
        );
      },
    })),
  ], [subjects, marks]);

  const table = useReactTable({
    data: enrollments,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // 5. Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const sub of subjects) {
        await apiClient.post(`/exams/${examId}/marks`, {
          subjectId: sub.id,
          marks: enrollments.map((enr: any) => ({
            studentId: enr.studentId,
            marksObtained: Number(marks[`${enr.studentId}_${sub.id}`] ?? 0),
          })),
        });
      }
    },
    onSuccess: () => {
      toast.success('Marks saved successfully!');
      router.push('/exams');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Failed to save marks. Please try again.');
    },
  });

  const isPageLoading = examLoading || enrollmentsLoading;

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <PageHeader
        title={exam?.name ?? 'Marks Entry'}
        description={
          exam
            ? `Batch: ${exam.batch?.name ?? '—'} · ${new Date(exam.examDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
            : 'Use Tab / Enter to navigate between cells rapidly'
        }
      >
        {/* Actions in children slot */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/exams')}
          aria-label="Go back to exams list"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
        <Button
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || isPageLoading}
          aria-label="Save marks"
        >
          {saveMutation.isPending
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Save className="h-3.5 w-3.5" />
          }
          {saveMutation.isPending ? 'Saving...' : 'Save Marks'}
        </Button>
      </PageHeader>

      {/* Marks Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        {/* Sticky-header scrollable table */}
        <div className="overflow-auto max-h-[calc(100vh-220px)]">
          {isPageLoading ? (
            <div className="py-20">
              <Loading variant="card" text="Loading exam data..." />
            </div>
          ) : enrollments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-slate-900">No students enrolled</p>
              <p className="text-xs text-slate-500 mt-1">This batch has no active enrollments.</p>
            </div>
          ) : (
            <Table aria-label={`Marks entry for ${exam?.name ?? 'exam'}`}>
              <TableHeader className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_#E2E8F0]">
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <TableHead key={header.id}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map(row => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer hint */}
        {!isPageLoading && enrollments.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50/60">
            <p className="text-xs text-slate-400">
              {enrollments.length} student{enrollments.length !== 1 ? 's' : ''} · Use{' '}
              <kbd className="px-1 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded">Tab</kbd>
              {' '}or{' '}
              <kbd className="px-1 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded">Enter</kbd>
              {' '}to move between cells
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
