# Image-to-3D
# 🖼️ Image-to-3D

Een webapplicatie die automatisch een 3D-model genereert op basis van een geüploade afbeelding. Het systeem detecteert objecten in de afbeelding met behulp van TensorFlow's COCO-SSD model, waarna een 3D-model wordt gegenereerd via de [Meshy API](https://meshy.ai/).

## 📦 Functionaliteiten

- Upload een afbeelding via de frontend
- Automatische objectdetectie (bv. hond, kat, enz.)
- 3D-modelgeneratie via Meshy API
- Downloadbare `.glb`-modellen
- Voorbeeldweergave in een Three.js viewport
- Eenvoudige backend-API via Node.js
- CORS proxy ondersteuning

## 📁 Projectstructuur

Image-to-3D/
├── backend/
│ ├── my-cors-proxy/
│ └── server.js
├── frontend/
│ ├── index.html
│ └── js/
│ ├── api.js
│ ├── main.js
│ └── model.js
├── css/
│ └── styles.css
├── node_modules/
├── .gitignore
├── package.json
├── package-lock.json
└── README.md

bash
Kopiëren
Bewerken

## 🚀 Installatie

### 1. Clone de repository

```bash
git clone https://github.com/kianvdb/Image-to-3D.git
cd Image-to-3D
Of download de .zip en pak die uit.

2. Installeer dependencies
npm install
cd backend/
npm install

3. Start de backend server
node backend/server.js
Deze draait op: http://localhost:3000

4. Start de frontend (via Vite)

npm run dev
Frontend draait dan op: http://localhost:5173


⚙️ Vereisten
Node.js v18 of hoger

NPM

Internetverbinding (voor Meshy API)

🧪 Ontwikkeling & Conventies
Branch structuur: main, dev, feature/*

Commit messages: Conventional Commits

Code splitting: gescheiden JS, CSS, HTML-bestanden

Vite als bundler

Gebruik van async/await en error handling in alle API-calls

📌 Todo

 Errors uithalen
 automatisch riggen & animaties
 Frontend stileren

sources
https://chatgpt.com/share/68237c39-e23c-8011-b9b0-715560051c48
https://chatgpt.com/share/68237bf6-1f50-8011-9ce8-c5fbd3a45ae4
https://chatgpt.com/share/68237b95-3940-8011-b980-3e995a5ced3e
https://chatgpt.com/share/682b57bf-aff4-800f-8e48-d21a39184237
