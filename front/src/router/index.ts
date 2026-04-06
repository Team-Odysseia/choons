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
        },
        {
          path: 'albums',
          name: 'all-albums',
          component: () => import('@/views/AllAlbumsView.vue'),
        },
        {
          path: 'artists/:id',
          name: 'artist',
          component: () => import('@/views/ArtistView.vue'),
        },
        {
          path: 'albums/:id',
          name: 'album',
          component: () => import('@/views/AlbumView.vue'),
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
        },
        {
          path: ':id',
          name: 'playlist',
          component: () => import('@/views/PlaylistDetailView.vue'),
        },
        {
          path: 'requests',
          name: 'album-requests',
          component: () => import('@/views/AlbumRequestsView.vue'),
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
        },
        {
          path: 'artists',
          name: 'admin-artists',
          component: () => import('@/views/admin/AdminArtistsView.vue'),
        },
        {
          path: 'artists/:id/edit',
          name: 'admin-artist-edit',
          component: () => import('@/views/admin/AdminArtistEditView.vue'),
        },
        {
          path: 'albums',
          name: 'admin-albums',
          component: () => import('@/views/admin/AdminAlbumsView.vue'),
        },
        {
          path: 'albums/:id/edit',
          name: 'admin-album-edit',
          component: () => import('@/views/admin/AdminAlbumEditView.vue'),
        },
        {
          path: 'album-requests',
          name: 'admin-album-requests',
          component: () => import('@/views/admin/AdminAlbumRequestsView.vue'),
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
