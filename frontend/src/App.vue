<script setup lang="ts">
import { computed } from 'vue'
declare const __BUILD_VERSION__: string
const buildVersion = __BUILD_VERSION__
import { useRoute } from 'vue-router'
import { usePreferencesStore } from './stores/preferences'
const preferences = usePreferencesStore()
const route = useRoute()
const pageTitle = computed(() => ({ dashboard: 'Dashboard', inventory: 'Magazzino', reservations: 'Prenotazioni', scanner: 'Scanner' }[String(route.name)] || 'CardVault'))
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <RouterLink class="brand" to="/"><span class="brand-mark"><i class="pi pi-clone"></i></span><span>Card<span class="brand-accent">Vault</span></span></RouterLink>
      <div class="nav-label">GESTIONE</div>
      <RouterLink class="nav-item" to="/" exact-active-class="active"><i class="pi pi-home"></i><span>Dashboard</span></RouterLink>
      <RouterLink class="nav-item" to="/inventory" active-class="active"><i class="pi pi-box"></i><span>Magazzino</span></RouterLink>
      <RouterLink class="nav-item" to="/reservations" active-class="active"><i class="pi pi-calendar"></i><span>Prenotazioni</span></RouterLink>
      <RouterLink class="nav-item" to="/scanner" active-class="active"><i class="pi pi-qrcode"></i><span>Scanner</span></RouterLink>
      <a class="nav-item muted" aria-disabled="true"><i class="pi pi-chart-line"></i><span>Prezzi</span></a>
      <a class="nav-item muted" aria-disabled="true"><i class="pi pi-users"></i><span>Clienti</span></a>
      <a class="nav-item muted" aria-disabled="true"><i class="pi pi-cog"></i><span>Impostazioni</span></a>
      <div class="sidebar-bottom"><div class="avatar">CV</div><div><strong>Collezionista</strong><small>Spazio personale</small></div></div>
    </aside>
    <main class="main-area">
      <header class="topbar">
        <div class="topbar-breadcrumb"><span class="breadcrumb">Workspace /</span> <strong>{{ pageTitle }}</strong></div>
        <div class="topbar-actions">
          <button class="topbar-icon" aria-label="Cerca" title="Cerca"><i class="pi pi-search"></i></button>
          <button class="topbar-icon" aria-label="Notifiche" title="Notifiche"><i class="pi pi-bell"></i></button>
          <button class="topbar-icon profile-icon" aria-label="Profilo" title="Profilo"><i class="pi pi-user"></i></button>
          <button class="topbar-icon theme-button" @click="preferences.toggleTheme()" :aria-label="preferences.theme === 'dark' ? 'Attiva tema chiaro' : 'Attiva tema scuro'">
            <i :class="preferences.theme === 'dark' ? 'pi pi-sun' : 'pi pi-moon'"></i>
          </button>
        </div>
      </header>
      <RouterView />
      <footer class="app-version">{{ buildVersion }}</footer>
    </main>
  </div>
</template>
