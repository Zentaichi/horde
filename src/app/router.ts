import { createRouter, createWebHashHistory } from 'vue-router';
import DashboardPage from '@/pages/DashboardPage.vue';
import PhpManagerPage from '@/pages/PhpManagerPage.vue';
import DatabasePage from '@/pages/DatabasePage.vue';

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: DashboardPage },
  { path: '/php', component: PhpManagerPage },
  { path: '/databases', component: DatabasePage },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
