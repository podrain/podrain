import { createApp } from 'vue'
import App from './App.vue'
import './css/app.css'
import Dexie from 'dexie'

import Helpers from './Helpers'

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

const app = createApp(App)

app.component('font-awesome-icon', FontAwesomeIcon).mount('#app')
