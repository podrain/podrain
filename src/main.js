import { createApp } from 'vue'
import App from './App.vue'
import './css/app.css'
import Dexie from 'dexie'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createStore } from 'vuex'

import Helpers from './Helpers'

import PodcastList from './components/PodcastList.vue'
import PodcastShow from './components/PodcastShow.vue'
import Settings from './components/Settings.vue'
import Queue from './components/Queue.vue'
import EpisodeShow from './components/EpisodeShow.vue'

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
  faCheck
)

// Dexie
let dexieDB = new Dexie('podrain')
dexieDB.version(1).stores({
  podcasts: '&_id',
  episodes: '&_id,podcast_id,pubDate',
})
Helpers.dexieDB = dexieDB

// Router
const routes = [
  {
    path: '/queue',
    component: Queue
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

// Vuex state
const store = createStore({
  state() {
    return {
      queue: []
    }
  },

  mutations: {
    addEpisodeToQueue(state, episode) {
      state.queue.push(episode)
    },

    clearQueue(state) {
      state.queue = []
    }
  },
})

const app = createApp(App)
app
  .component('font-awesome-icon', FontAwesomeIcon)
  .use(router)
  .use(store)
  .mount('#app')

if (!localStorage.getItem('proxy_url')) {
  localStorage.setItem('proxy_url', 'https://podrain-proxy.herokuapp.com/')
}