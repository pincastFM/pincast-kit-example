import { createApp } from 'vue'
import { setTtHost, ttHtmlLock } from '@pincast/placecard-kit/vue'
import App from './App.vue'
import './lantern.css'

setTtHost({ lock: ttHtmlLock })
createApp(App).mount('#app')
