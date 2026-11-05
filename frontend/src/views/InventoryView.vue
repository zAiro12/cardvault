<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { addInventory, createCard, getInventory, type Game, type InventoryRecord } from '../services/api'

const rows = ref<InventoryRecord[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const success = ref('')
const search = ref('')
const showForm = ref(false)
const form = ref({ game: 'MAGIC' as Game, name: '', setName: '', collectorNumber: '', language: 'it', foil: false, quantity: 1, condition: 'NM', purchasePrice: '', marketPrice: '', location: '', notes: '' })

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  return rows.value.filter(row => !term || row.card.name.toLowerCase().includes(term) || (row.card.setName || '').toLowerCase().includes(term) || (row.location?.name || '').toLowerCase().includes(term))
})
const available = (row: InventoryRecord) => row.quantity - (row.reservations || []).filter(r => ['RESERVED', 'CONFIRMED'].includes(r.status)).reduce((sum, r) => sum + r.quantity, 0)
const euro = (value: unknown) => value == null || value === '' ? '—' : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(value))

async function load() {
  loading.value = true
  error.value = ''
  try { rows.value = await getInventory() } catch (e) { error.value = e instanceof Error ? e.message : 'Impossibile caricare inventario' }
  finally { loading.value = false }
}
async function save() {
  if (!form.value.name.trim()) { error.value = 'Inserisci il nome della carta.'; return }
  saving.value = true; error.value = ''; success.value = ''
  try {
    const card = await createCard({ game: form.value.game, name: form.value.name.trim(), setName: form.value.setName.trim() || undefined, collectorNumber: form.value.collectorNumber.trim() || undefined, language: form.value.language, foil: form.value.foil })
    await addInventory({ cardId: card.id, quantity: form.value.quantity, condition: form.value.condition, purchasePrice: form.value.purchasePrice === '' ? undefined : Number(form.value.purchasePrice), marketPrice: form.value.marketPrice === '' ? undefined : Number(form.value.marketPrice), location: form.value.location.trim() || undefined, notes: form.value.notes.trim() || undefined })
    success.value = 'Carta aggiunta al magazzino.'
    showForm.value = false
    form.value = { game: 'MAGIC', name: '', setName: '', collectorNumber: '', language: 'it', foil: false, quantity: 1, condition: 'NM', purchasePrice: '', marketPrice: '', location: '', notes: '' }
    await load()
  } catch (e) { error.value = e instanceof Error ? e.message : 'Errore durante il salvataggio' }
  finally { saving.value = false }
}
async function remove(row: InventoryRecord) {
  if (!window.confirm(`Rimuovere ${row.card.name} dal magazzino?`)) return
  try { await (await import('../services/api')).deleteInventory(row.id); await load() }
  catch (e) { error.value = e instanceof Error ? e.message : 'Errore durante la rimozione' }
}
onMounted(load)
</script>

