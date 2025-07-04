// === Dépendances ===
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const OpenAI = require('openai');
require('dotenv').config();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { Buffer } = require('buffer');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// === Vérification ENV au boot ===
const envVars = [
  'MONGODB_URI', 'OPENAI_API_KEY',
  'PE_CLIENT_ID', 'PE_CLIENT_SECRET',
  'ADZUNA_APP_ID', 'ADZUNA_APP_KEY'
];
envVars.forEach(v => {
  if (!process.env[v]) throw new Error(`❌ Variable d'environnement manquante : ${v}`);
});

// ==== App & Middleware ====
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const upload = multer({ storage: multer.memoryStorage() });

// ==== MongoDB Connection ====
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// ==== Offre Model ====
const OffreSchema = new mongoose.Schema({
  title: String,
  company: String,
  location: { city: String, raw: String },
  url: { type: String, unique: true },
  source: String,
  createdAt: Date
});
const OffreModel = mongoose.model('Offre', OffreSchema);

// ==== OpenAI Config ====
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ==== Pôle Emploi Auth ====
async function getPoleEmploiToken() {
  const clientId = process.env.PE_CLIENT_ID;
  const clientSecret = process.env.PE_CLIENT_SECRET;
  const resp = await fetch(
    'https://entreprise.pole-emploi.fr/connexion/oauth2/access_token?realm=/partenaire',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      },
      body: 'grant_type=client_credentials&scope=api_offresdemploiv2 o2dsoffre'
    }
  );
  const data = await resp.json();
  if (!data.access_token) throw new Error('Token Pôle Emploi manquant');
  return data.access_token;
}

// ==== External Job APIs ====
async function searchJobsAdzuna(what = 'developpeur', where = 'Paris') {
  const app_id = process.env.ADZUNA_APP_ID;
  const app_key = process.env.ADZUNA_APP_KEY;
  const url = `https://api.adzuna.com/v1/api/jobs/fr/search/1?app_id=${app_id}&app_key=${app_key}&what=${encodeURIComponent(
    what
  )}&where=${encodeURIComponent(where)}`;
  const resp = await fetch(url);
  const data = await resp.json();
  return (data.results || []).map(o => ({
    title: o.title,
    company: o.company?.display_name,
    location: o.location?.display_name,
    url: o.redirect_url,
    source: 'Adzuna'
  }));
}

async function searchJobsPoleEmploi(token, motCle, lieu, range = 20) {
  const url = `https://api.pole-emploi.io/partenaire/offresdemploi/v2/offres/search?motsCles=${encodeURIComponent(
    motCle
  )}&commune=${encodeURIComponent(lieu)}&distance=${range}`;
  const resp = await fetch(url, {
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    }
  });
  const data = await resp.json();
  return (data.resultats || []).map(o => ({
    title: o.intitule,
    company: o.entreprise?.nom,
    location: o.lieuTravail?.libelle,
    url: o.origineOffre?.urlOrigine,
    source: 'Pole Emploi'
  }));
}

