'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UpdateStudentSchema } from '@nkc/shared-types';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import { ArrowLeft, User, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';

import { Loading } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function EditStudentPage() {
  const router = useRouter();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<z.input<typeof UpdateStudentSchema>>({
    resolver: zodResolver(UpdateStudentSchema),
  });

  useEffect(() => {
    apiClient.get(`/students/${id}`).then(res => {
      const student = res.data;
      form.reset({
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        email: student.email || '',
        phone: student.phone || '',
        dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] as any : '',
        gender: student.gender || 'MALE',
        bloodGroup: student.bloodGroup || 'O_POS',
        address: student.address || '',
        aadharNumber: student.aadharNumber || '',
        admissionDate: student.admissionDate ? new Date(student.admissionDate).toISOString().split('T')[0] as any : '',
        previousSchool: student.previousSchool || '',
        isHosteler: student.isHosteler || false,
        discountPercent: student.discountPercent || 0,
        paymentType: student.paymentType || 'LUMP_SUM',
      });
      setCurrentPhotoUrl(student.photoUrl || '');
      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      setIsLoading(false);
    });
  }, [id, form]);

  const onSubmit = async (data: any) => {
    try {
      setIsUploading(true);
      let photoUrl = currentPhotoUrl;
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `photo-${Date.now()}.${fileExt}`;
        const filePath = `students/temp-photos/${fileName}`;

        const { error: photoUploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, photoFile);

        if (photoUploadError) throw photoUploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);
          
        photoUrl = publicUrl;
      }

      const payload = { ...data };
      if (!payload.dob || payload.dob === '' || Number.isNaN(new Date(payload.dob).getTime())) delete payload.dob;
      if (!payload.admissionDate || payload.admissionDate === '' || Number.isNaN(new Date(payload.admissionDate).getTime())) delete payload.admissionDate;
      if (!payload.phone || payload.phone === '') payload.phone = undefined;
      if (!payload.aadharNumber || payload.aadharNumber === '') payload.aadharNumber = undefined;
      
      payload.photoUrl = photoUrl || undefined;

      await apiClient.patch(`/students/${id}`, payload);
      await queryClient.invalidateQueries({ queryKey: ['student', id] });
      router.push(`/students/${id}`);
    } catch (error) {
      console.error('Failed to update student:', error);
      setIsUploading(false);
      toast.error('Failed to update student. Please check inputs.');
    }
  };

  if (isLoading) return <Loading variant="page" text="Loading student details..." />;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Student</h1>
          <p className="text-muted-foreground">Update student personal and academic records</p>
        </div>
      </div>

      <Card className="border-0 shadow-lg bg-white/50 backdrop-blur-xl dark:bg-slate-900/50 ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b">
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Personal Details
          </CardTitle>
          <CardDescription>Make changes to the student's primary information.</CardDescription>
        </CardHeader>
        
        <CardContent className="p-6">
          <form id="edit-student-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" className="bg-white dark:bg-slate-950" {...form.register('firstName')} />
                {form.formState.errors.firstName && <span className="text-xs text-red-500 font-medium">{form.formState.errors.firstName.message}</span>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" className="bg-white dark:bg-slate-950" {...form.register('lastName')} />
                {form.formState.errors.lastName && <span className="text-xs text-red-500 font-medium">{form.formState.errors.lastName.message}</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" className="bg-white dark:bg-slate-950" {...form.register('email')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" className="bg-white dark:bg-slate-950" {...form.register('phone')} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input type="date" id="dob" className="bg-white dark:bg-slate-950" {...form.register('dob', { valueAsDate: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aadharNumber">Aadhar Number</Label>
                <Input id="aadharNumber" className="bg-white dark:bg-slate-950" {...form.register('aadharNumber')} />
              </div>
              
              <div className="space-y-2">
                <Label>Gender</Label>
                <Controller
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <SelectTrigger className="bg-white dark:bg-slate-950">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>Blood Group</Label>
                <Controller
                  control={form.control}
                  name="bloodGroup"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <SelectTrigger className="bg-white dark:bg-slate-950">
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A_POS">A+</SelectItem>
                        <SelectItem value="O_POS">O+</SelectItem>
                        <SelectItem value="B_POS">B+</SelectItem>
                        <SelectItem value="AB_POS">AB+</SelectItem>
                        <SelectItem value="A_NEG">A-</SelectItem>
                        <SelectItem value="O_NEG">O-</SelectItem>
                        <SelectItem value="B_NEG">B-</SelectItem>
                        <SelectItem value="AB_NEG">AB-</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-dashed">
              <div className="space-y-2">
                <Label htmlFor="admissionDate">Admission Date</Label>
                <Input type="date" id="admissionDate" className="bg-white dark:bg-slate-950" {...form.register('admissionDate', { valueAsDate: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="previousSchool">Previous School (if any)</Label>
                <Input id="previousSchool" className="bg-white dark:bg-slate-950" {...form.register('previousSchool')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Residential Address</Label>
              <Input id="address" className="bg-white dark:bg-slate-950" {...form.register('address')} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-dashed">
              <div className="space-y-2">
                <Label htmlFor="discountPercent">Fee Discount (%)</Label>
                <Input type="number" id="discountPercent" className="bg-white dark:bg-slate-950" {...form.register('discountPercent', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Payment Type</Label>
                <Controller
                  control={form.control}
                  name="paymentType"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value as string}>
                      <SelectTrigger className="bg-white dark:bg-slate-950">
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LUMP_SUM">Lump Sum (Full Payment)</SelectItem>
                        <SelectItem value="INSTALLMENT">Installments</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-dashed">
              <Controller
                control={form.control}
                name="isHosteler"
                render={({ field }) => (
                  <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-white dark:bg-slate-950 max-w-md">
                    <input
                      type="checkbox"
                      className="h-4 w-4 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      checked={!!field.value}
                      onChange={field.onChange}
                    />
                    <div className="space-y-1 leading-none">
                      <Label className="cursor-pointer" onClick={() => field.onChange(!field.value)}>Opt-in for Hostel & Mess</Label>
                      <p className="text-sm text-muted-foreground">
                        Hostel and mess fees will be applied to this student.
                      </p>
                    </div>
                  </div>
                )}
              />
            </div>

            <div className="pt-4 border-t border-dashed">
              <div className="p-6 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center justify-center text-center border-dashed gap-2 max-w-md">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
                  {photoFile ? (
                    <img src={URL.createObjectURL(photoFile)} alt="Preview" className="w-full h-full object-cover" />
                  ) : currentPhotoUrl ? (
                    <img src={currentPhotoUrl} alt="Current Profile" className="w-full h-full object-cover" />
                  ) : (
                    <FileText className="w-6 h-6 text-primary" />
                  )}
                </div>
                <h4 className="font-semibold text-sm">Update Student Photo</h4>
                <p className="text-xs text-muted-foreground max-w-sm mb-2">Upload a recent passport-sized photograph (Max 5MB). Allowed formats: JPG, PNG.</p>
                <Input 
                  type="file" 
                  id="photo" 
                  accept="image/*" 
                  className="max-w-[250px] cursor-pointer"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

          </form>
        </CardContent>
        
        <CardFooter className="flex justify-end border-t bg-slate-50/30 dark:bg-slate-900/30 p-6">
          <Button 
            type="submit" 
            form="edit-student-form" 
            disabled={form.formState.isSubmitting || isUploading}
            className="w-[180px]"
          >
            {form.formState.isSubmitting || isUploading ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
