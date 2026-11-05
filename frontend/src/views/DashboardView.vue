<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getHealth } from '../services/api'

const apiStatus = ref('Verifica API…')
onMounted(async () => {
  try { const health = await getHealth(); apiStatus.value = health.status === 'ok' ? 'API connessa' : 'API non disponibile' }
  catch { apiStatus.value = 'API non raggiungibile (avvia backend)' }
})
const metrics = [
  { label: 'Carte in magazzino', value: '—', icon: 'pi pi-clone', note: 'Quantità totale' },
  { label: 'Valore inventario', value: '€ —', icon: 'pi pi-wallet', note: 'Prezzi CardTrader' },
  { label: 'Disponibili', value: '—', icon: 'pi pi-check-circle', note: 'Non prenotate' },
  { label: 'Prenotate', value: '—', icon: 'pi pi-bookmark', note: 'In attesa di vendita' },
]
</script>

<template>
  <section class="page-content">
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
    <div class="content-grid">
      <article class="panel">
        <div class="panel-heading"><div><h2>Valore del magazzino</h2><p>Andamento dei prezzi nel tempo</p></div><span class="tag">CardTrader</span></div>
        <div class="empty-chart"><div class="chart-icon"><i class="pi pi-chart-line"></i></div><strong>Nessun dato ancora</strong><span>Lo storico apparirà dopo aver aggiunto carte e sincronizzato i prezzi.</span></div>
      </article>
      <article class="panel">
        <div class="panel-heading"><div><h2>Attività recente</h2><p>Ultime movimentazioni</p></div></div>
        <div class="empty-activity"><i class="pi pi-history"></i><span>Le movimentazioni del magazzino appariranno qui.</span></div>
      </article>
    </div>
    <div class="status-line"><span class="status-dot"></span>{{ apiStatus }} <span class="status-separator">·</span> CardVault starter v0.1.0</div>
  </section>
</template>