// ==== Healthcheck ====
app.get('/api/health', async (req, res) => {
  try {
    // Test Mongo
    const mongoOk = !!(await mongoose.connection.db.admin().ping());
    // Test OpenAI
    let aiOk = false;
    try {
      await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1
      });
      aiOk = true;
    } catch {}
    // Test PE
    let peOk = false;
    try {
      await getPoleEmploiToken();
      peOk = true;
    } catch {}
    // Test Adzuna
    let adzunaOk = false;
    try {
      await searchJobsAdzuna('developpeur', 'Paris');
      adzunaOk = true;
    } catch {}
    res.json({
      mongo: mongoOk,
      openai: aiOk,
      poleemploi: peOk,
      adzuna: adzunaOk,
      status: mongoOk && aiOk && peOk && adzunaOk ? 'ok' : 'partial/failure'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==== Root route ====
app.get('/', (req, res) => res.send('✅ API CAP OK'));

// ==== Smart jobs (CV intelligent ou import) ====
app.post('/api/smart-jobs', upload.single('cvFile'), async (req, res) => {
  try {
    // 1. Payload (JSON ou form-data)
    let body;
    if (req.is('application/json')) {
      body = req.body;
    } else if (req.is('multipart/form-data')) {
      body = Object.fromEntries(
        Object.entries(req.body).map(([k, v]) => {
          try { return [k, JSON.parse(v)]; } catch { return [k, v]; }
        })
      );
    } else {
      body = req.body || {};
    }

    // 2. Parse PDF
    let pdfText = '';
    if (req.file) {
      const parsed = await pdfParse(req.file.buffer);
      pdfText = parsed.text;
      console.log('PDF extrait:', pdfText.slice(0, 300) + (pdfText.length > 300 ? '...' : ''));
    }

    // 3. Champs reçus
    const {
      nom, prenom, adresse, mail, tel, poste,
      experiences = [],
      competences = [],
      savoirEtre = [],
      savoirFaire = [],
      elargir = false,
      ville
    } = body;

    console.log('Payload reçu:', { nom, prenom, adresse, mail, tel, poste, experiences, competences, savoirEtre, savoirFaire, elargir, ville });

    // 4. Extraction IA si PDF fourni
    let extracted = { competences, experiences, ville: ville || adresse };
    if (pdfText) {
      const promptExtract = `
Lis ce texte brut d’un CV :
---
${pdfText}
---
Réponds UNIQUEMENT par un JSON valide (aucun mot hors du JSON !) :
{
  "competences": [...],
  "experiences": [{ "debut":"", "fin":"", "poste":"", "entreprise":"" }, …],
  "ville": ""
}`;
      const respExtract = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: promptExtract }],
        temperature: 0.0,
        max_tokens: 300
      });
      try {
        const txt = respExtract.choices[0].message.content.trim();
        const start = txt.indexOf('{');
        const end = txt.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
          extracted = JSON.parse(txt.slice(start, end + 1));
        } else {
          extracted = JSON.parse(txt);
        }
      } catch (e) {
        console.error('Erreur parsing extraction IA:', e);
      }
    }

    // 5. Mots-clés et ville
    let motCle = poste || '';
    if (elargir || !poste) {
      motCle = [poste, ...(extracted.competences || []), ...savoirEtre, ...savoirFaire]
        .filter(Boolean)
        .join(' ');
    }
    const lieuRecherche = extracted.ville || ville || adresse || 'Paris';

    if (!motCle) {
      return res.status(400).json({ error: "Pas de mots-clés envoyés" });
    }
    console.log('Recherche offres avec:', motCle, lieuRecherche);

    // 6. Appels externes
    let offresPE = [];
    let offresAdz = [];
    try {
      const tokenPE = await getPoleEmploiToken();
      offresPE = await searchJobsPoleEmploi(tokenPE, motCle, lieuRecherche);
    } catch (err) {
      console.error('Erreur Pôle Emploi:', err);
    }
    try {
      offresAdz = await searchJobsAdzuna(motCle, lieuRecherche);
    } catch (err) {
      console.error('Erreur Adzuna:', err);
    }
    const allOffres = [...offresPE, ...offresAdz];
    console.log('Offres trouvées:', allOffres.length);

    if (!allOffres.length) {
      return res.json({ offresBrutes: [], smartOffers: [] });
    }

    // 7. Tri IA (ou bypass pour debug)
    /*
    // DEBUG ONLY: bypass IA pour voir si tout remonte
    // return res.json({ offresBrutes: allOffres, smartOffers: allOffres.slice(0, 5) });
    */

    // Prompt IA précis
    const promptTri = `
Tu es un recruteur. Voici le CV JSON :
${JSON.stringify({ nom, prenom, ...extracted }, null, 2)}

Voici les offres (JSON) :
${JSON.stringify(allOffres, null, 2)}

Retourne UNIQUEMENT un tableau JSON des 5 offres les plus pertinentes (PAS UN MOT DE PLUS), format :
[{"title":"","company":"","url":"","score":0.87},…]`;
    let smartOffers = [];
    try {
      const respTri = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: promptTri }],
        temperature: 0.0
      });
      const txt = respTri.choices[0].message.content.trim();
      const start = txt.indexOf('[');
      const end = txt.lastIndexOf(']');
      if (start !== -1 && end !== -1) {
        smartOffers = JSON.parse(txt.slice(start, end + 1));
      } else {
        smartOffers = JSON.parse(txt);
      }
    } catch (e) {
      console.error('Erreur parsing tri IA:', e);
      smartOffers = [];
    }

    res.json({ extractedCV: extracted, offresBrutes: allOffres, smartOffers });
  } catch (err) {
    console.error('❌ /api/smart-jobs error', err);
    res.status(500).json({ error: err.message });
  }
});

// ==== CV Upload & Extraction (séparé, optionnel) ====
app.post('/api/cv-upload', upload.single('cvFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu" });
    const parsed = await pdfParse(req.file.buffer);
    const pdfText = parsed.text;
    // Prompt IA extraction
    const promptExtract = `
Lis ce texte brut d’un CV :
---
${pdfText}
---
Réponds UNIQUEMENT par un JSON valide (aucun mot hors du JSON !) :
{
  "competences": [...],
  "experiences": [{ "debut":"", "fin":"", "poste":"", "entreprise":"" }, …],
  "ville": ""
}`;
    const respExtract = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: promptExtract }],
      temperature: 0.0,
      max_tokens: 300
    });
    let extracted = {};
    try {
      const txt = respExtract.choices[0].message.content.trim();
      const start = txt.indexOf('{');
      const end = txt.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        extracted = JSON.parse(txt.slice(start, end + 1));
      } else {
        extracted = JSON.parse(txt);
      }
    } catch (e) {
      return res.status(200).json({ error: "Erreur parsing IA", details: e.toString() });
    }
    res.json({ extracted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==== Cached offers endpoint (simple, optionnel) ====
app.get('/api/offres-cached', async (req, res) => {
  const { motCle = '', ville = '' } = req.query;
  const offres = await OffreModel.find({
    $text: { $search: motCle },
    'location.city': ville
  }).limit(100);
  res.json({ offres });
});

// ==== Scheduler: update cache hourly ====
cron.schedule('0 * * * *', async () => {
  try {
    const token = await getPoleEmploiToken();
    const peOffres = await searchJobsPoleEmploi(token, '', '');
    const adzOffres = await searchJobsAdzuna('', '');
    const all = [...peOffres, ...adzOffres].map(o => ({ ...o, createdAt: new Date() }));
    for (const off of all) {
      await OffreModel.updateOne({ url: off.url }, { $set: off }, { upsert: true });
    }
    console.log('✅ Cache offres updated');
  } catch (err) {
    console.error('❌ Cache update error', err);
  }
});

// ==== Start server ====
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ CAP API running on http://localhost:${PORT}`));
