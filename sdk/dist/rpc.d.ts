export declare class StudionetRateLimitError extends Error {
    readonly code = "STUDIONET_RATE_LIMITED";
    constructor();
}
export declare function isStudionetRateLimitError(error: unknown): boolean;
export declare function isRetryableRpcError(error: unknown): boolean;
/** True only for failures where the submitted transaction is still safe to poll. */
export declare function isStudionetTransportError(error: unknown): boolean;
/** A submitted transaction is safe to keep polling when its status RPC is unavailable. */
export declare class TransactionStatusUnavailableError extends Error {
    readonly transactionHash: string;
    readonly causeError: unknown;
    constructor(transactionHash: string, causeError: unknown);
}
/** Bounded backoff for transient Studio RPC throttling. Writes are never retried. */
export declare function withStudionetRetry<T>(operation: () => Promise<T>, attempts?: number, maxTimeMs?: number, retryLog?: string): Promise<T>;
/**
 * Polls a previously submitted transaction through temporary Studio transport
 * failures. This never calls a write method and always reuses the same hash.
 */
//# sourceMappingURL=rpc.d.ts.map