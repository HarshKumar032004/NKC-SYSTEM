'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreateStudentSchema, type CreateStudentDto } from '@nkc/shared-types';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import { CheckCircle2, ChevronRight, GraduationCap, User, Users, FileText, Upload, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Loading } from '@/components/ui/loading';

const STEPS = [
  { id: 1, name: 'Personal Details', icon: User },
  { id: 2, name: 'Guardians', icon: Users },
  { id: 3, name: 'Academic & Allocation', icon: GraduationCap },
  { id: 4, name: 'Finance & Hostel', icon: FileText },
  { id: 5, name: 'Documents', icon: FileText },
];



function NewStudentPageContent() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const activeBranchId = useAuthStore((state) => state.activeBranchId);
  const [branches, setBranches] = useState<{id: string, name: string}[]>([]);
  const [batches, setBatches] = useState<{id: string, name: string}[]>([]);
  const [feeStructures, setFeeStructures] = useState<{id: string, name: string, totalAmount: number}[]>([]);
  const [documents, setDocuments] = useState<{ file: File; name: string }[]>([]);
  const [currentDocType, setCurrentDocType] = useState('Aadhar Card');
  const [isUploading, setIsUploading] = useState(false);

  const searchParams = useSearchParams();
  const leadId = searchParams.get('leadId');
  const nameParam = searchParams.get('name') || '';
  const phoneParam = searchParams.get('phone') || '';
  const emailParam = searchParams.get('email') || '';

  const nameParts = nameParam.split(' ');
  const initialFirstName = nameParts[0] || '';
  const initialLastName = nameParts.slice(1).join(' ') || '';

  useEffect(() => {
    apiClient.get('/operations/branches').then(res => setBranches(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (activeBranchId) {
      apiClient.get(`/operations/batches?branchId=${activeBranchId}`).then(res => setBatches(res.data)).catch(console.error);
      apiClient.get(`/fees/structures?branchId=${activeBranchId}`).then(res => setFeeStructures(res.data)).catch(console.error);
    }
  }, [activeBranchId]);

  const form = useForm<z.input<typeof CreateStudentSchema>, any, z.infer<typeof CreateStudentSchema>>({
    resolver: zodResolver(CreateStudentSchema),
    defaultValues: {
      firstName: initialFirstName,
      lastName: initialLastName,
      gender: 'MALE',
      bloodGroup: 'O_POS',
      branchId: activeBranchId || '',
      guardians: [
        { name: '', relationship: 'Father', phone: '', email: '', occupation: '', isPrimary: true },
        { name: '', relationship: 'Mother', phone: '', email: '', occupation: '', isPrimary: false },
      ],
      batchId: '',
      email: emailParam,
      phone: phoneParam,
      aadharNumber: '',
      admissionDate: new Date(),
      previousSchool: '',
      isHosteler: false,
      discountPercent: 0,
      paymentType: 'LUMP_SUM',
      leadId: leadId || undefined,
    },
  });

  const { fields: guardianFields, append: appendGuardian, remove: removeGuardian } = useFieldArray({
    control: form.control,
    name: 'guardians',
  });

  const onSubmit = async (data: z.infer<typeof CreateStudentSchema>) => {
    try {
      setIsUploading(true);
      // Create Student
      const res = await apiClient.post('/students', data);
      const studentId = res.data.id;

      // Upload Documents
      if (documents.length > 0) {
        await Promise.all(documents.map(async (doc) => {
          try {
            // Get Presigned URL
            const urlRes = await apiClient.post(`/students/${studentId}/upload-url`, {
              fileName: `${doc.name} - ${doc.file.name}`,
              mimeType: doc.file.type,
              sizeBytes: doc.file.size,
            });

            // Upload directly to R2
            await fetch(urlRes.data.uploadUrl, {
              method: 'PUT',
              body: doc.file,
              headers: { 'Content-Type': doc.file.type },
            });
          } catch (e) {
            console.error(`Failed to upload ${doc.name}:`, e);
            // We ignore individual document failures so admission isn't completely blocked
          }
        }));
      }

      router.push(`/students/${studentId}`);
    } catch (error) {
      console.error('Failed to create student:', error);
      setIsUploading(false);
      // Fallback
      router.push('/students');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Student Admission</h1>
        <p className="text-muted-foreground">Register a new student into the system</p>
      </div>

      {/* Modern Stepper UI */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full z-0"></div>
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full z-0 transition-all duration-500 ease-in-out" 
            style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
          ></div>
          
          {STEPS.map((s) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${
                  step > s.id ? 'bg-primary border-primary text-primary-foreground' :
                  step === s.id ? 'bg-background border-primary text-primary' :
                  'bg-background border-slate-200 text-slate-400 dark:border-slate-800'
                }`}
              >
                {step > s.id ? <CheckCircle2 className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
              </div>
              <span className={`text-xs font-medium ${step >= s.id ? 'text-primary' : 'text-muted-foreground'}`}>
                {s.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Card className="border-0 shadow-lg bg-white/50 backdrop-blur-xl dark:bg-slate-900/50 ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b">
          <CardTitle className="flex items-center gap-2">
            {STEPS[step - 1].icon && (() => {
              const Icon = STEPS[step - 1].icon;
              return <Icon className="w-5 h-5 text-primary" />;
            })()}
            {STEPS[step - 1].name}
          </CardTitle>
          <CardDescription>Please fill in all required fields accurately.</CardDescription>
        </CardHeader>
        
        <CardContent className="p-6">
          <form id="student-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* STEP 1 */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
                    <Input id="firstName" placeholder="Rahul" className="bg-white dark:bg-slate-950" {...form.register('firstName')} />
                    {form.formState.errors.firstName && <span className="text-xs text-red-500 font-medium">{form.formState.errors.firstName.message}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
                    <Input id="lastName" placeholder="Sharma" className="bg-white dark:bg-slate-950" {...form.register('lastName')} />
                    {form.formState.errors.lastName && <span className="text-xs text-red-500 font-medium">{form.formState.errors.lastName.message}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="student@example.com" className="bg-white dark:bg-slate-950" {...form.register('email')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" placeholder="+91 9876543210" className="bg-white dark:bg-slate-950" {...form.register('phone')} />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth <span className="text-red-500">*</span></Label>
                    <Input type="date" id="dob" className="bg-white dark:bg-slate-950" {...form.register('dob')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aadharNumber">Aadhar Number</Label>
                    <Input id="aadharNumber" placeholder="1234 5678 9012" className="bg-white dark:bg-slate-950" {...form.register('aadharNumber')} />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Controller
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                {guardianFields.map((field, index) => (
                  <div key={field.id} className="p-5 border bg-slate-50/50 dark:bg-slate-900/30 rounded-xl space-y-4 relative group hover:border-primary/50 transition-colors">
                    {index > 0 && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity" 
                        onClick={() => removeGuardian(index)}
                      >
                        Remove
                      </Button>
                    )}
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center">
                        {index + 1}
                      </span>
                      {index === 0 ? 'Primary Guardian' : 'Additional Guardian'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="space-y-2">
                        <Label>Full Name <span className="text-red-500">*</span></Label>
                        <Input className="bg-white dark:bg-slate-950" {...form.register(`guardians.${index}.name` as const)} placeholder="Guardian Name" />
                      </div>
                      <div className="space-y-2">
                        <Label>Relationship <span className="text-red-500">*</span></Label>
                        <Input className="bg-white dark:bg-slate-950" {...form.register(`guardians.${index}.relationship` as const)} placeholder="e.g. Father, Mother" />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number <span className="text-red-500">*</span></Label>
                        <Input className="bg-white dark:bg-slate-950" {...form.register(`guardians.${index}.phone` as const)} placeholder="+91 9876543210" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" className="bg-white dark:bg-slate-950" {...form.register(`guardians.${index}.email` as const)} placeholder="Guardian Email (optional)" />
                      </div>
                      <div className="space-y-2">
                        <Label>Occupation</Label>
                        <Input className="bg-white dark:bg-slate-950" {...form.register(`guardians.${index}.occupation` as const)} placeholder="e.g. Engineer, Business" />
                      </div>
                    </div>
                  </div>
                ))}
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full border-dashed border-2 hover:bg-primary/5 hover:text-primary hover:border-primary"
                  onClick={() => appendGuardian({ name: '', relationship: '', phone: '', email: '', occupation: '', isPrimary: false })}
                >
                  + Add Another Guardian
                </Button>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="admissionDate">Admission Date</Label>
                    <Input type="date" id="admissionDate" className="bg-white dark:bg-slate-950" {...form.register('admissionDate', { valueAsDate: true })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="previousSchool">Previous School (if any)</Label>
                    <Input id="previousSchool" placeholder="St. Xavier's High School" className="bg-white dark:bg-slate-950" {...form.register('previousSchool')} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="batchId">Course / Batch Allocation <span className="text-red-500">*</span></Label>
                    <Controller
                      control={form.control}
                      name="batchId"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger className="bg-white dark:bg-slate-950">
                            <SelectValue placeholder="Select an academic batch" />
                          </SelectTrigger>
                          <SelectContent>
                            {batches.map(batch => (
                              <SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>
                            ))}
                            {batches.length === 0 && (
                              <SelectItem value="none" disabled>No batches found</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Batch allocations automatically determine base curriculum subjects.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Residential Address</Label>
                  <Input id="address" className="bg-white dark:bg-slate-950" placeholder="123 Main Street, City" {...form.register('address')} />
                </div>
                
                <div className="p-6 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center justify-center text-center border-dashed gap-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="font-semibold text-sm">Upload Student Photo</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mb-2">Upload a recent passport-sized photograph (Max 5MB). Allowed formats: JPG, PNG.</p>
                  <Input type="file" id="photo" accept="image/*" className="max-w-[250px] cursor-pointer" />
                </div>
              </div>
            )}

            {/* STEP 4: Finance & Hostel */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Controller
                    control={form.control}
                    name="isHosteler"
                    render={({ field }) => (
                      <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-white dark:bg-slate-950">
                        <input
                          type="checkbox"
                          className="h-4 w-4 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                          checked={field.value}
                          onChange={field.onChange}
                        />
                        <div className="space-y-1 leading-none">
                          <Label>Opt-in for Hostel & Mess</Label>
                          <p className="text-sm text-muted-foreground">
                            Hostel and mess fees will be automatically applied to this student.
                          </p>
                        </div>
                      </div>
                    )}
                  />

                  <div className="space-y-2">
                    <Label>Payment Type</Label>
                    <Controller
                      control={form.control}
                      name="paymentType"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                <div className="space-y-2">
                  <Label>Applicable Fee Structures (Required)</Label>
                  <Controller
                    control={form.control}
                    name="feeStructureIds"
                    render={({ field }) => (
                      <MultiSelect
                        options={feeStructures.map(f => ({
                          label: `${f.name} (Rs. ${(f.totalAmount/100).toLocaleString()})`,
                          value: f.id
                        }))}
                        onChange={field.onChange}
                        selected={field.value || []}
                        placeholder="Select fee structures..."
                      />
                    )}
                  />
                  {form.formState.errors.feeStructureIds && (
                    <p className="text-sm text-red-500">{form.formState.errors.feeStructureIds.message as string}</p>
                  )}
                </div>

                <div className="space-y-2 max-w-sm">
                  <Label htmlFor="discountPercent">Fee Discount (%)</Label>
                  <Controller
                    control={form.control}
                    name="discountPercent"
                    render={({ field }) => (
                      <Input 
                        id="discountPercent" 
                        type="number" 
                        placeholder="e.g. 10" 
                        className="bg-white dark:bg-slate-950" 
                        min="0"
                        max="100"
                        value={(field.value as string | number) || ''}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} 
                      />
                    )}
                  />
                  <p className="text-xs text-muted-foreground">Provide scholarship discount percentage if applicable.</p>
                </div>
              </div>
            )}

            {/* STEP 5: Documents */}
            {step === 5 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="p-5 border rounded-xl bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-sm">Upload Academic Documents</h4>
                      <p className="text-xs text-muted-foreground">Attach necessary documents like Aadhar, Marksheets, or TC.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 items-end">
                    <div className="space-y-2 flex-1">
                      <Label>Document Type</Label>
                      <Select value={currentDocType} onValueChange={setCurrentDocType}>
                        <SelectTrigger className="bg-white dark:bg-slate-950">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Aadhar Card">Aadhar Card</SelectItem>
                          <SelectItem value="10th Marksheet">10th Marksheet</SelectItem>
                          <SelectItem value="12th Marksheet">12th Marksheet</SelectItem>
                          <SelectItem value="Transfer Certificate">Transfer Certificate (TC)</SelectItem>
                          <SelectItem value="Migration Certificate">Migration Certificate</SelectItem>
                          <SelectItem value="Character Certificate">Character Certificate</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 flex-1">
                      <Label>Select File</Label>
                      <Input 
                        type="file" 
                        id="doc-file-input" 
                        className="bg-white dark:bg-slate-950 cursor-pointer" 
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                      />
                    </div>
                    <Button 
                      type="button" 
                      onClick={() => {
                        const fileInput = document.getElementById('doc-file-input') as HTMLInputElement;
                        const file = fileInput.files?.[0];
                        if (file) {
                          setDocuments(prev => [...prev, { file, name: currentDocType }]);
                          fileInput.value = ''; // reset input
                        }
                      }}
                    >
                      <Upload className="w-4 h-4 mr-2" /> Add
                    </Button>
                  </div>
                  
                  {documents.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <Label>Selected Documents</Label>
                      <div className="space-y-2">
                        {documents.map((doc, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-slate-950 rounded-lg border">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                              <div className="flex flex-col truncate">
                                <span className="text-sm font-medium truncate">{doc.name}</span>
                                <span className="text-xs text-muted-foreground truncate">{doc.file.name} ({(doc.file.size / 1024).toFixed(1)} KB)</span>
                              </div>
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                              onClick={() => setDocuments(prev => prev.filter((_, i) => i !== idx))}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        </CardContent>
        
        <CardFooter className="flex justify-between border-t bg-slate-50/30 dark:bg-slate-900/30 p-6">
          <Button 
            type="button"
            variant="outline" 
            onClick={() => setStep(s => Math.max(1, s - 1))} 
            disabled={step === 1}
            className="w-[100px]"
          >
            Back
          </Button>
          
          {step < STEPS.length ? (
            <Button 
              type="button" 
              onClick={() => setStep(s => Math.min(STEPS.length, s + 1))}
              className="w-[120px] gap-1"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button 
              type="submit" 
              form="student-form" 
              disabled={form.formState.isSubmitting}
              className="w-[180px] bg-green-600 hover:bg-green-700 text-white"
            >
              {form.formState.isSubmitting ? 'Saving...' : 'Complete Admission'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export default function NewStudentPage() {
  return (
    <Suspense fallback={<Loading variant="page" text="Loading form..." />}>
      <NewStudentPageContent />
    </Suspense>
  );
}
