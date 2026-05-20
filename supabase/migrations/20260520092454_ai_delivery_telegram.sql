-- Trading AI — replace the "email" delivery channel of the AI monitoring
-- with "telegram". Existing rows with delivery = 'email' are migrated in
-- place by the enum rename; new rows default to telegram.

alter type public.ai_delivery rename value 'email' to 'telegram';

alter table public.ai_monitoring_config
  alter column delivery set default 'telegram';
