import axios from "axios";
import { storeToRefs } from "pinia";

import { API_BASE_URL } from "../config/api";
import { useAuthStore } from "../stores/auth";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});

api.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const auth = useAuthStore();
      auth.signOut();
    }
    return Promise.reject(error);
  }
);

export const useApi = () => {
  const auth = useAuthStore();
  const { token } = storeToRefs(auth);

  return { api, token };
};
