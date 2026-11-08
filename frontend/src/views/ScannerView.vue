<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { createWorker, PSM } from 'tesseract.js'
import { addInventory, autocompleteCards, createCard, getCardTraderMarketPrice, recognizeCardImage, type CardSuggestion } from '../services/api'

const video = ref<HTMLVideoElement | null>(null)
const stream = ref<MediaStream | null>(null)
const cameraError = ref('')
const cameraActive = ref(false)
const capturedImage = ref('')
const query = ref('')
const searching = ref(false)
const suggestions = ref<CardSuggestion[]>([])
const selected = ref<CardSuggestion | null>(null)
const quantity = ref(1)
const condition = ref('NM')
const location = ref('')
const saving = ref(false)
const error = ref('')
const success = ref('')
const reading = ref(false)
const readingStatus = ref('')
const ocrText = ref('')
let ocrWorker: Awaited<ReturnType<typeof createWorker>> | null = null
const game = ref<'MAGIC'|'POKEMON'|'YU_GI_OH'|'LORCANA'|'OTHER'>('MAGIC')
const canUseCamera = computed(() => !!navigator.mediaDevices?.getUserMedia)

async function startCamera() {
  cameraError.value = ''
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.value = 'Fotocamera non disponibile. Apri CardVault tramite HTTPS e usa un browser compatibile.'
    return
  }
  try {
    const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 60 } }, audio: false })
    stream.value = media
    cameraActive.value = true
    await nextTick()
    const element = video.value
    if (!element) {
      media.getTracks().forEach(track => track.stop())
      stream.value = null
      cameraActive.value = false
      cameraError.value = 'Anteprima video non disponibile. Riprova ad avviare la fotocamera.'
      return
    }
    element.srcObject = media
    element.setAttribute('playsinline', '')
    element.muted = true
    try { await element.play() }
    catch (playError) {
      cameraError.value = playError instanceof Error ? 'La fotocamera è stata aperta ma la preview non parte: ' + playError.message : 'Tocca Avvia fotocamera e consenti la riproduzione video.'
    }
  } catch (e) {
    cameraError.value = e instanceof Error ? e.message : 'Impossibile accedere alla fotocamera. Controlla i permessi del browser.'
  }
}
function stopCamera() {
  stream.value?.getTracks().forEach(track => track.stop())
  stream.value = null
  cameraActive.value = false
}
function capture() {
  if (!video.value) return
  const canvas = document.createElement('canvas')
  const sourceWidth = video.value.videoWidth
  const sourceHeight = video.value.videoHeight
  const scale = Math.min(1, 1600 / Math.max(sourceWidth, sourceHeight))
  canvas.width = Math.round(sourceWidth * scale)
  canvas.height = Math.round(sourceHeight * scale)
  canvas.getContext('2d')?.drawImage(video.value, 0, 0, canvas.width, canvas.height)
  capturedImage.value = canvas.toDataURL('image/jpeg', 0.84)
  stopCamera()
  void readCardText(canvas)
}
async function readCardText(canvas: HTMLCanvasElement) {
  reading.value = true
  readingStatus.value = 'Analisi visiva della carta…'
  error.value = ''
  ocrText.value = ''
  query.value = ''
  try {
    // Prefer vision model, which reads the printed title in context. This avoids
    // selecting collector numbers or type/rules text as the card name.
    const image = canvas.toDataURL('image/jpeg', 0.84)
    try {
      const result = await recognizeCardImage(image, game.value)
      ocrText.value = result.name ? `Titolo riconosciuto: ${result.name} (confidenza ${Math.round(result.confidence * 100)}%)` : result.notes || 'Il modello non ha individuato un titolo leggibile.'
      if (result.name && result.confidence >= 0.45) {
        query.value = result.name
        readingStatus.value = `Titolo identificato dall’AI (${Math.round(result.confidence * 100)}%): verifica e cerca nel catalogo.`
        await searchCards()
        return
      }
      readingStatus.value = 'AI: titolo incerto. Inserisci o correggi il nome prima della ricerca.'
      return
    } catch (visionError) {
      readingStatus.value = visionError instanceof Error && visionError.message.includes('OPENAI_API_KEY')
        ? 'AI non configurata sul backend: uso OCR locale come fallback.'
        : 'Riconoscimento AI non disponibile: uso OCR locale come fallback.'
    }

    if (!ocrWorker) {
      ocrWorker = await createWorker('eng', 1, { logger: event => {
        if (event.status === 'loading tesseract core') readingStatus.value = 'Caricamento motore OCR…'
        else if (event.status === 'loading language traineddata') readingStatus.value = 'Caricamento lingua…'
        else if (event.status === 'recognizing text') readingStatus.value = 'Analisi OCR…'
      } })
    }
    const titleCrop = document.createElement('canvas')
    const cropX = Math.round(canvas.width * 0.18)
    const cropY = Math.round(canvas.height * 0.08)
    const cropWidth = Math.round(canvas.width * 0.64)
    const cropHeight = Math.round(canvas.height * 0.18)
    titleCrop.width = cropWidth * 3
    titleCrop.height = cropHeight * 3
    const context = titleCrop.getContext('2d')
    if (!context) throw new Error('Impossibile preparare il ritaglio OCR')
    context.filter = 'grayscale(1) contrast(1.6)'
    context.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, titleCrop.width, titleCrop.height)
    context.filter = 'none'
    await ocrWorker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE, preserve_interword_spaces: '1' })
    const { data } = await ocrWorker.recognize(titleCrop)
    ocrText.value = data.text.trim()
    const candidate = data.text.replace(/[^\\p{L}\\p{N}’' -]/gu, ' ').replace(/\\s+/g, ' ').trim()
    if (candidate.length >= 3 && /\\p{L}/u.test(candidate)) {
      query.value = candidate
      readingStatus.value = 'Suggerimento OCR locale (da verificare): correggi il nome e cerca nel catalogo.'
    } else {
      readingStatus.value = 'OCR locale non ha letto il titolo. Inserisci il nome manualmente.'
    }
  } catch (e) {
    readingStatus.value = 'Lettura automatica non riuscita. Puoi inserire il nome manualmente.'
    error.value = e instanceof Error ? e.message : 'Errore OCR'
  } finally { reading.value = false }
}
function retake() { capturedImage.value = ''; ocrText.value = ''; readingStatus.value = ''; startCamera() }
async function searchCards() {
  if (query.value.trim().length < 2) { suggestions.value = []; return }
  searching.value = true; error.value = ''
  try { suggestions.value = await autocompleteCards(query.value.trim(), game.value) }
  catch (e) { error.value = e instanceof Error ? e.message : 'Ricerca catalogo non riuscita' }
  finally { searching.value = false }
}
function choose(print: CardSuggestion) { selected.value = print; suggestions.value = [] }
async function addToInventory() {
  if (!selected.value) return
  saving.value = true; error.value = ''; success.value = ''
  try {
    const print = selected.value
    const card = await createCard({ game: game.value, name: print.name, setName: print.setName, collectorNumber: print.collectorNumber, language: print.language, foil: print.foil })
    let marketPrice: number | undefined
    try {
      const price = await getCardTraderMarketPrice({ scryfallId: print.scryfallId, cardName: print.oracleName, setCode: print.setCode, language: print.language, foil: print.foil })
      if (price !== null) marketPrice = Number(price)
    } catch { /* price can be filled in later */ }
    await addInventory({ cardId: card.id, quantity: quantity.value, condition: condition.value, marketPrice, location: location.value.trim() || undefined })
    success.value = 'Carta aggiunta al magazzino!'
    selected.value = null; query.value = ''; capturedImage.value = ''; ocrText.value = ''; readingStatus.value = ''; quantity.value = 1; location.value = ''
  } catch (e) { error.value = e instanceof Error ? e.message : 'Salvataggio carta non riuscito' }
  finally { saving.value = false }
}
onBeforeUnmount(stopCamera)
</script>

