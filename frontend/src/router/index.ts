import { createRouter, createWebHashHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'

export default createRouter({
  history: createWebHashHistory('/cardvault/'),
  routes: [{ path: '/', name: 'dashboard', component: DashboardView }],
})