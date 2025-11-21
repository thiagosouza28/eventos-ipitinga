from pathlib import Path
path = Path('src/pages/admin/AdminDashboard.vue')
text = path.read_text(encoding='utf-8')
start = text.find('<script setup lang="ts">')
end = text.rfind('</script>')
if start == -1 or end == -1:
    raise SystemExit('script section not found')
script = '''
<script setup lang="ts">
import { computed, onMounted } from "vue";
import { RouterLink } from "vue-router";
import { BanknotesIcon, CalendarDaysIcon, ClipboardDocumentListIcon, UsersIcon } from "@heroicons/vue/24/outline";

import BaseCard from "../../components/ui/BaseCard.vue";
import { useAdminStore } from "../../stores/admin";
import { formatDate } from "../../utils/format";
import { useAuthStore } from "../../stores/auth";

const admin = useAdminStore();
const auth = useAuthStore();

const canViewEvents = computed(() => auth.hasPermission("events", "view"));
const canViewOrders = computed(() => auth.hasPermission("orders", "view"));
const canViewRegistrations = computed(() => auth.hasPermission("registrations", "view"));
const canViewFinancial = computed(() => auth.hasPermission("financial", "view"));

onMounted(async () => {
  const tasks: Promise<unknown>[] = [];
  if (canViewEvents.value) tasks.push(admin.loadEvents());
  if (canViewOrders.value) tasks.push(admin.loadOrders({}));
  if (canViewRegistrations.value) tasks.push(admin.loadRegistrations({}));
  try {
    await Promise.all(tasks);
  } catch (error) {
    console.error("Falha ao carregar dados iniciais do dashboard", error);
  }
});

const activeEvents = computed(() => admin.events.filter((event) => event.isActive).length);
</script>
'''
path.write_text(text[:start] + script + text[end:], encoding='utf-8')
