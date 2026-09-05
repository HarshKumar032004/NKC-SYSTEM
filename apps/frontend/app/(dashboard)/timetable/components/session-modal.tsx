'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const sessionSchema = z.object({
  batchId: z.string().min(1, 'Batch is required'),
  teacherId: z.string().min(1, 'Teacher is required'),
  roomId: z.string().min(1, 'Room is required'),
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'),
}).refine(data => data.startTime < data.endTime, {
  message: 'Start time must be before end time',
  path: ['endTime']
});

type SessionFormValues = z.infer<typeof sessionSchema>;

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session?: any;
}

export function SessionModal({ isOpen, onClose, session }: SessionModalProps) {
  const queryClient = useQueryClient();
  const activeBranchId = useAuthStore(s => s.activeBranchId);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Fetch dropdown data (Batches, Teachers, Rooms)
  const { data: batches = [] } = useQuery({
    queryKey: ['batches', activeBranchId],
    queryFn: async () => (await apiClient.get('/operations/batches', { params: { branchId: activeBranchId } })).data,
    enabled: !!activeBranchId,
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers', activeBranchId],
    queryFn: async () => (await apiClient.get('/hr/teachers', { params: { branchId: activeBranchId } })).data,
    enabled: !!activeBranchId,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms', activeBranchId],
    queryFn: async () => (await apiClient.get('/operations/rooms')).data,
    enabled: !!activeBranchId,
  });

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      batchId: '',
      teacherId: '',
      roomId: '',
      dayOfWeek: 'MONDAY',
      startTime: '09:00',
      endTime: '10:00',
    },
  });

  useEffect(() => {
    if (session) {
      form.reset({
        batchId: session.batchId,
        teacherId: session.teacherId,
        roomId: session.roomId,
        dayOfWeek: session.dayOfWeek,
        startTime: session.startTime,
        endTime: session.endTime,
      });
    } else {
      form.reset({
        batchId: '',
        teacherId: '',
        roomId: '',
        dayOfWeek: 'MONDAY',
        startTime: '09:00',
        endTime: '10:00',
      });
    }
    setConflictError(null);
  }, [session, isOpen, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: SessionFormValues) => {
      if (session) {
        return apiClient.put(`/timetable/${session.id}`, data);
      } else {
        return apiClient.post('/timetable', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable-sessions'] });
      onClose();
    },
    onError: (err: any) => {
      if (err.response?.status === 409) {
        setConflictError(err.response.data.message);
      } else {
        setConflictError('An unexpected error occurred while saving the schedule.');
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiClient.delete(`/timetable/${session.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable-sessions'] });
      onClose();
    }
  });

  const onSubmit = (data: SessionFormValues) => {
    setConflictError(null);
    saveMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{session ? 'Edit Session' : 'Create Session'}</DialogTitle>
        </DialogHeader>

        {conflictError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
            <strong>Conflict Detected:</strong> {conflictError}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="batchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {batches.length > 0 ? (
                          batches.map((b: any) => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                          ))
                        ) : (
                          <SelectItem value="empty" disabled>No batches found</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="teacherId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teacher</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teachers.length > 0 ? (
                          teachers.map((t: any) => (
                            <SelectItem key={t.user?.id || t.id} value={t.user?.id || t.id}>
                              {t.user?.email || 'Unknown Teacher'}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="empty" disabled>No teachers found</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="roomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {rooms.map((r: any) => (
                          <SelectItem key={r.id} value={r.id}>{r.name} (Cap: {r.capacity})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dayOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-between pt-4">
              {session ? (
                <Button type="button" variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                  Delete
                </Button>
              ) : <div></div>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : 'Save Session'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