<template>
  <section class="page-content scanner-page">
    <div class="page-heading">
      <div><p class="eyebrow">ACQUISIZIONE CARTE</p><h1>Scanner</h1><p class="subtitle">Scatta una foto, identifica la stampa nel catalogo e aggiungila al magazzino.</p></div>
    </div>
    <p v-if="error" class="notice error">{{ error }}</p><p v-if="success" class="notice success">{{ success }}</p>
    <div class="scanner-layout">
      <section class="panel scanner-camera-panel">
        <div class="panel-heading"><div><h2><i class="pi pi-camera"></i> Fotocamera</h2><p>Usa la fotocamera posteriore del dispositivo, se disponibile.</p></div></div>
        <div class="camera-stage">
          <video v-if="cameraActive" ref="video" autoplay muted playsinline></video>
          <img v-else-if="capturedImage" :src="capturedImage" alt="Foto acquisita della carta"/>
          <div v-else class="camera-placeholder"><i class="pi pi-camera"></i><strong>Pronto per scansionare</strong><span>Posiziona la carta al centro dell'inquadratura.</span></div>
          <div v-if="cameraActive" class="scan-frame" aria-hidden="true"><span></span></div>
        </div>
        <p v-if="cameraError" class="notice error">{{ cameraError }}</p><p v-if="readingStatus" class="scanner-hint" aria-live="polite">{{ readingStatus }}</p>
        <div class="camera-actions">
          <button v-if="!cameraActive && !capturedImage" class="primary-button" :disabled="!canUseCamera" @click="startCamera"><i class="pi pi-video"></i> Avvia fotocamera</button>
          <button v-if="cameraActive" class="primary-button" @click="capture"><i class="pi pi-camera"></i> Scatta foto</button>
          <button v-if="cameraActive" class="secondary-button" @click="stopCamera">Chiudi camera</button>
          <button v-if="capturedImage" class="secondary-button" @click="retake"><i class="pi pi-refresh"></i> Riprova</button>
        </div>
        <p class="scanner-hint"><i class="pi pi-info-circle"></i> La foto è una guida visiva: per ora la stampa viene confermata tramite ricerca catalogo.</p>
      </section>
      <section class="panel scanner-find-panel">
        <div class="panel-heading"><div><h2><i class="pi pi-search"></i> Identifica carta</h2><p>Seleziona gioco e cerca il nome per scegliere la stampa esatta.</p></div></div>
        <label>Gioco
          <select v-model="game" @change="selected = null; suggestions = []">
            <option value="MAGIC">Magic: The Gathering</option><option value="POKEMON">Pokémon</option><option value="YU_GI_OH">Yu-Gi-Oh!</option><option value="LORCANA">Lorcana</option><option value="OTHER">Altro</option>
          </select>
        </label>
        <form class="scanner-search" @submit.prevent="searchCards">
          <label>Nome carta<input v-model="query" placeholder="Es. Agatha of the Vile Cauldron" autocomplete="off"/></label>
          <button class="primary-button" type="submit" :disabled="searching || query.trim().length < 2">{{ searching ? 'Ricerca…' : 'Cerca nel catalogo' }}</button>
        </form>
        <div v-if="ocrText" class="scanner-ocr-result"><label>Testo letto dalla foto<textarea v-model="ocrText" rows="3" readonly></textarea></label><small>Il nome suggerito è modificabile nel campo “Nome carta” qui sotto.</small></div>\n        <div v-if="suggestions.length" class="scanner-results">
          <button v-for="print in suggestions" :key="print.scryfallId" class="scanner-result" @click="choose(print)">
            <img v-if="print.imageUrl" :src="print.imageUrl" alt=""/>
            <span><strong>{{ print.name }}</strong><small>{{ print.setName }} · {{ print.setCode.toUpperCase() }} · #{{ print.collectorNumber }} · {{ print.language.toUpperCase() }}<span v-if="print.foil"> · Foil</span></small></span>
            <b>{{ print.marketPrice ? '€ ' + print.marketPrice : '—' }}</b>
          </button>
        </div>
        <div v-if="selected" class="scanner-selected">
          <div class="selected-card"><img v-if="selected.imageUrl" :src="selected.imageUrl" alt="Immagine carta"/><div><span class="eyebrow">STAMPA SELEZIONATA</span><h3>{{ selected.name }}</h3><p>{{ selected.setName }} · #{{ selected.collectorNumber }} · {{ selected.language.toUpperCase() }}<span v-if="selected.foil"> · Foil</span></p></div></div>
          <div class="scanner-add-fields">
            <label>Quantità<input v-model.number="quantity" type="number" min="1" max="100000"/></label>
            <label>Condizione<select v-model="condition"><option value="NM">Near Mint</option><option value="LP">Light Played</option><option value="MP">Moderately Played</option><option value="HP">Heavy Played</option><option value="DMG">Damaged</option></select></label>
            <label class="scanner-location">Posizione fisica<input v-model="location" placeholder="Es. Binder A, pagina 4"/></label>
          </div>
          <button class="primary-button scanner-save" :disabled="saving || quantity < 1" @click="addToInventory">{{ saving ? 'Aggiunta in corso…' : 'Aggiungi al magazzino' }}</button>
        </div>
        <div v-else-if="!suggestions.length" class="scanner-empty"><i class="pi pi-clone"></i><p>La stampa individuata apparirà qui per la conferma.</p></div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.scanner-page{padding:clamp(24px,3vw,40px);max-width:1500px}.scanner-page .page-heading{margin-bottom:22px}.scanner-page .page-heading h1{font:800 clamp(27px,2.2vw,34px) Manrope,sans-serif;letter-spacing:-.7px}.scanner-page .subtitle{margin-top:7px;color:var(--muted)}
