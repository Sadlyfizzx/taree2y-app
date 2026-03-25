const DEMO_RUNTIME_MODES = new Set(['demo', 'local', 'mock', 'offline', 'qa']);

export function normalizeRuntimeMode(runtimeMode = 'supabase') {
  const safe = String(runtimeMode || '').trim().toLowerCase();
  return safe || 'supabase';
}

export function isDemoRuntimeRequested(runtimeMode = 'supabase') {
  return DEMO_RUNTIME_MODES.has(normalizeRuntimeMode(runtimeMode));
}

export function isDemoRuntimeEnabled(_runtimeMode = 'supabase') {
  return false;
}

export function isBackendAuthoritativeRuntime(_runtimeMode = 'supabase') {
  return true;
}

export function getRuntimeAuthority(runtimeMode = 'supabase') {
  const normalizedMode = normalizeRuntimeMode(runtimeMode);

  return {
    mode: normalizedMode,
    demoRuntimeRequested: isDemoRuntimeRequested(normalizedMode),
    demoRuntimeEnabled: false,
    backendAuthoritative: true,
  };
}
