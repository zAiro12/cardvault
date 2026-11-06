import { createRouter, createWebHashHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import InventoryView from '../views/InventoryView.vue'
import ReservationsView from '../views/ReservationsView.vue'
import ScannerView from '../views/ScannerView.vue'

export default createRouter({
  history: createWebHashHistory('/cardvault/'),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardView },
    { path: '/inventory', name: 'inventory', component: InventoryView },
    { path: '/reservations', name: 'reservations', component: ReservationsView },
    { path: '/scanner', name: 'scanner', component: ScannerView },
  ],
})
