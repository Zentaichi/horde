import { createRouter, createWebHashHistory } from 'vue-router';
import PhpManagerPage from '@/pages/PhpManagerPage.vue';

const routes = [
  { path: '/', redirect: '/php' },
  { path: '/php', component: PhpManagerPage },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;