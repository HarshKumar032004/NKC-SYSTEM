'use client';

import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import Link from 'next/link';
import { ScheduleExamModal } from './components/schedule-exam-modal';
import {
  ClipboardList, Search, MoreHorizontal, PenLine, BarChart2, X, Loader2
} from 'lucide-react';

export default function ExamsDashboardPage() {
  const activeBranchId = useAuthStore(s => s.activeBranchId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const { data: exams = [], isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['exams', activeBranchId],
    queryFn: async () => (await apiClient.get('/exams')).data,
    enabled: !!activeBranchId,
    placeholderData: keepPreviousData,
  });

  // ── Client-side filter ──────────────────────────────────────────────────
  const filteredExams = exams.filter((exam: any) => {
    const matchesSearch =
      searchQuery === '' ||
      exam.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.batch?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || exam.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'ALL';

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
  };

  return (
    <div className="flex flex-col gap-6">
      <ScheduleExamModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <PageHeader
        title="Exams & Grading"
        description="Schedule exams, enter marks, and generate result reports"
        actions={[
          {
            label: 'Schedule Exam',
            onClick: () => setIsModalOpen(true),
            icon: <ClipboardList className="h-4 w-4" />,
          },
        ]}
      />

      {/* ── Filter Bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {isFetching && !isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />}
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search exams or batches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 w-56"
          />
        </div>

        {/* Status filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            aria-label="Clear all filters"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}

        {/* Results count */}
        {!isLoading && !isError && (
          <span className="text-xs text-slate-400 ml-auto">
            {filteredExams.length} of {exams.length} exams
          </span>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : isError ? (
          <EmptyState type="error" retry={refetch} />
        ) : filteredExams.length === 0 ? (
          <EmptyState
            type={hasActiveFilters ? 'search' : 'exams'}
            action={
              hasActiveFilters
                ? { label: 'Clear filters', onClick: clearFilters }
                : { label: 'Schedule Exam', onClick: () => setIsModalOpen(true) }
            }
          />
        ) : (
          <Table aria-label="Exams list">
            <TableHeader>
              <TableRow>
                <TableHead>Exam Name</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total Marks</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExams.map((exam: any) => (
                <TableRow key={exam.id}>
                  <TableCell className="font-medium text-slate-900">
                    {exam.name}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {exam.batch?.name ?? <span className="text-slate-400 italic">No batch</span>}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {new Date(exam.examDate).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="text-slate-600 tabular-nums">
                    {exam.totalMarks}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={exam.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${exam.name}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/exams/${exam.id}/marks-entry`}
                            className="flex items-center gap-2"
                          >
                            <PenLine className="h-3.5 w-3.5" />
                            Enter Marks
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/exams/${exam.id}/results`}
                            className="flex items-center gap-2"
                          >
                            <BarChart2 className="h-3.5 w-3.5" />
                            View Results
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
