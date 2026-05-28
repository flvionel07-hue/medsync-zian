# 🚀 Ghid Deploy MedSync Zian
## De la zero la aplicație live în ~20 minute

---

## PASUL 1 — Creează contul Firebase (baza de date)

Firebase e gratuit și stochează datele în timp real (sincronizare instant între tine și soție).

1. Mergi la **https://console.firebase.google.com**
2. Click **"Create a project"**
3. Nume proiect: `medsync-zian` → Continue
4. Dezactivează Google Analytics (nu ai nevoie) → **Create project**
5. Aștepți ~30 secunde → **Continue**

### Adaugă o aplicație Web:
6. Click iconița **`</>`** (Web)
7. App nickname: `medsync` → **Register app**
8. **COPIAZĂ tot blocul `firebaseConfig`** — arată așa:
```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "medsync-zian.firebaseapp.com",
  ...
}
```
9. Click **Continue to console**

### Activează Realtime Database:
10. În meniu stânga → **Build** → **Realtime Database**
11. Click **Create Database**
12. Alege **Europe-west1** → Next
13. Alege **"Start in test mode"** → Enable
14. Copiază URL-ul bazei de date (ex: `https://medsync-zian-default-rtdb.europe-west1.firebasedatabase.app`)

---

## PASUL 2 — Modifică fișierul `firebase.js`

Deschide fișierul `src/firebase.js` și înlocuiește valorile cu cele copiate:

```js
const firebaseConfig = {
  apiKey: "VALOAREA_TA_REALA",
  authDomain: "medsync-zian.firebaseapp.com",
  databaseURL: "https://medsync-zian-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "medsync-zian",
  storageBucket: "medsync-zian.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
}
```

---

## PASUL 3 — Creează cont GitHub (dacă nu ai)

1. Mergi la **https://github.com** → Sign up (gratuit)
2. Creează un repository nou:
   - Click **"+"** → **New repository**
   - Nume: `medsync-zian`
   - Public
   - **Create repository**
3. Urci fișierele (drag & drop pe pagina repository-ului)
4. Click **Commit changes**

---

## PASUL 4 — Deploy pe Netlify

1. Mergi la **https://netlify.com** → Sign up cu GitHub
2. Click **"Add new site"** → **Import an existing project**
3. Alege **GitHub** → autorizezi → selectezi `medsync-zian`
4. Setări build:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Click **Deploy site**
6. Aștepți ~2 minute → primești link de genul `https://medsync-zian.netlify.app`

---

## PASUL 5 — Instalează pe telefon

### iPhone:
1. Deschide Safari → mergi la linkul tău Netlify
2. Apasă butonul **Share** (pătratul cu săgeată în sus)
3. Scroll jos → **"Add to Home Screen"**
4. Nume: `MedSync` → **Add**
5. Apare iconiță pe ecran exact ca o aplicație! 🎉

### Android:
1. Deschide Chrome → mergi la link
2. Meniu **⋮** (3 puncte sus dreapta)
3. **"Add to Home screen"**
4. Confirm → gata!

---

## PASUL 6 — Invită soția

1. Deschide aplicația → apasă pe **codul familie** (sus dreapta)
2. Copiază codul (ex: `ABC-123`)
3. Trimite-l soției pe WhatsApp
4. Soția deschide același link Netlify
5. La prima deschidere → **"Intră cu cod de familie"** → introduce codul
6. Gata — vedeți amândoi aceleași date! 🎉

---

## 💡 Sfaturi utile

- **Link-ul rămâne permanent** — nu expiră niciodată
- **Firebase gratuit** acoperă sute de utilizatori (mai mult decât suficient)
- **Netlify gratuit** — nu plătești nimic
- Dacă vrei un **domeniu propriu** (ex: `medsync.familie.ro`) poți cumpăra de la ~5€/an

---

## 🆘 Ai nevoie de ajutor?

Dacă te blochezi la orice pas, revino și descrie exact unde ești — te ajut pas cu pas!
