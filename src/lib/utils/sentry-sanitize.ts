/**
 * Utility for sanitizing Sentry events before they are sent to the dashboard.
 * Masks Egyptian phone numbers and removes sensitive keys recursively.
 */

const EGYPTIAN_PHONE_REGEX = /\b(01\d{2})\d{3}(\d{4})\b/g;
const EGYPTIAN_PHONE_PREFIX_REGEX = /\b(\+?201\d{2})\d{3}(\d{4})\b/g;

export function sanitizePhoneNumbers(str: string): string {
  let sanitized = str.replace(EGYPTIAN_PHONE_REGEX, '$1***$2');
  sanitized = sanitized.replace(EGYPTIAN_PHONE_PREFIX_REGEX, '$1***$2');
  return sanitized;
}

const SENSITIVE_KEYS = ['password', 'secret', 'token', 'api_key', 'otp', 'card'];

export function isSensitiveKey(key: string): boolean {
  const normalizedKey = key.toLowerCase();
  return SENSITIVE_KEYS.some(sensitive => normalizedKey.includes(sensitive));
}

export function sanitizeObjectRecursive(val: any): any {
  if (typeof val === 'string') {
    return sanitizePhoneNumbers(val);
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeObjectRecursive);
  }
  if (val !== null && typeof val === 'object') {
    const sanitizedObj: any = {};
    for (const key of Object.keys(val)) {
      if (isSensitiveKey(key)) {
        // Remove key completely to protect sensitive credentials
        continue;
      }
      sanitizedObj[key] = sanitizeObjectRecursive(val[key]);
    }
    return sanitizedObj;
  }
  return val;
}

export function sanitizeEvent(event: any): any {
  if (!event) return event;

  // 1. Sanitize event message
  if (typeof event.message === 'string') {
    event.message = sanitizePhoneNumbers(event.message);
  }

  // 2. Sanitize unhandled exceptions value messages
  if (event.exception?.values) {
    for (const val of event.exception.values) {
      if (typeof val.value === 'string') {
        val.value = sanitizePhoneNumbers(val.value);
      }
    }
  }

  // 3. Sanitize event.extra recursively
  if (event.extra) {
    event.extra = sanitizeObjectRecursive(event.extra);
  }

  // 4. Sanitize event.contexts recursively
  if (event.contexts) {
    event.contexts = sanitizeObjectRecursive(event.contexts);
  }

  // 5. Sanitize event.request recursively
  if (event.request) {
    event.request = sanitizeObjectRecursive(event.request);
  }

  // 6. Sanitize event.breadcrumbs recursively
  if (event.breadcrumbs) {
    event.breadcrumbs = sanitizeObjectRecursive(event.breadcrumbs);
  }

  return event;
}
