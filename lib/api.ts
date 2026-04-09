// API helper với CSRF token tự động

const CSRF_COOKIE = "csrf-token";

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Lấy CSRF token từ cookie
  const csrfToken = typeof document !== "undefined"
    ? document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${CSRF_COOKIE}=`))
        ?.split("=")[1]
    : undefined;

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
      ...options.headers,
    },
  });
}

// Wrapper cho API calls trả về JSON
export async function apiFetchJSON<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(url, options);

  if (!res.ok) {
    // Dynamically import toast để tránh circular dependency
    const { toast } = await import('sonner').catch(() => ({ toast: null }));

    const error = await res.json().catch(() => ({ error: "Request failed" }));

    // Show toast cho các lỗi phổ biến
    if (res.status === 400) {
      toast?.error(error.error ?? "Dữ liệu không hợp lệ");
    } else if (res.status === 403) {
      toast?.error("Không có quyền thực hiện");
    } else if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After") ?? "60";
      toast?.error("Quá nhiều yêu cầu", {
        description: `Vui lòng thử lại sau ${retryAfter} giây`,
        duration: 5000,
      });
    } else if (res.status === 500) {
      toast?.error("Lỗi server, vui lòng thử lại");
    }

    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Get CSRF token từ cookie (để sử dụng ở nơi khác nếu cần)
export function getCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;

  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CSRF_COOKIE}=`))
    ?.split("=")[1];
}
