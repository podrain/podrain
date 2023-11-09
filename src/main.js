import { createApp } from 'vue'
import App from './App.vue'
import '@oruga-ui/oruga-next/dist/oruga.css'
import './css/app.css'
import Dexie from 'dexie'
import localforage from 'localforage'
import { createRouter, createWebHashHistory } from 'vue-router'
import { Shared } from './State'
import { createPinia } from 'pinia'
import {
  Config, 
  Icon, 
  Modal,
  Notification,
} from '@oruga-ui/oruga-next'

import PodcastList from './components/PodcastList.vue'
import PodcastShow from './components/PodcastShow.vue'
import PodcastEdit from './components/PodcastEdit.vue'
import Settings from './components/Settings.vue'
import Queue from './components/Queue.vue'
import EpisodeShow from './components/EpisodeShow.vue'
import EpisodeSearch from './components/EpisodeSearch.vue'
import PodcastCreate from './components/PodcastCreate.vue'
import History from './components/History.vue'

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
  faHistory,
  faEdit,
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
  faHistory,
  faEdit,
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

dexieDB.version(3).stores({
  podcasts: '&_id',
  episodes: '&_id,podcast_id,pubDate,queue,currently_playing,played',
}).upgrade(tx => {
  return tx.table('episodes').toCollection().modify(ep => {
    ep.played = ep.played === true ? ep.pubDate : ''
  })
})

dexieDB.version(4).stores({
  podcasts: '&_id',
  episodes: '&_id,podcast_id,pubDate,queue,currently_playing,played',
  player: '&key,value'
}).upgrade(tx => {
  return dexieDB.episodes.filter(ep => ep.queue > 0).toArray().then(episodes => {
    const queueEpisodeIDs = episodes.map(ep => ep._id)
    const currentlyPlayingID = episodes.filter(ep => ep.currently_playing === 1).map(ep => ep._id)[0]

    return tx.table('player').bulkAdd([
      {
        key: 'queue',
        value: JSON.stringify(queueEpisodeIDs)
      },
      {
        key: 'currently_playing',
        value: currentlyPlayingID
      }
    ])
  })
})

dexieDB.version(5).stores({
  podcasts: '&_id',
  episodes: '&_id,podcast_id,pubDate,played',
  player: '&key,value'
}).upgrade(tx => {
  return tx.table('episodes').toCollection().modify(ep => {
    delete ep.queue
    delete ep.currently_playing
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
    path: '/history',
    component: History,
  },
  
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
    path: '/podcasts/:id/edit',
    component: PodcastEdit
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
  scrollBehavior (to, from, savedPosition) {
    return { top: 0 }
  }
})

const pinia = createPinia()

const app = createApp(App)
app
  .component('font-awesome-icon', FontAwesomeIcon)
  .use(Icon)
  .use(Modal)
  .use(Notification)
  .use(Config, {
    iconPack: 'fas',
    iconComponent: 'font-awesome-icon',
  })
  .use(router)
  .use(pinia)
  .mount('#app')

if (!localStorage.getItem('proxy_url') || localStorage.getItem('proxy_url') === 'https://podrain-proxy.herokuapp.com/') {
  localStorage.setItem('proxy_url', 'https://podrain-proxy.sweeney.digital/')
}