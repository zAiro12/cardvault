<script setup lang="ts">
import { usePreferencesStore } from './stores/preferences'
const preferences = usePreferencesStore()
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark">CV</span><span>CardVault</span></div>
      <div class="nav-label">GESTIONE</div>
      <RouterLink class="nav-item active" to="/"><i class="pi pi-th-large"></i> Dashboard</RouterLink>
      <a class="nav-item muted"><i class="pi pi-clone"></i> Inventario <span class="soon">Soon</span></a>
      <a class="nav-item muted"><i class="pi pi-search"></i> Scanner <span class="soon">Soon</span></a>
      <a class="nav-item muted"><i class="pi pi-map-marker"></i> Posizioni <span class="soon">Soon</span></a>
      <a class="nav-item muted"><i class="pi pi-bookmark"></i> Prenotazioni <span class="soon">Soon</span></a>
      <div class="sidebar-bottom"><div class="avatar">CV</div><div><strong>Collezionista</strong><small>Spazio personale</small></div></div>
    </aside>
    <main class="main-area">
      <header class="topbar">
        <div><span class="breadcrumb">Workspace /</span> <strong>Dashboard</strong></div>
        <button class="theme-button" @click="preferences.toggleTheme()">
          <i :class="preferences.theme === 'dark' ? 'pi pi-sun' : 'pi pi-moon'"></i>
          Tema {{ preferences.theme === 'dark' ? 'chiaro' : 'scuro' }}
        </button>
      </header>
      <RouterView />
    </main>
  </div>
</template>