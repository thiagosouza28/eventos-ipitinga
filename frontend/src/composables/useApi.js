import axios, { AxiosHeaders } from "axios";
import { storeToRefs } from "pinia";
import { API_BASE_URL } from "../config/api";
import { useAuthStore } from "../stores/auth";
import { useLoaderStore } from "../stores/loader";
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000
});
const clientsWithInterceptors = new WeakSet();
const attachLoaderInterceptors = (client) => {
    if (clientsWithInterceptors.has(client)) {
        return;
    }
    client.interceptors.request.use((config) => {
        const auth = useAuthStore();
        const loader = useLoaderStore();
        if (!config.headers) {
            config.headers = new AxiosHeaders();
        }
        if (auth.token) {
            if (config.headers instanceof AxiosHeaders) {
                config.headers.set("Authorization", `Bearer ${auth.token}`);
            }
            else {
                config.headers.Authorization = `Bearer ${auth.token}`;
            }
        }
        loader.start(loader.messageForMethod(config.method));
        return config;
    });
    client.interceptors.response.use((response) => {
        const loader = useLoaderStore();
        loader.stop();
        return response;
    }, (error) => {
        const loader = useLoaderStore();
        loader.stop();
        if (error.response?.status === 401) {
            const auth = useAuthStore();
            auth.signOut();
        }
        return Promise.reject(error);
    });
    clientsWithInterceptors.add(client);
};
attachLoaderInterceptors(api);
attachLoaderInterceptors(axios);
export const useApi = () => {
    const auth = useAuthStore();
    const { token } = storeToRefs(auth);
    return { api, token };
};
//# sourceMappingURL=useApi.js.map