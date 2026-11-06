<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { addInventory, autocompleteCards, createCard, createReservation as apiCreateReservation, getCardTraderMarketPrice, getInventory, getCardImage, updateInventory, updateReservationStatus, type CardSuggestion, type Game, type InventoryRecord } from '../services/api'

const rows = ref<InventoryRecord[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const success = ref('')
const search = ref('')
const showForm = ref(false)
const reservingRow = ref<InventoryRecord | null>(null)
const editingRow = ref<InventoryRecord | null>(null)
const editSaving = ref(false)
const editImageUrl = ref<string | null>(null)
const editForm = ref({ quantity: 1, condition: 'NM', purchasePrice: '', marketPrice: '', location: '', notes: '' })
const reservationImageUrl = ref<string | null>(null)
const reservationCustomer = ref('')
const reservationQuantity = ref(1)
const reservationSaving = ref(false)
const form = ref({ game: 'MAGIC' as Game, name: '', setName: '', collectorNumber: '', language: 'it', foil: false, quantity: 1, condition: 'NM', purchasePrice: '', marketPrice: '', location: '', notes: '' })
const suggestions = ref<CardSuggestion[]>([])
const searchingCards = ref(false)
const selectedPrint = ref<CardSuggestion | null>(null)
let autocompleteTimer: ReturnType<typeof setTimeout> | undefined
watch(() => [form.value.name, form.value.game] as const, ([name, game]) => {
  // Quando il nome viene impostato cliccando un risultato, non riaprire il menu.
  if (selectedPrint.value && name === selectedPrint.value.name) return
  selectedPrint.value = null
  suggestions.value = []
  if (autocompleteTimer) clearTimeout(autocompleteTimer)
  if (game !== 'MAGIC' || name.trim().length < 2) return
  autocompleteTimer = setTimeout(async () => {
    searchingCards.value = true
    try { suggestions.value = await autocompleteCards(name.trim(), game) }
    catch (e) { error.value = e instanceof Error ? e.message : 'Catalogo carte non raggiungibile' }
    finally { searchingCards.value = false }
  }, 350)
})
async function selectPrint(print: CardSuggestion) {
  selectedPrint.value = print
  form.value.name = print.name
  form.value.setName = print.setName
  form.value.collectorNumber = print.collectorNumber
  form.value.language = print.language
  form.value.foil = print.foil
  form.value.marketPrice = ''
  suggestions.value = []
  error.value = ''
  try {
    const price = await getCardTraderMarketPrice({ scryfallId: print.scryfallId, cardName: print.oracleName, setCode: print.setCode, language: print.language, foil: print.foil })
    // Avoid overwriting the price if user has already selected a different print.
    if (selectedPrint.value?.scryfallId === print.scryfallId && price !== null) form.value.marketPrice = price
  } catch (e) { error.value = e instanceof Error ? e.message : 'Prezzo CardTrader non recuperabile' }
}


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
async function startEdit(row: InventoryRecord) { editingRow.value = row; editImageUrl.value = null; try { editImageUrl.value = await getCardImage(row.card.name, row.card.language || 'en') } catch { editImageUrl.value = null }; editForm.value = { quantity: row.quantity, condition: row.condition, purchasePrice: row.purchasePrice == null ? '' : String(row.purchasePrice), marketPrice: row.marketPrice == null ? '' : String(row.marketPrice), location: row.location?.name || '', notes: row.notes || '' }; error.value = '' }
async function saveEdit() { if (!editingRow.value) return; editSaving.value = true; error.value = ''; success.value = ''; try { await updateInventory(editingRow.value.id, { quantity: Number(editForm.value.quantity), condition: editForm.value.condition, purchasePrice: editForm.value.purchasePrice === '' ? null : Number(editForm.value.purchasePrice), marketPrice: editForm.value.marketPrice === '' ? null : Number(editForm.value.marketPrice), location: editForm.value.location.trim() || null, notes: editForm.value.notes.trim() || null }); editingRow.value = null; success.value = 'Item di magazzino aggiornato.'; await load() } catch (e) { error.value = e instanceof Error ? e.message : 'Errore durante la modifica' } finally { editSaving.value = false } }
async function openReservation(row: InventoryRow) { reservingRow.value = row; reservationCustomer.value = ''; reservationQuantity.value = 1; reservationImageUrl.value = null; try { reservationImageUrl.value = await getCardImage(row.card.name, row.card.language || 'en') } catch { reservationImageUrl.value = null } }
async function reserve() {
  if (!reservingRow.value || !reservationCustomer.value.trim()) { error.value = 'Inserisci il nome del cliente.'; return }
  reservationSaving.value = true; error.value = ''
  try {
    await apiCreateReservation(reservingRow.value.id, { customer: reservationCustomer.value.trim(), quantity: reservationQuantity.value })
    success.value = 'Prenotazione creata.'
    reservingRow.value = null; reservationCustomer.value = ''; reservationQuantity.value = 1
    await load()
  } catch (e) { error.value = e instanceof Error ? e.message : 'Errore durante la prenotazione' }
  finally { reservationSaving.value = false }
}
async function changeReservation(row: InventoryRecord, reservationId: string, status: 'SOLD' | 'CANCELLED') {
  const action = status === 'SOLD' ? 'concludere la vendita e scaricare le copie' : 'annullare la prenotazione'
  if (!window.confirm(`Vuoi ${action}?`)) return
  try { await updateReservationStatus(row.id, reservationId, status); success.value = status === 'SOLD' ? 'Vendita registrata e stock aggiornato.' : 'Prenotazione annullata.'; await load() }
  catch (e) { error.value = e instanceof Error ? e.message : 'Errore aggiornamento prenotazione' }
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
        <label class="autocomplete-field">Nome carta *<input v-model="form.name" required maxlength="200" placeholder="Digita almeno 2 caratteri (Magic)" autocomplete="off"/><span v-if="searchingCards" class="autocomplete-status">Ricerca nel catalogo…</span><div v-if="suggestions.length" class="suggestions"><button v-for="print in suggestions" :key="print.scryfallId" type="button" class="suggestion" @click="selectPrint(print)"><img v-if="print.imageUrl" :src="print.imageUrl" alt=""/><span><strong>{{ print.name }}</strong><small>{{ print.setName }} · {{ print.setCode.toUpperCase() }} · #{{ print.collectorNumber }} · {{ print.language.toUpperCase() }}<span v-if="print.foil"> · Foil</span></small></span><b>{{ euro(print.marketPrice) }}</b></button></div><span v-if="selectedPrint" class="selected-print">Stampa selezionata dal catalogo</span></label>
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
    <div v-if="editingRow" class="modal-backdrop" @click.self="editingRow = null"><section class="reservation-modal edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-inventory-title"><button class="modal-close" type="button" aria-label="Chiudi" @click="editingRow = null"><i class="pi pi-times"></i></button><div class="modal-card-header"><div class="modal-card-art card-image-art"><img v-if="editImageUrl" :src="editImageUrl" :alt="editingRow.card.name" /><i v-else class="pi pi-image"></i></div><div class="modal-heading-copy"><p class="eyebrow"><i class="pi pi-box"></i> MODIFICA ITEM</p><h2 id="edit-inventory-title">{{ editingRow.card.name }}</h2><p class="modal-card-name">{{ editingRow.card.setName || "Espansione non specificata" }} <span v-if="editingRow.card.collectorNumber">· #{{ editingRow.card.collectorNumber }}</span></p></div></div><form class="reservation-form" @submit.prevent="saveEdit"><label>Quantità<input v-model.number="editForm.quantity" type="number" min="0" max="100000" required/></label><label>Condizione<select v-model="editForm.condition"><option value="NM">Near Mint</option><option value="LP">Light Played</option><option value="MP">Moderately Played</option><option value="HP">Heavy Played</option><option value="DMG">Damaged</option></select></label><label>Prezzo acquisto (€)<input v-model="editForm.purchasePrice" type="number" min="0" step="0.01" placeholder="0,00"/></label><label>Prezzo mercato (€)<input v-model="editForm.marketPrice" type="number" min="0" step="0.01" placeholder="0,00"/></label><label>Posizione fisica<input v-model="editForm.location" maxlength="200" placeholder="Binder, box, scaffale…"/></label><label>Note<textarea v-model="editForm.notes" rows="3" maxlength="2000" placeholder="Note facoltative"/></label><button class="primary-button modal-submit" type="submit" :disabled="editSaving || editForm.quantity < 0">{{ editSaving ? "Salvataggio…" : "Salva modifiche" }}</button><button class="modal-cancel" type="button" @click="editingRow = null">Annulla</button></form></section></div><div v-if="reservingRow" class="modal-backdrop" @click.self="reservingRow = null">
      <section class="reservation-modal" role="dialog" aria-modal="true" aria-labelledby="reservation-title">
        <button class="modal-close" type="button" aria-label="Chiudi popup" @click="reservingRow = null"><i class="pi pi-times"></i></button>
        <div class="modal-card-header">
          <div class="modal-card-art card-image-art"><img v-if="reservationImageUrl" :src="reservationImageUrl" :alt="reservingRow.card.name" /><i v-else class="pi pi-image"></i></div>
          <div class="modal-heading-copy"><p class="eyebrow"><i class="pi pi-box"></i> MAGAZZINO · PRENOTAZIONE</p>
            <p class="reservation-intro">Prenota questa carta</p>
            <h2 id="reservation-title" class="reservation-card-title">{{ reservingRow.card.name }}</h2>
          </div>
        </div>
        <div class="availability-pill"><i class="pi pi-clone"></i><span>Copie disponibili</span><strong>{{ available(reservingRow) }}</strong></div>
        <form class="reservation-form" @submit.prevent="reserve">
          <label>Nome cliente<input v-model="reservationCustomer" required maxlength="200" placeholder="A chi la stai riservando?" autocomplete="name"/></label>
          <label>Quantità copie<div class="quantity-stepper"><button type="button" aria-label="Diminuisci quantità" :disabled="reservationQuantity <= 1" @click="reservationQuantity = Math.max(1, reservationQuantity - 1)">−</button><input v-model.number="reservationQuantity" type="number" min="1" :max="available(reservingRow)" required/><button type="button" aria-label="Aumenta quantità" :disabled="reservationQuantity >= available(reservingRow)" @click="reservationQuantity = Math.min(available(reservingRow), reservationQuantity + 1)">+</button></div></label>
          <p v-if="reservationQuantity > available(reservingRow)" class="modal-error">Quantità superiore alle copie disponibili.</p>
          <button class="primary-button modal-submit" type="submit" :disabled="reservationSaving || reservationQuantity > available(reservingRow) || reservationQuantity < 1 || !reservationCustomer.trim()"><i class="pi pi-check"></i> {{ reservationSaving ? 'Salvataggio…' : 'Conferma prenotazione' }}</button>
          <button class="modal-cancel" type="button" @click="reservingRow = null">Annulla</button>
        </form>
      </section>
    </div>
    <div class="panel inventory-panel">
      <div class="inventory-toolbar"><input v-model="search" placeholder="Cerca carta, set o posizione…"/><span>{{ filtered.length }} voci</span></div>
      <div v-if="loading" class="empty-activity">Caricamento inventario…</div>
      <div v-else-if="!filtered.length" class="empty-activity"><i class="pi pi-clone"></i><strong>{{ search ? 'Nessun risultato' : 'Magazzino vuoto' }}</strong><span>Usa “Aggiungi carta” per registrare la prima carta.</span></div>
      <div v-else class="table-wrap"><table class="inventory-table"><thead><tr><th>Carta</th><th>Set</th><th>Condizione</th><th>Quantità</th><th>Disponibili</th><th>Prenotazioni</th><th>Prezzo</th><th>Posizione</th><th></th></tr></thead><tbody><tr v-for="row in filtered" :key="row.id"><td><strong>{{ row.card.name }}</strong><small>{{ row.card.game }} · {{ row.card.language.toUpperCase() }}<span v-if="row.card.foil"> · Foil</span></small></td><td>{{ row.card.setName || '—' }}<small>{{ row.card.collectorNumber || '' }}</small></td><td>{{ row.condition }}</td><td>{{ row.quantity }}</td><td>{{ available(row) }}</td><td class="reservation-cell"><button class="secondary-button reserve-button" type="button" :disabled="available(row) <= 0" @click="openReservation(row)">+ Prenota</button><div v-for="reservation in row.reservations || []" :key="reservation.id" class="reservation-entry"><span><strong>{{ reservation.customer }}</strong><small>{{ reservation.quantity }} · {{ reservation.status }}</small></span><span v-if="['RESERVED','CONFIRMED'].includes(reservation.status)" class="reservation-actions"><button type="button" title="Segna venduta" @click="changeReservation(row, reservation.id, 'SOLD')">Venduta</button><button type="button" title="Annulla" @click="changeReservation(row, reservation.id, 'CANCELLED')">Annulla</button></span></div></td><td>{{ euro(row.marketPrice) }}</td><td>{{ row.location?.name || 'Non assegnata' }}</td><td class="item-actions"><button class="icon-button edit-action" title="Modifica item" aria-label="Modifica item" @click="startEdit(row)"><i class="pi pi-pencil"></i></button><button class="icon-button" title="Rimuovi" aria-label="Rimuovi item" @click="remove(row)"><i class="pi pi-trash"></i></button></td></tr></tbody></table></div>
    </div>
  </section>
</template>

<style scoped>
.modal-backdrop{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(7,9,18,.78);backdrop-filter:blur(10px)}
.reservation-modal{position:relative;width:min(100%,560px);max-height:min(92dvh,820px);overflow:auto;padding:34px;border:1px solid rgba(145,126,255,.42);border-radius:28px;background:radial-gradient(ellipse at 8% 0%,rgba(120,94,255,.12),transparent 42%),var(--surface);box-shadow:0 28px 90px rgba(0,0,0,.55),0 0 0 1px rgba(140,120,255,.05);animation:modal-in .2s ease-out}
.modal-close{position:absolute;top:18px;right:18px;width:42px;height:42px;display:grid;place-items:center;border:1px solid var(--border);border-radius:14px;background:rgba(255,255,255,.025);color:var(--muted);font-size:17px;cursor:pointer;transition:.18s}.modal-close:hover{background:rgba(145,126,255,.15);color:var(--text);border-color:#8976ef}
.modal-card-header{display:flex;align-items:center;gap:22px;padding:2px 44px 24px 0}.modal-card-art{position:relative;flex:0 0 88px;height:122px;display:grid;place-items:center;overflow:hidden;border:1px solid #8d7aff;border-radius:17px;background:linear-gradient(145deg,#342c60,#171a2a 65%,#40315e);box-shadow:0 8px 22px #0004;color:#b7a7ff;font-size:32px}.modal-card-art:before,.modal-card-art:after{content:"";position:absolute;border-radius:50%;filter:blur(1px)}.modal-card-art:before{width:90px;height:90px;right:-30px;top:-20px;background:rgba(171,110,255,.24)}.modal-card-art:after{width:80px;height:80px;left:-30px;bottom:-25px;background:rgba(93,120,255,.2)}.modal-card-art i{z-index:1}.card-image-art{background:transparent;padding:0;border:0;box-shadow:none;overflow:visible}.card-image-art img{display:block;width:100%;height:100%;object-fit:contain;border-radius:8px;filter:drop-shadow(0 9px 18px #0006)}.modal-heading-copy{min-width:0}.reservation-modal .eyebrow{margin:0 0 12px;font-size:10px;letter-spacing:1.35px;color:#a99aff;font-weight:800}.reservation-modal .eyebrow i{margin-right:5px}.reservation-modal h2{font-size:clamp(21px,4vw,28px);line-height:1.2;margin:0 0 8px;color:var(--text);letter-spacing:-.5px}.modal-card-name{font-size:15px;line-height:1.45;color:var(--muted);margin:0;overflow-wrap:anywhere}
.availability-pill{display:flex;align-items:center;gap:13px;width:100%;padding:15px 17px;border:1px solid rgba(145,126,255,.32);border-radius:16px;background:rgba(133,111,255,.07);color:var(--text);font-size:14px;margin:0 0 26px}.availability-pill i{font-size:20px;color:#b4a4ff}.availability-pill span{font-weight:600}.availability-pill strong{margin-left:auto;min-width:46px;text-align:center;padding:5px 11px;border:1px solid rgba(67,207,139,.5);border-radius:999px;background:rgba(49,184,115,.12);color:#68e5a1;font-size:18px}
.reservation-modal .reservation-form{display:flex;flex-direction:column;align-items:stretch;gap:19px;margin:0}.reservation-modal .reservation-form label{display:flex;flex-direction:column;gap:9px;min-width:0;color:var(--text);font-size:14px;font-weight:650}.reservation-modal .reservation-form label:before{content:"";display:none}.reservation-modal .reservation-form input{width:100%;min-height:54px;padding:13px 15px;border:1px solid rgba(139,143,173,.45);border-radius:13px;background:rgba(255,255,255,.025);color:var(--text);font:inherit;font-size:15px;transition:border-color .18s,box-shadow .18s}.reservation-modal .reservation-form input::placeholder{color:var(--muted);opacity:.8}.reservation-modal .reservation-form input:focus{outline:none;border-color:#9580ff;box-shadow:0 0 0 3px rgba(149,128,255,.14)}
.quantity-stepper{display:grid;grid-template-columns:56px minmax(0,1fr) 56px;gap:10px}.reservation-modal .quantity-stepper button{min-height:54px;border:1px solid rgba(139,143,173,.35);border-radius:13px;background:rgba(145,126,255,.08);color:#b29cff;font-size:25px;font-weight:600;cursor:pointer;transition:.18s}.reservation-modal .quantity-stepper button:hover:not(:disabled){background:rgba(145,126,255,.2);border-color:#9580ff}.reservation-modal .quantity-stepper button:disabled{opacity:.3;cursor:not-allowed}.reservation-modal .quantity-stepper input{text-align:center;font-size:19px;font-weight:700}
.modal-submit{width:100%;min-height:58px;display:flex;align-items:center;gap:10px;justify-content:center;border-radius:15px!important;background:linear-gradient(110deg,#8c5cf6,#7355e9)!important;box-shadow:0 8px 24px rgba(119,87,235,.25);font-size:15px;font-weight:750;transition:transform .15s,box-shadow .15s}.modal-submit:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 12px 30px rgba(119,87,235,.35)}.modal-submit:disabled{opacity:.45;box-shadow:none}.modal-cancel{width:100%;min-height:48px;border:1px solid rgba(139,143,173,.35);border-radius:14px;background:transparent;color:var(--text);font-size:14px;font-weight:650;cursor:pointer;transition:.18s}.modal-cancel:hover{background:rgba(255,255,255,.04);border-color:#9580ff}.modal-error{margin:0;color:#fca5a5;font-size:12px}
@keyframes modal-in{from{opacity:0;transform:translateY(12px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
@media(max-width:600px){.modal-backdrop{align-items:flex-end;padding:0}.reservation-modal{width:100%;max-height:94dvh;padding:25px 22px calc(20px + env(safe-area-inset-bottom));border-radius:25px 25px 0 0;border-bottom:0}.modal-card-header{gap:15px;padding-right:35px;padding-bottom:20px}.modal-card-art{flex-basis:68px;height:94px;border-radius:13px}.reservation-modal .eyebrow{font-size:9px;letter-spacing:1px}.reservation-modal h2{font-size:22px}.modal-card-name{font-size:13px}.availability-pill{margin-bottom:22px;padding:13px 14px}.reservation-modal .reservation-form{gap:17px}.reservation-modal .reservation-form input,.reservation-modal .quantity-stepper button{min-height:50px}.modal-submit{min-height:54px}}
.form-panel{margin-bottom:20px}.reservation-cell{min-width:190px}.reserve-button{padding:5px 9px!important;font-size:11px!important;margin-bottom:4px}.reservation-entry{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:5px 0}.reservation-entry strong,.reservation-entry small{display:block}.reservation-entry small{font-size:10px;color:var(--muted)}.reservation-actions{display:flex;gap:3px}.reservation-actions button{border:1px solid var(--border);border-radius:5px;background:transparent;color:var(--text);padding:3px 5px;font-size:10px;cursor:pointer}.autocomplete-field{position:relative}.autocomplete-status,.selected-print{font-size:11px;color:var(--muted)}.suggestions{position:absolute;top:100%;left:0;right:0;z-index:20;max-height:340px;overflow:auto;background:var(--surface);border:1px solid var(--border);border-radius:10px;box-shadow:0 12px 32px #0004}.suggestion{width:100%;display:flex;align-items:center;gap:10px;padding:8px;border:0;border-bottom:1px solid var(--border);background:transparent;color:var(--text);text-align:left;cursor:pointer}.suggestion:hover{background:var(--surface-hover,rgba(120,120,120,.12))}.suggestion img{width:38px;height:52px;object-fit:cover;border-radius:4px}.suggestion span{min-width:0;flex:1}.suggestion strong,.suggestion small{display:block}.suggestion small{color:var(--muted);font-size:11px;margin-top:3px}.suggestion b{font-size:12px;white-space:nowrap}.card-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:18px}.card-form label{display:flex;flex-direction:column;gap:7px;color:var(--muted);font-size:13px}.card-form input,.card-form select,.card-form textarea,.inventory-toolbar input{width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);font:inherit}.card-form .wide{grid-column:1/-1}.checkbox-label{flex-direction:row!important;align-items:center}.checkbox-label input{width:auto}.form-actions{display:flex;justify-content:flex-end}.notice{padding:12px 14px;border-radius:10px;margin:12px 0}.error{color:#fca5a5;background:#451a1a}.success{color:#86efac;background:#143321}.inventory-toolbar{display:flex;gap:14px;align-items:center;padding-bottom:16px}.inventory-toolbar input{max-width:480px}.inventory-toolbar span{color:var(--muted);font-size:13px}.table-wrap{overflow-x:auto}.inventory-table{width:100%;border-collapse:collapse;text-align:left}.inventory-table th,.inventory-table td{padding:13px 10px;border-bottom:1px solid var(--border);font-size:13px;white-space:nowrap}.inventory-table th{color:var(--muted);font-weight:600}.inventory-table td small{display:block;color:var(--muted);margin-top:4px}.icon-button{border:0;background:transparent;color:var(--muted);padding:8px;cursor:pointer}.icon-button:hover{color:#f87171}.item-actions{display:flex;gap:5px}.edit-action:hover{color:#a99aff}.edit-modal .reservation-form textarea,.edit-modal .reservation-form select{width:100%;min-height:48px;padding:12px 14px;border:1px solid rgba(139,143,173,.45);border-radius:13px;background:rgba(255,255,255,.025);color:var(--text);font:inherit}.edit-modal .reservation-form textarea{resize:vertical}.empty-activity{min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;color:var(--muted)}@media(max-width:800px){.card-form{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){.card-form{grid-template-columns:1fr}}

/* Keep reservation modal typography consistent with the inventory edit modal: action first, card name prominent below. */
.reservation-modal .modal-heading-copy .reservation-intro{margin:0 0 5px;color:var(--muted);font-size:15px;font-weight:600;line-height:1.35;}
.reservation-modal .modal-heading-copy h2.reservation-card-title{margin:0;color:var(--text);font-size:clamp(23px,3.4vw,28px);font-weight:750;line-height:1.2;letter-spacing:-.45px;overflow-wrap:anywhere;}
@media(max-width:600px){.reservation-modal .modal-heading-copy .reservation-intro{font-size:13px;margin-bottom:4px}.reservation-modal .modal-heading-copy h2.reservation-card-title{font-size:22px;}}
</style>