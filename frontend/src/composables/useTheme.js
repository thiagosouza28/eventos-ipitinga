import { ref, onMounted } from "vue";
const STORAGE_KEY = "catre-theme";
const isDark = ref(false);
export const useTheme = () => {
    const applyTheme = () => {
        const root = document.documentElement;
        if (isDark.value) {
            root.classList.add("dark");
        }
        else {
            root.classList.remove("dark");
        }
        localStorage.setItem(STORAGE_KEY, isDark.value ? "dark" : "light");
    };
    const toggleTheme = () => {
        isDark.value = !isDark.value;
        applyTheme();
    };
    onMounted(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        isDark.value = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
        applyTheme();
    });
    return {
        isDark,
        toggleTheme
    };
};
//# sourceMappingURL=useTheme.js.map