.scanner-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;align-items:start}.scanner-camera-panel,.scanner-find-panel{padding:22px;border:1px solid var(--border);border-radius:16px;background:var(--surface)}
.panel-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:17px}.panel-heading h2{font:700 17px Manrope,sans-serif;margin:0;color:var(--text);display:flex;gap:9px;align-items:center}.panel-heading h2 i{color:var(--accent)}.panel-heading p{font-size:12px;color:var(--muted);margin:5px 0 0}
.camera-stage{position:relative;aspect-ratio:4/3;border-radius:13px;overflow:hidden;background:#090a12;border:1px solid var(--border);display:grid;place-items:center}.camera-stage video,.camera-stage img{width:100%;height:100%;object-fit:contain}.camera-placeholder{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;padding:20px;text-align:center;color:var(--muted)}.camera-placeholder i{font-size:42px;color:var(--accent)}.camera-placeholder strong{color:var(--text)}.camera-placeholder span{font-size:12px}
.scan-frame{position:absolute;inset:10% 25%;border:2px solid #a78aff;border-radius:12px;box-shadow:0 0 0 100vmax #0003;pointer-events:none}.scan-frame span{position:absolute;top:50%;left:0;right:0;height:1px;background:#a78aff80}
.camera-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:15px}.scanner-hint{font-size:11px;color:var(--muted);display:flex;gap:7px;margin:14px 0 0}.scanner-hint i{color:var(--accent)}
.scanner-find-panel>label,.scanner-search label,.scanner-add-fields label{display:flex;flex-direction:column;gap:7px;font-size:12px;font-weight:600;color:var(--text)}.scanner-find-panel select,.scanner-search input,.scanner-add-fields input,.scanner-add-fields select{width:100%;min-width:0;padding:11px 12px;border:1px solid var(--border);border-radius:9px;background:var(--surface2);color:var(--text);outline-color:var(--accent)}
.scanner-search{display:flex;align-items:end;gap:10px;margin-top:13px}.scanner-search label{flex:1;min-width:0}.scanner-search .primary-button{white-space:nowrap}
.scanner-results{display:flex;flex-direction:column;gap:7px;margin-top:15px;max-height:340px;overflow:auto}.scanner-result{display:flex;align-items:center;gap:11px;text-align:left;padding:9px;border:1px solid var(--border);border-radius:10px;background:var(--surface2);color:var(--text)}.scanner-result:hover{border-color:var(--accent)}.scanner-result img{width:43px;height:60px;object-fit:cover;border-radius:4px}.scanner-result span{flex:1;min-width:0}.scanner-result strong,.scanner-result small{display:block}.scanner-result small{font-size:10px;color:var(--muted);margin-top:4px}.scanner-result b{font-size:12px;white-space:nowrap}
.scanner-selected{margin-top:18px;padding:15px;border:1px solid var(--border);border-radius:12px;background:var(--surface2)}.selected-card{display:flex;gap:13px;align-items:center}.selected-card img{width:75px;border-radius:7px}.selected-card .eyebrow{font-size:9px;color:var(--accent);letter-spacing:1px;font-weight:700}.selected-card h3{font:700 16px Manrope,sans-serif;margin:5px 0;color:var(--text)}.selected-card p{font-size:11px;color:var(--muted);margin:0}.scanner-add-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:15px}.scanner-location{grid-column:1/-1}.scanner-save{width:100%;margin-top:15px}.scanner-empty{display:flex;align-items:center;justify-content:center;flex-direction:column;min-height:200px;color:var(--muted);text-align:center}.scanner-empty i{font-size:30px;color:var(--accent)}.scanner-empty p{font-size:12px}
@media(max-width:900px){.scanner-layout{grid-template-columns:1fr}}@media(max-width:520px){.scanner-page{padding:20px 14px}.scanner-camera-panel,.scanner-find-panel{padding:15px}.scanner-search{flex-direction:column;align-items:stretch}.scanner-add-fields{grid-template-columns:1fr}.scanner-location{grid-column:auto}}
</style>
