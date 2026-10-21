export interface MarkAllReadResponseParseResult {
  requestFailed: boolean;
  isPartialSuccess: boolean;
  errorMessage: string;
}

/**
 * Pure, dependency-free response-parsing helper for mark-all-read API calls.
 * Safely parses the HTTP response body and extracts partialSuccess flags,
 * handling non-OK status codes, non-JSON error payloads, and network exceptions.
 *
 * Safe for direct use in client components ("use client") and server environments.
 */
export async function parseMarkAllReadResponse(
  responseOrPromise: Promise<Response> | Response
): Promise<MarkAllReadResponseParseResult> {
  let isPartialSuccess = false;
  let errorMessage = "Failed to mark all notifications as read";
  let requestFailed = false;

  try {
    const res = await responseOrPromise;
    if (!res.ok) {
      requestFailed = true;
      const errJson = await res.json().catch(() => ({}));
      isPartialSuccess = Boolean(errJson?.partialSuccess);
      errorMessage = errJson?.error || "Failed to mark all notifications as read";
    }
  } catch (networkErr: any) {
    requestFailed = true;
    isPartialSuccess = false;
    errorMessage = networkErr?.message || "Failed to mark all notifications as read";
  }

  return { requestFailed, isPartialSuccess, errorMessage };
}
