<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getHealth } from '../services/api'
const apiStatus = ref('Verifica API…')
onMounted(async () => {
  try { const health = await getHealth(); apiStatus.value = health.status === 'ok' ? 'API connessa' : 'API non disponibile' }
  catch { apiStatus.value = 'API non raggiungibile (avvia backend)' }
})
const metrics = [
  { label: 'Carte in magazzino', value: '—', icon: 'pi pi-box', note: 'Quantità totale' },
  { label: 'Prenotazioni attive', value: '—', icon: 'pi pi-calendar', note: 'Carte riservate' },
  { label: 'Valore magazzino', value: '€ —', icon: 'pi pi-wallet', note: 'Prezzi CardTrader' },
]
</script>
<template>
  <section class="page-content dashboard-concept">
    <div class="page-heading">
      <div><p class="eyebrow">PANORAMICA</p><h1>Bentornato! 👋</h1><p class="subtitle">Ecco la situazione del tuo magazzino.</p></div>
      <RouterLink class="primary-button" to="/inventory"><i class="pi pi-plus"></i> Aggiungi carta</RouterLink>
    </div>
    <div class="metric-grid">
      <article v-for="metric in metrics" :key="metric.label" class="metric-card">
        <div class="metric-top"><span>{{ metric.label }}</span><i :class="metric.icon"></i></div>
        <div class="metric-value">{{ metric.value }}</div><p>{{ metric.note }}</p>
      </article>
    </div>
    <section class="quick-actions">
      <h2 class="section-title">Azioni rapide</h2>
      <div class="quick-action-grid">
        <RouterLink class="quick-action green" to="/inventory"><i class="pi pi-plus-circle"></i><span>Aggiungi carta</span></RouterLink>
        <div class="quick-action"><i class="pi pi-qrcode"></i><span>Scansiona carta <small>Presto</small></span></div>
        <div class="quick-action blue"><i class="pi pi-calendar"></i><span>Vedi prenotazioni <small>Presto</small></span></div>
        <div class="quick-action pink"><i class="pi pi-sync"></i><span>Aggiorna prezzi <small>Presto</small></span></div>
      </div>
    </section>
    <section class="panel recent-panel">
      <div class="panel-heading"><div><h2>Ultime attività</h2><p>Movimentazioni del magazzino</p></div></div>
      <div class="activity-empty"><i class="pi pi-history"></i><p>Le attività compariranno qui quando inizierai a gestire le carte.</p></div>
    </section>
    <div class="status-line"><span class="status-dot"></span>{{ apiStatus }} <span class="status-separator">·</span> CardVault starter v0.1.0</div>
  </section>
</template>