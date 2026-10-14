type ApiError = Error & { code?: string; status?: number };

async function adminApiRequest<T>(
  user: FirebaseUser,
  path: string,
  method = "GET",
  body?: Record<string, unknown>,
  forceRefresh = false
): Promise<T> {
  const token = await user.getIdToken(forceRefresh);
  const response = await fetch(path, {
    method,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const isJson = (response.headers.get("content-type") ?? "").includes("application/json");
  const result = (isJson
    ? await response.json()
    : { error: `Server noto‘g‘ri javob qaytardi (HTTP ${response.status}).` }) as T & {
    error?: string;
    code?: string;
  };

  if (!response.ok) {
    // Muddati tugagan token: bir marta yangi token olib qayta urinamiz
    if (!forceRefresh && (result.code === "TOKEN_EXPIRED" || result.code === "TOKEN_REVOKED")) {
      return adminApiRequest<T>(user, path, method, body, true);
    }
    const err = new Error(result.error || "So‘rovni bajarib bo‘lmadi.") as ApiError;
    err.code = result.code;
    err.status = response.status;
    throw err;
  }

  return result as T;
}
