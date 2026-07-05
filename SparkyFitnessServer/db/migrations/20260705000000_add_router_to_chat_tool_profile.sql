-- Add 'router' to the chat_tool_profile CHECK. 'router' runs a per-message LLM
-- pre-pass that exposes only the relevant tool domains (offered only for
-- Ollama, alongside 'full' and 'core'). Drop and re-add the named constraint
-- (the original inline CHECK is auto-named ai_service_settings_chat_tool_profile_check).
ALTER TABLE public.ai_service_settings
  DROP CONSTRAINT IF EXISTS ai_service_settings_chat_tool_profile_check;
ALTER TABLE public.ai_service_settings
  ADD CONSTRAINT ai_service_settings_chat_tool_profile_check
  CHECK (chat_tool_profile IN ('full', 'core', 'router'));
