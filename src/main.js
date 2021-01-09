import { createApp } from 'vue'
import App from './App.vue'
import './css/app.css'
import Dexie from 'dexie'
import { createRouter, createWebHashHistory } from 'vue-router'

import Helpers from './Helpers'

import PodcastList from './components/PodcastList.vue'
import Settings from './components/Settings.vue'

// FontAwesome setup
import { library } from '@fortawesome/fontawesome-svg-core'
import { 
  faHome, 
  faPlus, 
  faListOl, 
  faCog,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(
  faHome, 
  faPlus, 
  faListOl, 
  faCog,
)

// Dexie
let dexieDB = new Dexie('podrain')
dexieDB.version(1).stores({
  podcasts: '&_id',
  episodes: '&_id,podcast_id,pubDate',
})
Helpers.dexieDB = dexieDB

const routes = [
  {
    path: '/',
    component: PodcastList,
  },

  {
    path: '/settings',
    component: Settings,
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

const app = createApp(App)
app
  .component('font-awesome-icon', FontAwesomeIcon)
  .use(router)
  .mount('#app')
