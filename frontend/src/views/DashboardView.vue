<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getHealth } from '../services/api'
const apiStatus = ref('Verifica API…')
onMounted(async () => {
  try { const health = await getHealth(); apiStatus.value = health.status === 'ok' ? 'API connessa' : 'API non disponibile' }
  catch { apiStatus.value = 'API non raggiungibile (avvia backend)' }
})
const metrics = [
  { label: 'Carte in magazzino', value: '—', icon: 'pi pi-box', note: 'Quantità totale', tone: 'violet' },
  { label: 'Prenotazioni attive', value: '—', icon: 'pi pi-calendar', note: 'Carte riservate', tone: 'pink' },
  { label: 'Valore magazzino', value: '€ —', icon: 'pi pi-chart-line', note: 'Prezzi CardTrader', tone: 'green' },
]
const activities = [
  { title: 'Nessuna attività recente', detail: 'Le movimentazioni appariranno qui dopo aver gestito le carte.', time: '—', icon: 'pi pi-history', tone: 'violet' },
]
</script>
<template>
  <section class="page-content dashboard-concept">
    <div class="page-heading">
      <div><h1>Bentornato! <span class="wave">👋</span></h1><p class="subtitle">Ecco la situazione del tuo magazzino.</p></div>
    </div>
    <div class="metric-grid">
      <article v-for="metric in metrics" :key="metric.label" class="metric-card" :class="'metric-'+metric.tone">
        <div class="metric-top"><i :class="metric.icon"></i><span>{{ metric.label }}</span></div>
        <div class="metric-value">{{ metric.value }}</div>
      </article>
    </div>
    <section class="quick-actions">
      <h2 class="section-title">Azioni rapide</h2>
      <div class="quick-action-grid">
        <RouterLink class="quick-action green" to="/inventory"><i class="pi pi-plus-circle"></i><span>Aggiungi carta</span></RouterLink>
        <button class="quick-action violet" type="button" disabled title="Scanner non ancora disponibile"><i class="pi pi-qrcode"></i><span>Scansiona carta</span></button>
        <button class="quick-action blue" type="button" disabled title="Prenotazioni non ancora disponibili"><i class="pi pi-calendar"></i><span>Vedi prenotazioni</span></button>
        <button class="quick-action purple" type="button" disabled title="Sincronizzazione prezzi non ancora disponibile"><i class="pi pi-sync"></i><span>Aggiorna prezzi</span></button>
      </div>
    </section>
    <section class="recent-panel">
      <div class="recent-heading"><h2>Ultime attività</h2><button type="button" disabled>Vedi tutte <i class="pi pi-arrow-right"></i></button></div>
      <div class="activity-list">
        <article v-for="activity in activities" :key="activity.title" class="activity-row">
          <div class="activity-icon" :class="'activity-'+activity.tone"><i :class="activity.icon"></i></div>
          <div class="activity-copy"><strong>{{ activity.title }}</strong><span>{{ activity.detail }}</span></div>
          <time>{{ activity.time }}</time>
        </article>
      </div>
    </section>
    <div class="status-line"><span class="status-dot"></span>{{ apiStatus }} <span class="status-separator">·</span> CardVault starter v0.1.0</div>
  </section>
</template>