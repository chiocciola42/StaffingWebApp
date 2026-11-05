/**
 * @file services/apiClient.ts
 * @description Client HTTP verso le API dell'applicazione: header di autenticazione,
 * retry con backoff esponenziale a tentativi limitati.
 */

export interface ApiClientOptions {
    retries?: number;
    retryDelayMs?: number;
    backoffFactor?: number;
    authStrategy?: 'bearer' | 'none' | ((token: string | null) => HeadersInit);
    tokenProvider?: () => string | null;
}

type ApiError = Error & { isClientError?: boolean; status?: number };

const MAX_RETRIES = 10;

const defaultTokenProvider = (): string | null =>
    typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;

const resolveAuthHeaders = (strategy: ApiClientOptions['authStrategy'], token: string | null): HeadersInit => {
    if (strategy === 'none') return {};
    if (typeof strategy === 'function') return strategy(token);
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const isClientStatus = (status: number): boolean => status >= 400 && status < 500 && status !== 429;

const buildError = async (response: Response): Promise<ApiError> => {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    const error: ApiError = new Error(body.error || `API request failed: ${response.status}`);
    error.status = response.status;
    error.isClientError = isClientStatus(response.status);
    return error;
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const requestOnce = async <T>(url: string, options: RequestInit, headers: HeadersInit): Promise<T> => {
    const response = await fetch(url, { ...options, headers });
    if (response.status === 204) return null as T;
    if (!response.ok) throw await buildError(response);
    return (await response.json()) as T;
};

/**
 * Esegue una richiesta alle API con autenticazione e retry limitato.
 * Gli errori 4xx (tranne 429) non vengono ritentati.
 */
export const apiFetch = async <T = unknown>(url: string, options: RequestInit = {}, clientOptions: ApiClientOptions = {}): Promise<T> => {
    const {
        retries = 3,
        retryDelayMs = 500,
        backoffFactor = 2,
        authStrategy = 'bearer',
        tokenProvider = defaultTokenProvider,
    } = clientOptions;

    const maxRetries = Math.min(Math.max(retries, 0), MAX_RETRIES);
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...resolveAuthHeaders(authStrategy, tokenProvider()),
        ...options.headers,
    };

    let delay = retryDelayMs;
    for (let attempt = 0; ; attempt += 1) {
        try {
            return await requestOnce<T>(url, options, headers);
        } catch (error) {
            const typed = error as ApiError;
            if (typed.isClientError || attempt >= maxRetries) throw typed;
            await sleep(delay);
            delay *= backoffFactor;
        }
    }
};
