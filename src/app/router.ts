import { createRouter, createWebHashHistory } from 'vue-router';
import DashboardPage from '@/pages/DashboardPage.vue';
import PhpManagerPage from '@/pages/PhpManagerPage.vue';

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: DashboardPage },
  { path: '/php', component: PhpManagerPage },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
