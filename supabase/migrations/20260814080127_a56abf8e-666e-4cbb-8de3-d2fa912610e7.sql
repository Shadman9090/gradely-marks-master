-- owns_course() is invoked from RLS policies as the calling role, so `authenticated`
-- must hold EXECUTE. It is SECURITY DEFINER with a pinned search_path and only
-- returns a boolean about the caller's own ownership, so this is safe.
GRANT EXECUTE ON FUNCTION public.owns_course(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.owns_course(UUID) FROM PUBLIC, anon;

-- Trigger-only functions stay unreachable by clients.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;