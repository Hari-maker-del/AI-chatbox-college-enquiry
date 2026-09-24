-- Least-privilege grants for the new public API objects
GRANT SELECT ON public.knowledge_base TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_base TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT SELECT ON public.ai_usage_events TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_ai_rate_limit(UUID, INTEGER, INTEGER) TO authenticated, service_role;
