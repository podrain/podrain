import { createApp } from 'vue'
import App from './App.vue'
import '@oruga-ui/oruga-next/dist/oruga.css'
import './css/app.css'
import Dexie from 'dexie'
import localforage from 'localforage'
import { createRouter, createWebHashHistory } from 'vue-router'
import { VuexStore as store, Shared } from './State'
import {
  Config, 
  Icon, 
  Modal, 
} from '@oruga-ui/oruga-next'

import PodcastList from './components/PodcastList.vue'
import PodcastShow from './components/PodcastShow.vue'
import Settings from './components/Settings.vue'
import Queue from './components/Queue.vue'
import EpisodeShow from './components/EpisodeShow.vue'
import EpisodeSearch from './components/EpisodeSearch.vue'
import PodcastCreate from './components/PodcastCreate.vue'

// FontAwesome setup
import { library } from '@fortawesome/fontawesome-svg-core'
import { 
  faHome, 
  faPlus, 
  faListOl, 
  faCog,
  faSave,
  faDownload,
  faUpload,
  faSpinner,
  faTimes,
  faSearch,
  faSync,
  faCheck,
  faStepBackward,
  faStepForward,
  faUndo,
  faRedo,
  faPlay,
  faPause,
  faChevronDown,
  faChevronUp,
  faRss,
  faBars,
  faClock,
  faImage,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(
  faHome, 
  faPlus, 
  faListOl, 
  faCog,
  faSave,
  faDownload,
  faUpload,
  faSpinner,
  faTimes,
  faSearch,
  faSync,
  faCheck,
  faStepBackward,
  faStepForward,
  faUndo,
  faRedo,
  faPlay,
  faPause,
  faChevronDown,
  faChevronUp,
  faRss,
  faBars,
  faClock,
  faCheck,
  faImage,
)

// Dexie
let dexieDB = new Dexie('podrain')
dexieDB.version(1).stores({
  podcasts: '&_id',
  episodes: '&_id,podcast_id,pubDate',
})

dexieDB.version(2).stores({
  podcasts: '&_id',
  episodes: '&_id,podcast_id,pubDate,queue,currently_playing',
}).upgrade(tx => {
  return tx.table('episodes').modify(ep => {
    ep.currently_playing = ep.currently_playing === true ? 1 : 0
  })
})

Shared.dexieDB = dexieDB

// localForage
Shared.downloadedEpisodeFiles = localforage.createInstance({
  driver: localforage.INDEXEDDB,
  name: 'Podrain Episodes'
})

Shared.downloadedImageFiles = localforage.createInstance({
  driver: localforage.INDEXEDDB,
  name: 'Podrain Images'
})

// Router
const routes = [
  {
    path: '/queue',
    component: Queue
  },

  {
    path: '/podcasts/create',
    component: PodcastCreate
  },

  {
    path: '/podcasts/:id/search',
    component: EpisodeSearch
  },

  {
    path: '/podcasts/:id',
    component: PodcastShow
  },

  {
    path: '/podcasts',
    component: PodcastList,
  },

  {
    path: '/episodes/:id',
    component: EpisodeShow,
  },

  {
    path: '/settings',
    component: Settings,
  },

  {
    path: '/',
    redirect: '/podcasts',
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

const app = createApp(App)
app
  .component('font-awesome-icon', FontAwesomeIcon)
  .use(Icon)
  .use(Modal)
  .use(Config, {
    iconPack: 'fas',
    iconComponent: 'font-awesome-icon',
  })
  .use(router)
  .use(store)
  .mount('#app')

if (!localStorage.getItem('proxy_url')) {
  localStorage.setItem('proxy_url', 'https://podrain-proxy.herokuapp.com/')
}