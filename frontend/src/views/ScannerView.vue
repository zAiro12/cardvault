<script setup lang="ts">
</script>

<template>
  <section class="page-content scanner-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">ACQUISIZIONE CARTE</p>
        <h1>Scanner</h1>
        <p class="subtitle">Funzionalità in sviluppo.</p>
      </div>
    </div>

    <div class="scanner-layout">
      <section class="panel scanner-panel">
        <div class="panel-heading">
          <div>
            <h2><i class="pi pi-camera"></i> Fotocamera</h2>
            <p>Acquisizione fotografica della carta</p>
          </div>
          <span class="development-label">In sviluppo</span>
        </div>
        <div class="scanner-placeholder">
          <i class="pi pi-camera"></i>
          <strong>Scanner fotografico</strong>
          <span>La cattura e il riconoscimento automatico saranno disponibili in una prossima versione.</span>
        </div>
        <div class="scanner-actions">
          <button class="primary-button" disabled><i class="pi pi-video"></i> Avvia fotocamera · In sviluppo</button>
          <button class="secondary-button" disabled><i class="pi pi-camera"></i> Scatta foto · In sviluppo</button>
        </div>
      </section>

      <section class="panel scanner-panel">
        <div class="panel-heading">
          <div>
            <h2><i class="pi pi-search"></i> Identifica carta</h2>
            <p>Ricerca e aggiunta della stampa al magazzino</p>
          </div>
          <span class="development-label">In sviluppo</span>
        </div>
        <div class="scanner-placeholder">
          <i class="pi pi-clone"></i>
          <strong>Identificazione e inserimento</strong>
          <span>La ricerca della stampa e l'aggiunta al magazzino da questa schermata sono temporaneamente disattivate.</span>
        </div>
        <div class="scanner-actions">
          <button class="primary-button" disabled><i class="pi pi-search"></i> Cerca nel catalogo · In sviluppo</button>
          <button class="secondary-button" disabled><i class="pi pi-plus"></i> Aggiungi al magazzino · In sviluppo</button>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.scanner-page{padding:clamp(24px,3vw,40px);max-width:1500px}
.scanner-page .page-heading{margin-bottom:22px}
.scanner-page .page-heading h1{font:800 clamp(27px,2.2vw,34px) Manrope,sans-serif;letter-spacing:-.7px}
.scanner-page .subtitle{margin-top:7px;color:var(--muted)}
.scanner-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;align-items:stretch}
.scanner-panel{padding:22px;border:1px solid var(--border);border-radius:16px;background:var(--surface);display:flex;flex-direction:column}
.panel-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:17px}
.panel-heading h2{font:700 17px Manrope,sans-serif;margin:0;color:var(--text);display:flex;gap:9px;align-items:center}
.panel-heading h2 i{color:var(--accent)}
.panel-heading p{font-size:12px;color:var(--muted);margin:5px 0 0}
.development-label{white-space:nowrap;border:1px solid var(--border);border-radius:20px;padding:5px 9px;font-size:11px;font-weight:700;color:var(--muted)}
.scanner-placeholder{min-height:260px;flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;padding:24px;text-align:center;color:var(--muted);border:1px dashed var(--border);border-radius:12px;background:var(--surface2)}
.scanner-placeholder>i{font-size:38px;color:var(--accent)}
.scanner-placeholder strong{color:var(--text);font-size:15px}
.scanner-placeholder span{font-size:12px;line-height:1.6;max-width:360px}
.scanner-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:15px}
.scanner-actions button:disabled{opacity:.55;cursor:not-allowed}
@media(max-width:900px){.scanner-layout{grid-template-columns:1fr}}
@media(max-width:520px){.scanner-page{padding:20px 14px}.scanner-panel{padding:15px}.panel-heading{align-items:flex-start;flex-direction:column}}
</style>
