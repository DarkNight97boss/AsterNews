import type { Instrumentation } from 'next';

/** Errori non gestiti del server → registro "Errori e salute" (solo runtime Node.js). Con SENTRY_DSN inoltra anche a Sentry. */
export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { reportError } = await import('./instrumentation-node');
  await reportError(err, request);
};
