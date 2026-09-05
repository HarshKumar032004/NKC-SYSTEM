'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar as CalendarIcon, Clock, Users, ArrowRight, UserCheck } from 'lucide-react';
import { Loading } from '@/components/ui/loading';
import { io, Socket } from 'socket.io-client';
import Link from 'next/link';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTableFilter } from '@/components/ui/data-table-filter';

export default function AttendanceDashboardPage() {
  const queryClient = useQueryClient();
  const activeBranchId = useAuthStore(s => s.activeBranchId);
  const token = useAuthStore(s => s.accessToken);
  const [socket, setSocket] = useState<Socket | null>(null);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Fetch Teacher's Schedule
  const { data: schedule = [], isLoading: scheduleLoading } = useQuery({
    queryKey: ['attendance-schedule', date],
    queryFn: async () => (await apiClient.get('/attendance/schedule', { params: { date } })).data,
    enabled: !!token,
  });

  // Connect WebSocket
  useEffect(() => {
    if (!token || !activeBranchId) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    const newSocket = io(wsUrl, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      newSocket.emit('joinBranch', activeBranchId);
    });

    newSocket.on('attendance.updated', (payload) => {
      // payload = { batchId, date, PRESENT, ABSENT, LATE, TOTAL }
      if (payload.date === date) {
        queryClient.setQueryData(
          ['attendance-rollup', activeBranchId, payload.batchId, date],
          payload
        );
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, activeBranchId, date, queryClient]);

  if (scheduleLoading) return <Loading variant="page" text="Loading Today's Schedule..." />;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Live Attendance Dashboard</h1>
        <input 
          type="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)} 
          className="border rounded p-2" 
        />
      </div>

      <DataTableFilter 
        searchPlaceholder="Search schedule by class or room..."
        onFilterChange={setFilters}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

        {schedule.length === 0 ? (
          <div className="col-span-full p-8 text-center text-muted-foreground border rounded-lg border-dashed">
            You have no classes scheduled for this date.
          </div>
        ) : (
          schedule.filter((session: any) => {
            if (filters.search) {
              const q = filters.search.toLowerCase();
              return session.batch?.name.toLowerCase().includes(q) || session.room?.name.toLowerCase().includes(q);
            }
            return true;
          }).map((session: any) => (
            <SessionAttendanceCard 
              key={session.id} 
              session={session} 
              date={date} 
              branchId={activeBranchId!} 
            />
          ))
        )}
      </div>
    </div>
  );
}

function SessionAttendanceCard({ session, date, branchId }: { session: any, date: string, branchId: string }) {
  const [isLocked, setIsLocked] = useState(true);
  const [lockReason, setLockReason] = useState('Loading...');

  const { data: rollup, isLoading } = useQuery({
    queryKey: ['attendance-rollup', branchId, session.batchId, date],
    queryFn: async () => {
      const res = await apiClient.get('/attendance/rollup', {
        params: { batchId: session.batchId, date, branchId }
      });
      return res.data;
    },
    enabled: !!branchId && !!session.batchId,
  });

  useEffect(() => {
    const checkLock = () => {
      const today = new Date();
      const targetDate = new Date(date);
      
      if (today.toDateString() !== targetDate.toDateString()) {
        setIsLocked(true);
        setLockReason('Can only mark attendance for today.');
        return;
      }

      const parseTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const d = new Date();
        d.setHours(hours, minutes, 0, 0);
        return d;
      };

      const start = parseTime(session.startTime);
      const end = parseTime(session.endTime);
      const endWindow = new Date(end.getTime() + 30 * 60000); // +30 mins

      if (today < start) {
        setIsLocked(true);
        setLockReason(`Unlocks at ${session.startTime}`);
      } else if (today > endWindow) {
        setIsLocked(true);
        setLockReason(`Locked. Window ended at ${endWindow.toTimeString().substring(0,5)}`);
      } else {
        setIsLocked(false);
        setLockReason('Register Unlocked');
      }
    };

    checkLock();
    const interval = setInterval(checkLock, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [date, session]);

  return (
    <Card className={`hover:shadow-md transition-shadow ${isLocked ? 'opacity-80' : 'ring-1 ring-primary'}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{session.batch.name}</CardTitle>
        <div className="text-sm text-muted-foreground flex justify-between">
          <span>{session.room.name}</span>
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {session.startTime} - {session.endTime}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-12"><Loading variant="card" text="Loading attendance rollup..." /></div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-green-50 text-green-700 p-2 rounded">
                Present: <strong>{rollup?.PRESENT || 0}</strong>
              </div>
              <div className="bg-red-50 text-red-700 p-2 rounded">
                Absent: <strong>{rollup?.ABSENT || 0}</strong>
              </div>
              <div className="bg-yellow-50 text-yellow-700 p-2 rounded">
                Late: <strong>{rollup?.LATE || 0}</strong>
              </div>
              <div className="bg-slate-100 text-slate-700 p-2 rounded">
                Total: <strong>{rollup?.TOTAL || 0}</strong>
              </div>
            </div>
            
            <div className="pt-2">
              <Link href={isLocked ? '#' : `/attendance/${session.batchId}?date=${date}`} passHref>
                <Button className="w-full" variant={isLocked ? 'secondary' : 'default'} disabled={isLocked}>
                  {isLocked ? lockReason : 'Take Attendance'}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
