<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref, shallowRef } from "vue";
import { RouterLink, RouterView } from "vue-router";
import {
  Home,
  ArrowLeftRight,
  Download,
  Monitor,
  Settings,
  HelpCircle,
} from "lucide-vue-next";
import { useAppStore } from "../stores/app";
import { useDevicesStore } from "../stores/devices";
import { useTransfersStore } from "../stores/transfers";
import { useSettingsStore } from "../stores/settings";
import ThemeToggle from "../components/common/ThemeToggle.vue";
import AppLogo from "../components/common/AppLogo.vue";
import ConfirmDialog from "../components/common/ConfirmDialog.vue";
import ConnectDevicePanel from "../components/overlays/ConnectDevicePanel.vue";
import DeviceAccessRequestDialog from "../components/overlays/DeviceAccessRequestDialog.vue";
import WindowCaption from "../components/common/WindowCaption.vue";
import { openConnectPanelKey } from "../composables/useConnectPanel";
import { wsClient } from "@/services/websocket";
import { useLocale } from "@/i18n";
import { APP_NAME } from "@/config/brand";
import { detectDesktopPlatform, isDesktopShell } from "@/utils/platform";
import { staggerIn } from "@/utils/motion";

const appStore = useAppStore();
const devicesStore = useDevicesStore();
const transfersStore = useTransfersStore();
const settingsStore = useSettingsStore();
const { t } = useLocale();

// ─── Per-platform shell chrome ─────────────────────────────────────────
// macOS: traffic lights overlay the unified toolbar (HIG); Windows/Linux:
// decorations disabled, Fluent-style caption buttons sit at the far right.
// Web builds share the same single-row shell without window controls.
const platform = detectDesktopPlatform();
const inTauriShell = isDesktopShell(platform);
const showCaption = inTauriShell && platform !== "mac";

const showConnectPanel = ref(false);
const accessDecisionPending = shallowRef(false);
const pendingDeviceAccess = computed(() => devicesStore.currentPendingApproval);

function refreshDevicesAfterSocketConnect() {
  void devicesStore.fetchDevices();
}

// anime.js choreography: after the CSS fade completes, stagger the page's
// top-level blocks upward (animejs.com v4 — MIT).
function onPageEntered(el: Element) {
  staggerIn(el.querySelectorAll(":scope > *"), { gap: 55, distance: 12 });
}

const emit = defineEmits<{
  (e: "connect-device"): void;
}>();

onMounted(async () => {
  await appStore.initialize();
  await settingsStore.fetchSettings();
  // Subscribe before opening the socket. Otherwise a phone that reconnects
  // during startup can emit its approval request before the desktop listens.
  devicesStore.setupWebSocketListeners();
  transfersStore.setupWebSocketListeners();
  wsClient.on("connected", refreshDevicesAfterSocketConnect);
  appStore.setupConnectionMonitor();
  await appStore.startServer();
  appStore.connectWebSocket();
  await devicesStore.fetchDevices();
  await transfersStore.fetchTransfers();
});

onUnmounted(() => {
  wsClient.off("connected", refreshDevicesAfterSocketConnect);
});

function openConnectPanel() {
  showConnectPanel.value = true;
}

// audit-13: stopping the service kills in-flight transfers, so warn first.
const stopServiceConfirmVisible = ref(false);
const activeTransferCount = computed(() => transfersStore.activeTransfers.length);

function handleServiceToggle() {
  if (appStore.serverRunning && activeTransferCount.value > 0) {
    stopServiceConfirmVisible.value = true;
    return;
  }
  void appStore.toggleServer();
}

function confirmStopService() {
  stopServiceConfirmVisible.value = false;
  void appStore.toggleServer();
}

// Let nested pages (e.g. HomePage) open the connect panel
provide(openConnectPanelKey, openConnectPanel);

function handleConnectDevice() {
  showConnectPanel.value = !showConnectPanel.value;
  emit("connect-device");
}