<template>
  <section class="page-content">
    <div class="page-heading">
      <div><p class="eyebrow">GESTIONE CARTE</p><h1>Inventario</h1><p class="subtitle">Le carte e le loro copie fisiche nel tuo magazzino.</p></div>
      <button class="primary-button" @click="showForm = !showForm"><i class="pi pi-plus"></i> {{ showForm ? 'Chiudi' : 'Aggiungi carta' }}</button>
    </div>
    <div v-if="showForm" class="panel form-panel">
      <div class="panel-heading"><div><h2>Nuova carta in magazzino</h2><p>Inserisci i dettagli e la quantità iniziale.</p></div></div>
      <form class="card-form" @submit.prevent="save">
        <label>Gioco<select v-model="form.game"><option value="MAGIC">Magic: The Gathering</option><option value="POKEMON">Pokémon</option><option value="YU_GI_OH">Yu-Gi-Oh!</option><option value="LORCANA">Lorcana</option><option value="OTHER">Altro</option></select></label>
        <label>Nome carta *<input v-model="form.name" required maxlength="200" placeholder="Es. Black Lotus"/></label>
        <label>Set / espansione<input v-model="form.setName" placeholder="Es. Alpha"/></label>
        <label>Numero collezione<input v-model="form.collectorNumber" placeholder="Es. 232/280"/></label>
        <label>Lingua<select v-model="form.language"><option value="it">Italiano</option><option value="en">Inglese</option><option value="ja">Giapponese</option><option value="fr">Francese</option><option value="de">Tedesco</option><option value="es">Spagnolo</option></select></label>
        <label>Condizione<select v-model="form.condition"><option value="NM">Near Mint</option><option value="LP">Light Played</option><option value="MP">Moderately Played</option><option value="HP">Heavy Played</option><option value="DMG">Damaged</option></select></label>
        <label>Quantità<input v-model.number="form.quantity" type="number" min="1" max="100000" required/></label>
        <label>Prezzo acquisto (€)<input v-model="form.purchasePrice" type="number" min="0" step="0.01" placeholder="0,00"/></label>
        <label>Prezzo mercato (€)<input v-model="form.marketPrice" type="number" min="0" step="0.01" placeholder="0,00"/></label>
        <label>Posizione fisica<input v-model="form.location" placeholder="Es. Binder A, pagina 4"/></label>
        <label class="wide">Note<textarea v-model="form.notes" rows="2" placeholder="Note facoltative"/></label>
        <label class="checkbox-label"><input v-model="form.foil" type="checkbox"/> Foil / Holo</label>
        <div class="wide form-actions"><button class="primary-button" type="submit" :disabled="saving">{{ saving ? 'Salvataggio…' : 'Salva nel magazzino' }}</button></div>
      </form>
    </div>
    <p v-if="error" class="notice error">{{ error }}</p><p v-if="success" class="notice success">{{ success }}</p>
    <div class="panel inventory-panel">
      <div class="inventory-toolbar"><input v-model="search" placeholder="Cerca carta, set o posizione…"/><span>{{ filtered.length }} voci</span></div>
      <div v-if="loading" class="empty-activity">Caricamento inventario…</div>
      <div v-else-if="!filtered.length" class="empty-activity"><i class="pi pi-clone"></i><strong>{{ search ? 'Nessun risultato' : 'Magazzino vuoto' }}</strong><span>Usa “Aggiungi carta” per registrare la prima carta.</span></div>
      <div v-else class="table-wrap"><table class="inventory-table"><thead><tr><th>Carta</th><th>Set</th><th>Condizione</th><th>Quantità</th><th>Disponibili</th><th>Prezzo</th><th>Posizione</th><th></th></tr></thead><tbody><tr v-for="row in filtered" :key="row.id"><td><strong>{{ row.card.name }}</strong><small>{{ row.card.game }} · {{ row.card.language.toUpperCase() }}<span v-if="row.card.foil"> · Foil</span></small></td><td>{{ row.card.setName || '—' }}<small>{{ row.card.collectorNumber || '' }}</small></td><td>{{ row.condition }}</td><td>{{ row.quantity }}</td><td>{{ available(row) }}</td><td>{{ euro(row.marketPrice) }}</td><td>{{ row.location?.name || 'Non assegnata' }}</td><td><button class="icon-button" title="Rimuovi" @click="remove(row)"><i class="pi pi-trash"></i></button></td></tr></tbody></table></div>
    </div>
  </section>
</template>

<style scoped>
.form-panel{margin-bottom:20px}.card-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:18px}.card-form label{display:flex;flex-direction:column;gap:7px;color:var(--muted);font-size:13px}.card-form input,.card-form select,.card-form textarea,.inventory-toolbar input{width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);font:inherit}.card-form .wide{grid-column:1/-1}.checkbox-label{flex-direction:row!important;align-items:center}.checkbox-label input{width:auto}.form-actions{display:flex;justify-content:flex-end}.notice{padding:12px 14px;border-radius:10px;margin:12px 0}.error{color:#fca5a5;background:#451a1a}.success{color:#86efac;background:#143321}.inventory-toolbar{display:flex;gap:14px;align-items:center;padding-bottom:16px}.inventory-toolbar input{max-width:480px}.inventory-toolbar span{color:var(--muted);font-size:13px}.table-wrap{overflow-x:auto}.inventory-table{width:100%;border-collapse:collapse;text-align:left}.inventory-table th,.inventory-table td{padding:13px 10px;border-bottom:1px solid var(--border);font-size:13px;white-space:nowrap}.inventory-table th{color:var(--muted);font-weight:600}.inventory-table td small{display:block;color:var(--muted);margin-top:4px}.icon-button{border:0;background:transparent;color:var(--muted);padding:8px;cursor:pointer}.icon-button:hover{color:#f87171}.empty-activity{min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;color:var(--muted)}@media(max-width:800px){.card-form{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){.card-form{grid-template-columns:1fr}}
</style>