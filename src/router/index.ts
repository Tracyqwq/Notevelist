import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useWorldStore } from '../stores/world'
import { useCharacterStore } from '../stores/character'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../components/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('../views/HomeView.vue'),
      },
      {
        path: 'world/:worldId',
        name: 'world',
        component: () => import('../views/WorldView.vue'),
      },
      {
        path: 'story/:storyId',
        name: 'story',
        component: () => import('../views/StoryView.vue'),
      },
      {
        path: 'fragment-wall/:worldId',
        name: 'fragment-wall',
        component: () => import('../views/FragmentWallView.vue'),
      },
      {
        path: 'mindmap/:worldId',
        name: 'mindmap',
        component: () => import('../views/MindMapView.vue'),
      },
      {
        path: 'characters',
        name: 'characters',
        component: () => import('../views/CharactersView.vue'),
      },
      {
        path: 'character/:characterId',
        name: 'character-detail',
        component: () => import('../views/CharacterDetailView.vue'),
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('../views/SettingsView.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Load data on first navigation
let initialized = false
router.beforeEach(async (to) => {
  if (!initialized) {
    initialized = true
    const worldStore = useWorldStore()
    const charStore = useCharacterStore()
    await worldStore.loadAll()
    await charStore.loadAll()
  }
})

export default router
