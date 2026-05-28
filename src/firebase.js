import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyDVfC6Wp5Qm4feRPZKfVZPUjADIpOguUaQ",
  authDomain: "medsync-zian.firebaseapp.com",
  databaseURL: "https://medsync-zian-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "medsync-zian",
  storageBucket: "medsync-zian.firebasestorage.app",
  messagingSenderId: "575086482452",
  appId: "1:575086482452:web:ebecafec9331e2d3764301"
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)