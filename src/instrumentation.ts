import type { Instrumentation } from 'next';

/** Registra ogni errore non gestito del server nel database (Errori e salute) senza servizi esterni. Con SENTRY_DSN inoltra anche a Sentry. */
export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  try {
    const e = err as { message?: string; stack?: string; digest?: string };
    const { logError } = await import('./lib/repo-extra');
    await logError(e.digest ?? '', e.message ?? String(err), e.stack ?? '', request.path);
    const dsn = process.env.SENTRY_DSN;
    if (dsn) {
      const u = new URL(dsn); const projectId = u.pathname.replace('/', ''); const key = u.username;
      const endpoint = `${u.protocol}//${u.host}/api/${projectId}/envelope/?sentry_key=${key}&sentry_version=7`;
      const eventId = crypto.randomUUID().replace(/-/g, '');
      const event = { event_id: eventId, timestamp: new Date().toISOString(), platform: 'node', level: 'error', message: e.message, request: { url: request.path, method: request.method }, exception: { values: [{ type: 'Error', value: e.message, stacktrace: e.stack ? { frames: e.stack.split('\n').slice(1, 20).map((l) => ({ function: l.trim() })) } : undefined }] } };
      await fetch(endpoint, { method: 'POST', body: `${JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() })}\n${JSON.stringify({ type: 'event' })}\n${JSON.stringify(event)}\n` }).catch(() => {});
    }
  } catch { /* la registrazione non deve mai rompere la richiesta */ }
};