async function allowDeviceAccess(deviceId: string, trusted: boolean, expiryHours?: number) {
  const deviceName = devicesStore.devices.find((device) => device.id === deviceId)?.name ?? t("device.thisDevice");
  accessDecisionPending.value = true;
  try {
    const succeeded = await devicesStore.approveDevice(deviceId, trusted, expiryHours);
    if (succeeded) {
      appStore.pushToast(
        "success",
        trusted ? t("device.trusted") : t("device.allowedOnce"),
        trusted
          ? t("device.trustedDescription", { name: deviceName })
          : t("device.allowedOnceDescription", { name: deviceName })
      );
    } else {
      appStore.pushToast("error", t("device.permissionUpdateFailed"), t("device.permissionUpdateFailedDescription"));
    }
  } finally {
    accessDecisionPending.value = false;
    await devicesStore.fetchDevices();
  }
}

async function rejectDeviceAccess(deviceId: string) {
  const deviceName = devicesStore.devices.find((device) => device.id === deviceId)?.name ?? t("device.thisDevice");
  accessDecisionPending.value = true;
  try {
    const succeeded = await devicesStore.rejectDevice(deviceId);
    if (succeeded) {
      appStore.pushToast("info", t("device.rejected"), t("device.rejectedDescription", { name: deviceName }));
    } else {
      appStore.pushToast("error", t("device.permissionUpdateFailed"), t("device.permissionUpdateFailedDescription"));
    }
  } finally {
    accessDecisionPending.value = false;
    await devicesStore.fetchDevices();
  }
}

const navItems = computed(() => [
  { label: t("nav.home"), icon: Home, path: "/" },
  { label: t("nav.transfers"), icon: ArrowLeftRight, path: "/transfers" },
  { label: t("nav.received"), icon: Download, path: "/received" },
  { label: t("nav.devices"), icon: Monitor, path: "/devices" },
]);
</script>

<template>
  <div class="shell" :data-platform="platform">
    <!-- ─── Unified single-row toolbar: brand · nav · actions · caption ─── -->
    <header class="toolbar" data-tauri-drag-region>
      <div class="toolbar-left" data-tauri-drag-region>
        <RouterLink to="/" class="brand" :title="`${APP_NAME} ${t('nav.home')}`" aria-label="LanNook">
          <AppLogo :size="24" />
        </RouterLink>

        <nav class="nav-tabs" :aria-label="t('mobile.navigation')">
          <RouterLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="nav-tab"
            exact-active-class="nav-tab--active"
          >
            <component :is="item.icon" :size="15" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </nav>
      </div>

      <div class="toolbar-right">
        <span class="network-badge" :title="t('settings.network')">{{ appStore.networkName }}</span>

        <span class="status-indicator" :title="appStore.serverRunning ? t('app.running') : t('app.stopped')">
          <span
            class="status-dot"
            :class="appStore.serverRunning ? 'status-dot--running' : 'status-dot--stopped'"
          ></span>
        </span>

        <button class="service-toggle-btn" type="button" @click="handleServiceToggle">
          {{ appStore.serverRunning ? t("app.stopService") : t("app.startService") }}
        </button>

        <span class="device-count-badge">
          {{ t("app.deviceCount", { count: devicesStore.onlineDevices.length }) }}
        </span>

        <button class="btn-primary" @click="handleConnectDevice">
          {{ t("app.connectDevice") }}
        </button>

        <ThemeToggle />

        <RouterLink to="/help" class="icon-btn icon-btn--link" :title="t('nav.help')" :aria-label="t('nav.help')">
          <HelpCircle :size="16" />
        </RouterLink>

        <RouterLink to="/settings" class="icon-btn icon-btn--link" :title="t('nav.settings')" :aria-label="t('nav.settings')">
          <Settings :size="16" />
        </RouterLink>

        <WindowCaption v-if="showCaption" />
      </div>
    </header>

    <!-- ─── Content ─── -->
    <main class="shell-content">
      <div class="content-wrapper">
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in" @after-enter="onPageEntered">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </div>
    </main>

    <!-- ─── Overlays ─── -->
    <ConnectDevicePanel
      :visible="showConnectPanel"
      @close="showConnectPanel = false"
    />
    <DeviceAccessRequestDialog
      :device="pendingDeviceAccess"
      :pending="accessDecisionPending"
      @allow="allowDeviceAccess"
      @reject="rejectDeviceAccess"
    />
    <ConfirmDialog
      :visible="stopServiceConfirmVisible"
      :title="t('app.stopServiceConfirmTitle')"
      :description="t('app.stopServiceConfirmDescription', { count: activeTransferCount })"
      :confirm-label="t('app.stopService')"
      tone="danger"
      @confirm="confirmStopService"
      @cancel="stopServiceConfirmVisible = false"
    />
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

