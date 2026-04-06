import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      redirect: '/library',
    },
    {
      path: '/library',
      component: () => import('@/components/layout/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'library',
          component: () => import('@/views/LibraryView.vue'),
          meta: { shell: 'wide' },
        },
        {
          path: 'albums',
          name: 'all-albums',
          component: () => import('@/views/AllAlbumsView.vue'),
          meta: { shell: 'wide' },
        },
        {
          path: 'artists/:id',
          name: 'artist',
          component: () => import('@/views/ArtistView.vue'),
          meta: { shell: 'wide' },
        },
        {
          path: 'albums/:id',
          name: 'album',
          component: () => import('@/views/AlbumView.vue'),
          meta: { shell: 'wide' },
        },
      ],
    },
    {
      path: '/playlists',
      component: () => import('@/components/layout/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'playlists',
          component: () => import('@/views/PlaylistsView.vue'),
          meta: { shell: 'wide' },
        },
        {
          path: ':id',
          name: 'playlist',
          component: () => import('@/views/PlaylistDetailView.vue'),
          meta: { shell: 'wide' },
        },
        {
          path: 'requests',
          name: 'album-requests',
          component: () => import('@/views/AlbumRequestsView.vue'),
          meta: { shell: 'form' },
        },
      ],
    },
    {
      path: '/admin',
      component: () => import('@/components/layout/AppLayout.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        {
          path: '',
          redirect: '/admin/listeners',
        },
        {
          path: 'listeners',
          name: 'admin-listeners',
          component: () => import('@/views/admin/AdminListenersView.vue'),
          meta: { shell: 'wide' },
        },
        {
          path: 'artists',
          name: 'admin-artists',
          component: () => import('@/views/admin/AdminArtistsView.vue'),
          meta: { shell: 'wide' },
        },
        {
          path: 'artists/:id/edit',
          name: 'admin-artist-edit',
          component: () => import('@/views/admin/AdminArtistEditView.vue'),
          meta: { shell: 'form' },
        },
        {
          path: 'albums',
          name: 'admin-albums',
          component: () => import('@/views/admin/AdminAlbumsView.vue'),
          meta: { shell: 'wide' },
        },
        {
          path: 'albums/:id/edit',
          name: 'admin-album-edit',
          component: () => import('@/views/admin/AdminAlbumEditView.vue'),
          meta: { shell: 'wide' },
        },
        {
          path: 'album-requests',
          name: 'admin-album-requests',
          component: () => import('@/views/admin/AdminAlbumRequestsView.vue'),
          meta: { shell: 'wide' },
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    return { path: '/library' }
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { path: '/library' }
  }
})

export default router
