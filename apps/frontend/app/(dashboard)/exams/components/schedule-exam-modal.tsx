'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const subjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required'),
  maxMarks: z.coerce.number().min(1, 'Max marks must be > 0'),
  passingMarks: z.coerce.number().min(0, 'Passing marks cannot be negative'),
});

const formSchema = z.object({
  name: z.string().min(1, 'Exam name is required'),
  batchId: z.string().min(1, 'Batch is required'),
  examDate: z.string().min(1, 'Exam date is required'),
  invigilatorId: z.string().optional(),
  subjects: z.array(subjectSchema).min(1, 'At least one subject is required'),
});

type FormValues = z.infer<typeof formSchema>;

interface ScheduleExamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScheduleExamModal({ isOpen, onClose }: ScheduleExamModalProps) {
  const activeBranchId = useAuthStore(s => s.activeBranchId);
  const queryClient = useQueryClient();

  const { data: batches = [] } = useQuery({
    queryKey: ['batches', activeBranchId],
    queryFn: async () => (await apiClient.get('/operations/batches', { params: { branchId: activeBranchId } })).data,
    enabled: !!activeBranchId && isOpen,
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers', activeBranchId],
    queryFn: async () => (await apiClient.get('/hr/teachers', { params: { branchId: activeBranchId } })).data,
    enabled: !!activeBranchId && isOpen,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: '',
      batchId: '',
      examDate: '',
      invigilatorId: '',
      subjects: [{ name: '', maxMarks: 100, passingMarks: 35 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'subjects',
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      await apiClient.post('/exams', values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams', activeBranchId] });
      toast.success('Exam scheduled successfully!');
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'Failed to schedule exam. Please try again.');
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule New Exam</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Midterm Exams" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="examDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="batchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {batches.map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="invigilatorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invigilator (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teachers.length > 0 ? (
                          teachers.map((t: any) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
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

            <div className="border-t border-slate-200 pt-5 mt-2">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Subjects</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Define subjects and their marks breakdown</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ name: '', maxMarks: 100, passingMarks: 35 })}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Subject
                </Button>
              </div>

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-end gap-4 p-4 border border-slate-200 rounded-lg relative group bg-slate-50/80">
                    <FormField
                      control={form.control as any}
                      name={`subjects.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Subject Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Mathematics" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control as any}
                      name={`subjects.${index}.maxMarks`}
                      render={({ field }) => (
                        <FormItem className="w-24">
                          <FormLabel>Max Marks</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control as any}
                      name={`subjects.${index}.passingMarks`}
                      render={({ field }) => (
                        <FormItem className="w-28">
                          <FormLabel>Passing Marks</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} isLoading={mutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" isLoading={mutation.isPending}>
                Schedule Exam
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