/* ─── Unified toolbar ─── */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: var(--topbar-height);
  padding: 0 8px 0 14px;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--color-surface-card) 82%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
  z-index: var(--z-sticky);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.brand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  flex-shrink: 0;
  transition: background var(--transition-fast);
}
.brand:hover { background: var(--color-hover); }

/* ─── Top navigation tabs ─── */
.nav-tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.nav-tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 13px;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  white-space: nowrap;
  text-decoration: none;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.nav-tab:hover {
  background: var(--color-hover);
  color: var(--color-text-primary);
}

.nav-tab--active {
  color: var(--color-brand-primary);
  background: var(--color-brand-primary-soft);
  font-weight: var(--weight-medium);
}

/* ─── Right action cluster ─── */
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-right: 4px;
}

.network-badge {
  font-size: var(--text-xs);
  color: var(--color-text-brand);
  background: var(--color-brand-primary-soft);
  padding: 3px 9px;
  border-radius: var(--radius-full);
  font-weight: var(--weight-medium);
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-indicator { display: inline-flex; align-items: center; }

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
}

.status-dot--running {
  background: var(--color-state-success);
  box-shadow: 0 0 0 2px var(--color-state-success-soft);
}

.status-dot--stopped {
  background: var(--color-text-tertiary);
}

.service-toggle-btn {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-card);
  color: var(--color-text-brand);
  padding: 5px 10px;
  font-size: var(--text-xs);
  cursor: pointer;
  white-space: nowrap;
}

.service-toggle-btn:hover {
  background: var(--color-hover);
  border-color: var(--color-brand-primary);
}

.device-count-badge {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  background: var(--color-surface-inset);
  padding: 3px 8px;
  border-radius: var(--radius-full);
  white-space: nowrap;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: #fff;
  background: var(--color-brand-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
  white-space: nowrap;
}

.btn-primary:hover {
  background: var(--color-brand-primary-hover);
}

.btn-primary:active {
  background: var(--color-brand-primary-active);
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  text-decoration: none;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.icon-btn:hover {
  background: var(--color-hover);
  color: var(--color-text-secondary);
}

.icon-btn--link { text-decoration: none; }

/* Windows/Linux builds pull the caption flush against the window edge. */
.shell[data-platform="windows"] .toolbar-right,
.shell[data-platform="linux"] .toolbar-right {
  padding-right: 0;
  margin-right: -8px;
}

/* Narrow windows: badges yield first, then tab labels compress. */
@media (max-width: 1220px) {
  .network-badge,
  .device-count-badge { display: none; }
}
@media (max-width: 1040px) {
  .nav-tab { padding: 0 9px; }
  .nav-tab span { display: none; }
  .nav-tab { gap: 0; }
}

/* ─── Content ─── */
.shell-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.content-wrapper {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 32px;
}

/* ─── Page transition (board.json motion tiers) ─── */
.page-enter-active {
  transition: opacity 200ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
}
.page-leave-active {
  transition: opacity 140ms cubic-bezier(0.4, 0, 1, 1);
}
.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active { transition-duration: 1ms; }
}
</style>
