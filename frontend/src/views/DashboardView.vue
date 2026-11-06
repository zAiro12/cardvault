<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getHealth, getInventory, type InventoryRecord } from '../services/api'

const apiStatus = ref('Verifica API…')
const inventory = ref<InventoryRecord[]>([])
const loading = ref(true)
const loadError = ref('')

const activeReservations = computed(() => inventory.value.flatMap(item =>
  (item.reservations ?? [])
    .filter(reservation => reservation.status === 'RESERVED' || reservation.status === 'CONFIRMED')
    .map(reservation => ({ ...reservation, cardName: item.card.name, itemQuantity: item.quantity })),
))
const totalCards = computed(() => inventory.value.reduce((sum, item) => sum + Number(item.quantity || 0), 0))
const availableCards = computed(() => inventory.value.reduce((sum, item) => {
  const reserved = (item.reservations ?? []).filter(r => r.status === 'RESERVED' || r.status === 'CONFIRMED').reduce((n, r) => n + Number(r.quantity || 0), 0)
  return sum + Math.max(0, Number(item.quantity || 0) - reserved)
}, 0))
const warehouseValue = computed(() => inventory.value.reduce((sum, item) => sum + Number(item.marketPrice ?? 0) * Number(item.quantity || 0), 0))
const formatMoney = (value: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value)
const metrics = computed(() => [
  { label: 'Carte in magazzino', value: totalCards.value.toLocaleString('it-IT'), icon: 'pi pi-box', note: 'Quantità totale', tone: 'violet' },
  { label: 'Prenotazioni attive', value: activeReservations.value.reduce((sum, r) => sum + Number(r.quantity || 0), 0).toLocaleString('it-IT'), icon: 'pi pi-calendar', note: 'Carte riservate', tone: 'pink' },
  { label: 'Valore magazzino', value: formatMoney(warehouseValue.value), icon: 'pi pi-chart-line', note: 'Prezzi CardTrader', tone: 'green' },
])
const activities = computed(() => activeReservations.value
  .slice()
  .sort((a, b) => new Date(b.reservedAt).getTime() - new Date(a.reservedAt).getTime())
  .slice(0, 5)
  .map(r => ({
    title: 'Carta prenotata',
    detail: `${r.cardName} · ${r.quantity} copie per ${r.customer}`,
    time: new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(r.reservedAt)),
    icon: 'pi pi-calendar',
    tone: 'violet',
  })))
onMounted(async () => {
  try {
    const health = await getHealth()
    apiStatus.value = health.status === 'ok' ? 'API connessa' : 'API non disponibile'
  } catch { apiStatus.value = 'API non raggiungibile (avvia backend)' }
  try { inventory.value = await getInventory() }
  catch (error) { loadError.value = error instanceof Error ? error.message : 'Impossibile caricare il magazzino' }
  finally { loading.value = false }
})
</script>
<template>
  <section class="page-content dashboard-concept">
    <div class="page-heading">
      <div><h1>Bentornato! <span class="wave">👋</span></h1><p class="subtitle">Ecco la situazione del tuo magazzino.</p></div>
    </div>
    <p v-if="loadError" class="dashboard-error" role="alert">{{ loadError }}</p>
    <div class="metric-grid">
      <article v-for="metric in metrics" :key="metric.label" class="metric-card" :class="'metric-'+metric.tone">
        <div class="metric-top"><i :class="metric.icon"></i><span>{{ metric.label }}</span></div>
        <div class="metric-value">{{ loading ? '…' : metric.value }}</div>
        <div class="metric-note">{{ metric.note }}</div>
      </article>
    </div>
    <section class="quick-actions">
      <h2 class="section-title">Azioni rapide</h2>
      <div class="quick-action-grid">
        <RouterLink class="quick-action green" to="/inventory"><i class="pi pi-plus-circle"></i><span>Aggiungi carta</span></RouterLink>
        <RouterLink class="quick-action violet" to="/inventory"><i class="pi pi-qrcode"></i><span>Scansiona carta</span></RouterLink>
        <RouterLink class="quick-action blue" to="/reservations"><i class="pi pi-calendar"></i><span>Vedi prenotazioni</span></RouterLink>
        <RouterLink class="quick-action purple" to="/inventory"><i class="pi pi-sync"></i><span>Aggiorna prezzi</span></RouterLink>
      </div>
    </section>
    <section class="recent-panel">
      <div class="recent-heading"><h2>Ultime attività</h2><RouterLink to="/reservations">Vedi tutte <i class="pi pi-arrow-right"></i></RouterLink></div>
      <div class="activity-list">
        <article v-for="(activity, index) in activities" :key="activity.title+activity.detail+index" class="activity-row">
          <div class="activity-icon" :class="'activity-'+activity.tone"><i :class="activity.icon"></i></div>
          <div class="activity-copy"><strong>{{ activity.title }}</strong><span>{{ activity.detail }}</span></div>
          <time>{{ activity.time }}</time>
        </article>
        <article v-if="!loading && activities.length === 0" class="activity-row">
          <div class="activity-icon activity-violet"><i class="pi pi-history"></i></div>
          <div class="activity-copy"><strong>Nessuna attività recente</strong><span>Le prenotazioni appariranno qui quando verranno registrate.</span></div><time>—</time>
        </article>
      </div>
    </section>
    <div class="status-line"><span class="status-dot"></span>{{ apiStatus }} <span class="status-separator">·</span> CardVault starter v0.1.0 <span class="status-separator">·</span> {{ availableCards.toLocaleString('it-IT') }} disponibili</div>
  </section>
</template>