import { createMemoryHistory, createRouter } from 'vue-router'

const Empty = { template: '<div />' }

export function makeTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Empty },
      { path: '/library', name: 'library', component: Empty },
      { path: '/library/albums/:id', name: 'album', component: Empty },
      { path: '/library/artists/:id', name: 'artist', component: Empty },
      { path: '/playlists/:id', name: 'playlist', component: Empty },
    ],
  })
}
