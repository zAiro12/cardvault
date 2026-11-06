<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getInventory, updateReservationStatus, type InventoryRecord, type ReservationRecord } from '../services/api'

type ReservationRow = ReservationRecord & { cardName: string; setName: string; marketPrice: number; stock: number; condition: string }
const rows = ref<ReservationRow[]>([])
const loading = ref(true)
const error = ref('')
const success = ref('')
const filter = ref<'ACTIVE' | 'ALL' | 'SOLD' | 'CANCELLED'>('ACTIVE')
const busyId = ref('')
const money = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)
const filtered = computed(() => rows.value.filter(row => filter.value === 'ALL' || (filter.value === 'ACTIVE' ? ['RESERVED','CONFIRMED'].includes(row.status) : row.status === filter.value)))
const activeCount = computed(() => rows.value.filter(row => ['RESERVED','CONFIRMED'].includes(row.status)).length)
const activeValue = computed(() => rows.value.filter(row => ['RESERVED','CONFIRMED'].includes(row.status)).reduce((sum,row) => sum + row.marketPrice * row.quantity,0))
async function load() {
  loading.value = true; error.value = ''
  try {
    const inventory: InventoryRecord[] = await getInventory()
    rows.value = inventory.flatMap(item => (item.reservations ?? []).map(reservation => ({ ...reservation, cardName:item.card.name, setName:item.card.setName || 'Set non specificato', marketPrice:Number(item.marketPrice || 0), stock:item.quantity, condition:item.condition }))).sort((a,b)=>new Date(b.reservedAt).getTime()-new Date(a.reservedAt).getTime())
  } catch(e) { error.value = e instanceof Error ? e.message : 'Impossibile caricare le prenotazioni' }
  finally { loading.value = false }
}
async function update(row: ReservationRow, status: 'SOLD'|'CANCELLED') {
  const prompt = status === 'SOLD' ? `Registrare la vendita di ${row.quantity} copia/e di ${row.cardName}? Lo stock sarà scaricato.` : `Annullare la prenotazione di ${row.cardName}?`
  if (!window.confirm(prompt)) return
  busyId.value = row.id; error.value=''; success.value=''
  try {
    await updateReservationStatus(row.inventoryItemId,row.id,status)
    success.value = status === 'SOLD' ? 'Vendita registrata e copie scaricate dal magazzino.' : 'Prenotazione annullata e copie rese disponibili.'
    await load()
  } catch(e) { error.value = e instanceof Error ? e.message : 'Aggiornamento non riuscito' }
  finally { busyId.value = '' }
}
onMounted(load)
</script>
<template>
<section class="page-content reservation-page">
  <div class="page-heading"><div><p class="eyebrow">GESTIONE VENDITE</p><h1>Prenotazioni</h1><p class="subtitle">Gestisci le carte messe da parte per i clienti e registra le vendite.</p></div><button class="primary-button" @click="$router.push('/inventory')"><i class="pi pi-plus"></i> Nuova prenotazione</button></div>
  <div v-if="error" class="dashboard-error" role="alert">{{ error }}</div><div v-if="success" class="reservation-success" role="status">{{ success }}</div>
  <div class="reservation-summary"><article class="metric-card metric-pink"><div class="metric-top"><i class="pi pi-calendar"></i><span>Prenotazioni attive</span></div><div class="metric-value">{{ loading ? '…' : activeCount }}</div><div class="metric-note">In attesa o confermate</div></article><article class="metric-card metric-green"><div class="metric-top"><i class="pi pi-wallet"></i><span>Valore riservato</span></div><div class="metric-value">{{ loading ? '…' : money(activeValue) }}</div><div class="metric-note">Valore stimato CardTrader</div></article></div>
  <div class="reservation-toolbar"><div class="reservation-filters"><button v-for="item in [{key:'ACTIVE',label:'Attive'},{key:'ALL',label:'Tutte'},{key:'SOLD',label:'Vendute'},{key:'CANCELLED',label:'Annullate'}]" :key="item.key" :class="{selected:filter===item.key}" @click="filter=item.key as typeof filter">{{ item.label }}</button></div><button class="secondary-button" @click="load" :disabled="loading"><i class="pi pi-refresh"></i> Aggiorna</button></div>
  <div class="reservation-list">
    <article v-for="row in filtered" :key="row.id" class="reservation-card">
      <div class="reservation-card-main"><div class="reservation-card-icon"><i class="pi pi-bookmark"></i></div><div class="reservation-details"><h3>{{ row.cardName }}</h3><p>{{ row.setName }} · {{ row.condition }} · {{ row.quantity }} {{ row.quantity===1?'copia':'copie' }}</p><p class="reservation-customer"><i class="pi pi-user"></i> {{ row.customer }} <span>·</span> {{ new Intl.DateTimeFormat('it-IT',{dateStyle:'medium',timeStyle:'short'}).format(new Date(row.reservedAt)) }}</p></div></div>
      <div class="reservation-card-side"><strong>{{ money(row.marketPrice*row.quantity) }}</strong><span class="reservation-status" :class="'status-'+row.status.toLowerCase()">{{ row.status==='RESERVED'?'Riservata':row.status==='CONFIRMED'?'Confermata':row.status==='SOLD'?'Venduta':'Annullata' }}</span><div v-if="['RESERVED','CONFIRMED'].includes(row.status)" class="reservation-actions"><button class="secondary-button" :disabled="busyId===row.id" @click="update(row,'CANCELLED')">Annulla</button><button class="primary-button" :disabled="busyId===row.id" @click="update(row,'SOLD')"><i class="pi pi-check"></i> Registra vendita</button></div></div>
    </article>
    <div v-if="!loading && filtered.length===0" class="reservation-empty"><i class="pi pi-inbox"></i><strong>Nessuna prenotazione {{ filter==='ACTIVE'?'attiva':'' }}</strong><span>Le prenotazioni delle carte compariranno qui.</span><RouterLink to="/inventory">Vai al magazzino</RouterLink></div>
    <div v-if="loading" class="reservation-empty">Caricamento prenotazioni…</div>
  </div>
</section>
</template>