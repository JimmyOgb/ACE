export class StudionetRateLimitError extends Error {
    code = "STUDIONET_RATE_LIMITED";
    constructor() {
        super("Studionet is temporarily rate limited. Please wait a moment and try again.");
        this.name = "StudionetRateLimitError";
    }
}
function errorText(error) {
    if (typeof error === "string")
        return error;
    if (error && typeof error === "object") {
        const value = error;
        return [value.message, value.details, value.code, value.status, value.statusCode, value.cause ? errorText(value.cause) : undefined].filter(Boolean).join(" ");
    }
    return error instanceof Error ? error.message : "";
}
export function isStudionetRateLimitError(error) {
    const text = errorText(error).toLowerCase();
    return text.includes("429") || text.includes("-32005") || text.includes("rate limit") || text.includes("too many requests") || text.includes("rate limited");
}
function isTransientReadError(error) {
    return isStudionetRateLimitError(error) || isStudionetTransportError(error);
}
/** True only for failures where the submitted transaction is still safe to poll. */
export function isStudionetTransportError(error) {
    const text = errorText(error).toLowerCase();
    return text.includes("failed to fetch")
        || text.includes("err_connection_timed_out")
        || text.includes("network timeout")
        || text.includes("network request failed")
        || text.includes("timeout")
        || (text.includes("unknownrpcerror") && (text.includes("transport") || text.includes("fetch") || text.includes("network")));
}
function retryAfterMs(error) {
    if (!error || typeof error !== "object")
        return undefined;
    const value = error;
    const retryAfter = value.retryAfter ?? value.headers?.get?.("Retry-After");
    if (typeof retryAfter === "number" && Number.isFinite(retryAfter))
        return retryAfter * 1000;
    if (typeof retryAfter === "string") {
        const seconds = Number(retryAfter);
        if (Number.isFinite(seconds))
            return seconds * 1000;
        const date = Date.parse(retryAfter);
        if (!Number.isNaN(date))
            return Math.max(0, date - Date.now());
    }
    return value.cause ? retryAfterMs(value.cause) : undefined;
}
/** Bounded backoff for transient Studio RPC throttling. Writes are never retried. */
export async function withStudionetRetry(operation, attempts = 0, maxTimeMs = 45_000, retryLog) {
    const startedAt = Date.now();
    const retryCount = attempts ?? 2;
    for (let attempt = 0;; attempt += 1) {
        try {
            return await operation();
        }
        catch (error) {
            if (!isTransientReadError(error))
                throw error;
            if (attempt >= retryCount || Date.now() - startedAt >= maxTimeMs)
                throw error;
            const remaining = maxTimeMs - (Date.now() - startedAt);
            const delay = Math.min(remaining, retryAfterMs(error) ?? Math.min(8000, 750 * 2 ** attempt));
            if (retryLog)
                console.warn(retryLog, { attempt: attempt + 1, delay });
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
}
/**
 * Polls a previously submitted transaction through temporary Studio transport
 * failures. This never calls a write method and always reuses the same hash.
 */
//# sourceMappingURL=rpc.js.map