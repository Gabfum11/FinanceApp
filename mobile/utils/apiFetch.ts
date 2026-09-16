import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { API_URL } from "@/config";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await SecureStore.getItemAsync("token");

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    await SecureStore.deleteItemAsync("token");
    router.replace("/login");
  }

  return response;
}