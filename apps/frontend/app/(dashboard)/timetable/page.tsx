'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { SessionModal } from './components/session-modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loading } from '@/components/ui/loading';
import { toast } from 'sonner';

export default function TimetablePage() {
  const queryClient = useQueryClient();
  const activeBranchId = useAuthStore(s => s.activeBranchId);
  const calendarRef = useRef<FullCalendar>(null);
  
  const [filterType, setFilterType] = useState('ALL');
  const [filterValue, setFilterValue] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Fetch timetable sessions
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['timetable-sessions', activeBranchId],
    queryFn: async () => {
      const res = await apiClient.get('/timetable');
      return res.data;
    },
    enabled: !!activeBranchId,
  });

  // Map to FullCalendar events
  const mapSessionsToEvents = () => {
    return sessions
      .filter((s: any) => {
        if (filterType === 'BATCH' && filterValue && s.batchId !== filterValue) return false;
        if (filterType === 'TEACHER' && filterValue && s.teacherId !== filterValue) return false;
        if (filterType === 'ROOM' && filterValue && s.roomId !== filterValue) return false;
        return true;
      })
      .map((s: any) => {
        const daysMap: Record<string, number> = {
          SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6
        };
        
        return {
          id: s.id,
          title: `${s.batch.name} - ${s.teacher.name || 'Unknown'} (${s.room.name})`,
          startTime: s.startTime,
          endTime: s.endTime,
          daysOfWeek: [daysMap[s.dayOfWeek]],
          extendedProps: s
        };
      });
  };

  const updateSessionMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.put(`/timetable/${data.id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable-sessions'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update session');
      // Revert the event on the calendar visually by refetching
      queryClient.invalidateQueries({ queryKey: ['timetable-sessions'] });
    }
  });

  const handleEventDrop = (info: any) => {
    const { event } = info;
    const daysMapRev = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    
    // Calculate new times
    const startStr = event.start.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const endStr = event.end.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const dayOfWeek = daysMapRev[event.start.getDay()];

    updateSessionMutation.mutate({
      id: event.id,
      dayOfWeek,
      startTime: startStr,
      endTime: endStr
    });
  };

  const handleEventClick = (info: any) => {
    setSelectedEvent(info.event.extendedProps);
    setIsModalOpen(true);
  };

  if (sessionsLoading) return <Loading variant="page" text="Loading Schedule..." />;

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-80px)] p-6">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Timetable</h1>
        
        <div className="flex gap-4">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Sessions</SelectItem>
              <SelectItem value="BATCH">By Batch</SelectItem>
              <SelectItem value="TEACHER">By Teacher</SelectItem>
              <SelectItem value="ROOM">By Room</SelectItem>
            </SelectContent>
          </Select>

          {/* If a filter is selected, we could show another Select for the specific item. Skipping for brevity. */}
          
          <Button onClick={() => { setSelectedEvent(null); setIsModalOpen(true); }}>
            Create Session
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-950 p-4 rounded-lg border overflow-hidden">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          allDaySlot={false}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          events={mapSessionsToEvents()}
          editable={true}
          droppable={true}
          eventDrop={handleEventDrop}
          eventResize={handleEventDrop}
          eventClick={handleEventClick}
          headerToolbar={{
            left: '',
            center: '',
            right: ''
          }}
          dayHeaderFormat={{ weekday: 'long' }}
          height="100%"
        />
      </div>

      <SessionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        session={selectedEvent}
      />
    </div>
  );
}
