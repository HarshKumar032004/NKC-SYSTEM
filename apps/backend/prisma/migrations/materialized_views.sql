-- =========================================================================
-- Phase 12: Materialized Views for Reporting & Analytics
-- =========================================================================

-- 1. Branch Financial Summary
-- Aggregates fee transactions per branch, grouping by month.
DROP MATERIALIZED VIEW IF EXISTS mv_branch_financial_summary;
CREATE MATERIALIZED VIEW mv_branch_financial_summary AS
SELECT 
    branch_id,
    DATE_TRUNC('month', created_at) AS month,
    COUNT(id) AS total_transactions,
    SUM(amount) AS total_collected
FROM 
    payment_transactions
WHERE 
    status = 'SUCCESS'
GROUP BY 
    branch_id, DATE_TRUNC('month', created_at);

-- Unique index required to allow REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX idx_mv_financial_summary ON mv_branch_financial_summary (branch_id, month);


-- 2. Academic Funnel
-- Aggregates leads grouped by source and status.
DROP MATERIALIZED VIEW IF EXISTS mv_academic_funnel;
CREATE MATERIALIZED VIEW mv_academic_funnel AS
SELECT 
    branch_id,
    source,
    status,
    COUNT(id) AS lead_count
FROM 
    leads
GROUP BY 
    branch_id, source, status;

CREATE UNIQUE INDEX idx_mv_academic_funnel ON mv_academic_funnel (branch_id, source, status);


-- 3. Attendance Trends
-- Aggregates batch-wise attendance percentages.
DROP MATERIALIZED VIEW IF EXISTS mv_attendance_trends;
CREATE MATERIALIZED VIEW mv_attendance_trends AS
SELECT 
    branch_id,
    batch_id,
    DATE_TRUNC('week', date) AS week,
    COUNT(id) AS total_records,
    SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) AS present_count,
    SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) AS absent_count
FROM 
    attendance_records
GROUP BY 
    branch_id, batch_id, DATE_TRUNC('week', date);

CREATE UNIQUE INDEX idx_mv_attendance_trends ON mv_attendance_trends (branch_id, batch_id, week);
