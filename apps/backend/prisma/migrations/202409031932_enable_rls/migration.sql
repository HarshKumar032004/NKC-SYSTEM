-- Enable RLS and Tenant Isolation Policies

DO $$
DECLARE
    table_rec RECORD;
BEGIN
    FOR table_rec IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename IN ('Student', 'PaymentTransaction', 'Lead', 'Receipt', 'FeeStructure', 'Exam', 'AuditLog', 'User', 'ExamSubject', 'ExamMarks', 'Attendance', 'Expense', 'Notification', 'Timetable')
    LOOP
        -- 1. Enable RLS on the table
        EXECUTE format('ALTER TABLE "%I" ENABLE ROW LEVEL SECURITY', table_rec.tablename);
        
        -- 2. Drop existing policy if it exists (for idempotency)
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation" ON "%I"', table_rec.tablename);

        -- 3. Create the isolation policy
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = table_rec.tablename AND column_name = 'branch_id'
        ) THEN
            EXECUTE format('
                CREATE POLICY "tenant_isolation" ON "%I" 
                FOR ALL 
                USING (
                    branch_id = (current_setting(''app.current_branch_id'', true))::uuid
                    OR current_setting(''app.bypass_rls'', true) = ''true''
                )
            ', table_rec.tablename);
        END IF;
    END LOOP;
END
$$;
