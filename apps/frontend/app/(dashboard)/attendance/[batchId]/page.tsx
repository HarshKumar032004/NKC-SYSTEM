'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loading } from '@/components/ui/loading';

export default function RapidFireAttendancePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const batchId = params.batchId as string;
  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];
  
  const activeBranchId = useAuthStore(s => s.activeBranchId);
  const [date, setDate] = useState(dateParam);

  // Local state for tracking attendance in memory
  const [records, setRecords] = useState<Record<string, string>>({});
  
  // Reset records when date changes
  useEffect(() => {
    setRecords({});
  }, [date]);
  
  // To handle rapid fire, we need a "focused" index
  const [focusedIndex, setFocusedIndex] = useState(0);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  // Fetch Batch Enrolled Students - use the students/enrollments endpoint
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['enrollments', batchId, activeBranchId],
    queryFn: async () => {
      const res = await apiClient.get(`/students/enrollments/batch/${batchId}`, {
        params: { status: 'ACTIVE', branchId: activeBranchId }
      });
      return res.data;
    },
    enabled: !!batchId && !!activeBranchId,
  });

  // Fetch Existing Attendance for this date (if any) to prefill
  const { data: existingRecords = [], isLoading: existingLoading } = useQuery({
    queryKey: ['attendance-records', batchId, date, activeBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/attendance/records', {
        params: { batchId, date, branchId: activeBranchId }
      });
      return res.data;
    },
    enabled: !!batchId && !!date && !!activeBranchId,
  });

  // Sync existing to local state once loaded
  useEffect(() => {
    if (existingRecords.length > 0) {
      const map: Record<string, string> = {};
      existingRecords.forEach((r: any) => {
        map[r.studentId] = r.status;
      });
      setRecords(map);
    } else {
      setRecords({});
    }
  }, [existingRecords]);

  // Global keydown listener for Rapid-Fire Entry
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is typing in an input, don't intercept
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (enrollments.length === 0) return;

      const currentStudent = enrollments[focusedIndex];
      if (!currentStudent) return;

      const markStatus = (status: string) => {
        setRecords(prev => ({ ...prev, [currentStudent.student.id]: status }));
        // Move to next student
        if (focusedIndex < enrollments.length - 1) {
          setFocusedIndex(focusedIndex + 1);
        }
      };

      switch (e.key.toLowerCase()) {
        case 'p':
          markStatus('PRESENT');
          break;
        case 'a':
          markStatus('ABSENT');
          break;
        case 'l':
          markStatus('LATE');
          break;
        case 'e':
          markStatus('EXCUSED');
          break;
        case 'arrowdown':
          if (focusedIndex < enrollments.length - 1) setFocusedIndex(focusedIndex + 1);
          break;
        case 'arrowup':
          if (focusedIndex > 0) setFocusedIndex(focusedIndex - 1);
          break;
        case 'enter':
          e.preventDefault();
          handleSubmit();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, enrollments]);

  // Auto-scroll to focused row
  useEffect(() => {
    const el = rowRefs.current[focusedIndex];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusedIndex]);

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiClient.post('/attendance/bulk', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records', batchId, date] });
      queryClient.invalidateQueries({ queryKey: ['attendance-rollup', activeBranchId, batchId, date] });
      router.push('/attendance');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to save attendance');
    }
  });

  const handleSubmit = () => {
    // Transform map to array format
    const payloadRecords = enrollments.map((e: any) => ({
      studentId: e.student.id,
      status: records[e.student.id] || 'PRESENT' // Default if skipped
    }));

    saveMutation.mutate({
      batchId,
      date,
      records: payloadRecords
    });
  };

  if (enrollmentsLoading) return <Loading variant="page" text="Loading students..." />;

  return (
    <div className="flex flex-col gap-6 p-6 h-[calc(100vh-80px)]">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rapid-Fire Entry</h1>
          <p className="text-slate-500">Keyboard shortcuts: [P] Present, [A] Absent, [L] Late, [E] Excused, [Enter] Submit</p>
        </div>
        <div className="flex gap-4">
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            className="border rounded p-2" 
          />
          <Button variant="outline" onClick={() => router.push('/attendance')}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : 'Save & Broadcast'}
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-950 p-4 rounded-lg border overflow-y-auto relative">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Enrollment No.</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.map((enrollment: any, idx: number) => {
              const isFocused = idx === focusedIndex;
              const status = records[enrollment.student.id];

              return (
                <TableRow 
                  key={enrollment.student.id}
                  ref={(el) => { rowRefs.current[idx] = el; }}
                  className={`transition-colors ${isFocused ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  onClick={() => setFocusedIndex(idx)}
                >
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell className="font-medium">
                    {enrollment.student.firstName} {enrollment.student.lastName}
                  </TableCell>
                  <TableCell>{enrollment.student.enrollmentNumber}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <StatusBadge type="PRESENT" isActive={status === 'PRESENT'} />
                      <StatusBadge type="ABSENT" isActive={status === 'ABSENT'} />
                      <StatusBadge type="LATE" isActive={status === 'LATE'} />
                      <StatusBadge type="EXCUSED" isActive={status === 'EXCUSED'} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {enrollments.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center p-8 text-slate-500">
                  No active students found in this batch.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StatusBadge({ type, isActive }: { type: string; isActive: boolean }) {
  const getColors = () => {
    switch (type) {
      case 'PRESENT': return isActive ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400';
      case 'ABSENT': return isActive ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400';
      case 'LATE': return isActive ? 'bg-yellow-500 text-white' : 'bg-slate-100 text-slate-400';
      case 'EXCUSED': return isActive ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400';
      default: return 'bg-slate-100 text-slate-400';
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getColors()}`}>
      {type}
    </span>
  );
}
