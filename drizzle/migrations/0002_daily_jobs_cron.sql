create extension if not exists pg_cron;
select cron.schedule('library-daily-jobs', '30 0 * * *', $$select public.process_library_jobs()$$);