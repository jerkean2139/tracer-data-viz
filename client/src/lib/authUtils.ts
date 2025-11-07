export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

export function redirectToLogin() {
  window.location.href = "/";
}

export async function redirectToLogout() {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    
    if (response.ok) {
      window.location.href = "/";
    } else {
      console.error("Logout failed");
      window.location.href = "/";
    }
  } catch (error) {
    console.error("Logout error:", error);
    window.location.href = "/";
  }
}
