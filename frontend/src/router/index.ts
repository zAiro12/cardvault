import { createRouter, createWebHashHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import InventoryView from '../views/InventoryView.vue'

export default createRouter({
  history: createWebHashHistory('/cardvault/'),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardView },
    { path: '/inventory', name: 'inventory', component: InventoryView },
  ],
})
