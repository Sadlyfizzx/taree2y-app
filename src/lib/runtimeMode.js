const DEMO_RUNTIME_MODES = new Set(['demo', 'local', 'mock', 'offline', 'qa']);

export function normalizeRuntimeMode(runtimeMode = 'supabase') {
  const safe = String(runtimeMode || '').trim().toLowerCase();
  return safe || 'supabase';
}

export function isDemoRuntimeRequested(runtimeMode = 'supabase') {
  return DEMO_RUNTIME_MODES.has(normalizeRuntimeMode(runtimeMode));
}

export function isDemoRuntimeEnabled(runtimeMode = 'supabase') {
  return import.meta.env.DEV && isDemoRuntimeRequested(runtimeMode);
}

export function isBackendAuthoritativeRuntime(runtimeMode = 'supabase') {
  return !isDemoRuntimeEnabled(runtimeMode);
}

export function getRuntimeAuthority(runtimeMode = 'supabase') {
  const normalizedMode = normalizeRuntimeMode(runtimeMode);
  const demoRuntimeRequested = isDemoRuntimeRequested(normalizedMode);
  const demoRuntimeEnabled = isDemoRuntimeEnabled(normalizedMode);

  return {
    mode: normalizedMode,
    demoRuntimeRequested,
    demoRuntimeEnabled,
    backendAuthoritative: !demoRuntimeEnabled,
  };
}
