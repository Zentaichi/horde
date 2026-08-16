import { createRouter, createWebHashHistory } from "vue-router";
import DashboardPage from "@/pages/DashboardPage.vue";
import PhpManagerPage from "@/pages/PhpManagerPage.vue";
import DatabasePage from "@/pages/DatabasePage.vue";
import ProjectsPage from "@/pages/ProjectsPage.vue";
import SitesPage from "@/pages/SitesPage.vue";

const routes = [
  { path: "/", redirect: "/dashboard" },
  { path: "/dashboard", component: DashboardPage },
  { path: "/php", component: PhpManagerPage },
  { path: "/databases", component: DatabasePage },
  { path: "/projects", component: ProjectsPage },
  { path: "/sites", component: SitesPage },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
