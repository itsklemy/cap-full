// === Dépendances globales ===
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');
const { Buffer } = require('buffer');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const FormData = require('form-data');
const { google } = require('googleapis');
const { jsonrepair } = require('jsonrepair');
require('dotenv').config();

// === Vérification ENV au boot ===
const envVars = [
  'MONGODB_URI', 'OPENAI_API_KEY',
  'PE_CLIENT_ID', 'PE_CLIENT_SECRET',
  'ADZUNA_APP_ID', 'ADZUNA_APP_KEY',
  'OCRSPACE_APIKEY', 'GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REDIRECT_URI'
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
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true })
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// ==== Modèles ====
const OffreSchema = new mongoose.Schema({
  title: String,
  company: String,
  location: { city: String, raw: String },
  url: { type: String, unique: true },
  source: String,
  createdAt: Date
});
const OffreModel = mongoose.model('Offre', OffreSchema);

const AdminDocSchema = new mongoose.Schema({
  name: String,
  userId: String,
  type: String,
  uri: String,
  textContent: String,
  extractedData: mongoose.Schema.Types.Mixed,
  dateUpload: Date,
});
const AdminDocModel = mongoose.model('AdminDoc', AdminDocSchema);

// ==== OpenAI Config ====
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ==== GMAIL OAuth2 ====
const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

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

// ==== OCR extraction via OCR.Space ====
async function extractTextWithOCR(buffer) {
  const apiKey = process.env.OCRSPACE_APIKEY;
  const formData = new FormData();
  formData.append('file', buffer, { filename: 'cv.pdf', contentType: 'application/pdf' });
  formData.append('language', 'fre');
  formData.append('isOverlayRequired', 'false');
  const resp = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: {
      ...formData.getHeaders(),
      apikey: apiKey
    },
    body: formData
  });
  const data = await resp.json();
  if (
    data &&
    data.ParsedResults &&
    data.ParsedResults[0] &&
    data.ParsedResults[0].ParsedText
  ) {
    return data.ParsedResults[0].ParsedText;
  }
  throw new Error('OCR extraction failed');
}

// ==== Healthcheck ====
app.get('/api/health', async (req, res) => {
  try {
    const mongoOk = !!(await mongoose.connection.db.admin().ping());
    let aiOk = false;
    try {
      await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1
      });
      aiOk = true;
    } catch {}
    let peOk = false;
    try {
      await getPoleEmploiToken();
      peOk = true;
    } catch {}
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

// ==== GMAIL OAuth2 ROUTES ====
app.get('/api/gmail/auth-url', (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.labels'
    ],
    prompt: 'consent'
  });
  res.json({ url: authUrl });
});

app.get('/api/gmail/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Code manquant');
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    res.json({ tokens });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/mails/extract', async (req, res) => {
  const { access_token } = req.body;
  if (!access_token) return res.status(400).json({ error: 'access_token manquant' });
  try {
    oAuth2Client.setCredentials({ access_token });
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const resp = await gmail.users.messages.list({
      userId: 'me',
      q: 'has:attachment filename:pdf newer_than:30d',
      maxResults: 10
    });

    const docs = [];
    if (resp.data.messages && resp.data.messages.length) {
      for (const msg of resp.data.messages) {
        const msgData = await gmail.users.messages.get({ userId: 'me', id: msg.id });
        const parts = msgData.data.payload.parts || [];
        const attachments = parts.filter(
          p => p.filename && p.body && p.body.attachmentId
        );
        for (const att of attachments) {
          docs.push({
            name: att.filename,
            mimeType: att.mimeType,
            date: new Date(Number(msgData.data.internalDate)),
            snippet: msgData.data.snippet,
            id: att.body.attachmentId,
            emailId: msg.id,
          });
        }
      }
    }
    res.json({ documents: docs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==== Démarches admin ROUTES ====

// Upload d'un document administratif + extraction IA/OCR
app.post('/api/docs', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
    // OCR ou PDF extract
    let textContent = '';
    try {
      const parsed = await pdfParse(req.file.buffer);
      textContent = parsed.text;
      if (textContent.replace(/\s/g, '').length < 50) {
        textContent = await extractTextWithOCR(req.file.buffer);
      }
    } catch (e) {
      textContent = await extractTextWithOCR(req.file.buffer);
    }
    // OpenAI pour catégorisation + extraction infos
    const prompt = `
Lis ce document administratif et :
- Dis s'il s'agit d'une facture, d'un avis d'imposition, d'une attestation CAF, etc.
- Si facture : extrais le montant, la date, le fournisseur, le numéro de contrat.
- Si impôt : extrais l’année, le montant, le type de document.
- Si CAF : type d’aide, date, numéro allocataire.
Réponds STRICTEMENT au format JSON :
{
  "type": "",
  "infos": { ... }
}
Voici le texte :
---
${textContent}
---
    `;
    let extractedData = {};
    try {
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 400
      });
      const txt = resp.choices[0].message.content.trim();
      extractedData = JSON.parse(txt.substring(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
    } catch (e) {
      extractedData = { type: 'Autre', infos: {} };
    }
    // Sauvegarde en base
    const doc = new AdminDocModel({
      name: req.file.originalname,
      userId: req.body.userId || 'demo',
      type: extractedData.type,
      uri: '',
      textContent,
      extractedData,
      dateUpload: new Date(),
    });
    await doc.save();
    res.json({ success: true, doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Analyse de tous les docs d'un user
app.post('/api/docs/analyse', async (req, res) => {
  try {
    const userId = req.body.userId || 'demo';
    const docs = await AdminDocModel.find({ userId }).lean();
    const names = docs.map(d => d.name).join(', ');
    const prompt = `
Voici une liste de documents administratifs : ${names}.
- Classe chaque document : Impôts, CAF, Factures, Téléphonie, Santé, Autres.
- Indique les documents manquants.
- Repère les doublons ou incohérences.
- Pour chaque secteur, dis ce qu’il faudrait anticiper ou relancer.
Réponses synthétiques, en français.
    `;
    const analyse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 400
    });
    res.json({ analyse: analyse.choices[0].message.content.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Génération action (lettre) sur un doc admin
app.post('/api/docs/:id/gen-action', async (req, res) => {
  try {
    const doc = await AdminDocModel.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: 'Document non trouvé' });
    const prompt = `
Génère une lettre type de ${req.body.type || 'résiliation'} pour ce document :
${JSON.stringify(doc.extractedData)}
Adresse, infos : ${req.body.adresse || 'non précisé'}
Lettre claire, professionnelle, sans intro ni markdown.
    `;
    const lettre = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 400
    });
    res.json({ lettre: lettre.choices[0].message.content.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==== Smart jobs (CV intelligent ou import) ====
app.post('/api/smart-jobs', upload.single('cvFile'), async (req, res) => {
  // ===== DEBUG LOGS ESSENTIELS =====
  console.log('\n======== REQUETE /api/smart-jobs ========');
  console.log('Date:', new Date().toISOString());
  console.log('Headers:', req.headers);
  if (req.file) {
    console.log('>> Fichier reçu: OUI');
    console.log('   - nom:', req.file.originalname || req.file.filename || '(inconnu)');
    console.log('   - mimetype:', req.file.mimetype);
    console.log('   - taille:', req.file.size);
    console.log('   - Buffer type:', typeof req.file.buffer, 'Length:', req.file.buffer?.length);
    console.log('   - First bytes:', req.file.buffer?.slice(0, 16));
  } else {
    console.log('>> Fichier reçu: NON');
  }
  console.log('Body complet:', req.body);
  console.log('=========================================\n');

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

  // 2. Parse PDF si fichier envoyé (pdfParse, sinon OCR si pas de texte)
  let pdfText = '';
  if (req.file) {
    try {
      const parsed = await pdfParse(req.file.buffer);
      pdfText = parsed.text;
      console.log('==> Résultat pdfParse:', pdfText.slice(0, 300));
      if (pdfText.replace(/\s/g, '').length < 50) {
        // Probablement scan, tente OCR
        pdfText = await extractTextWithOCR(req.file.buffer);
        console.log('==> PDF (OCR) extrait:', pdfText.slice(0, 300));
      } else {
        console.log('==> PDF natif extrait (sans OCR):', pdfText.slice(0, 300));
      }
    } catch (err) {
      console.warn('pdfParse erreur:', err.message);
      // Si pdfParse foire, tente direct OCR
      try {
        pdfText = await extractTextWithOCR(req.file.buffer);
        console.log('==> PDF (OCR) extrait après échec pdfParse:', pdfText.slice(0, 300));
      } catch (ocrErr) {
        console.error('Erreur OCR:', ocrErr.message);
        return res.status(200).json({ error: "Impossible de lire ce CV (ni texte, ni OCR)", details: ocrErr.toString() });
      }
    }
  } else {
    // Aucun fichier reçu
    return res.status(200).json({ error: "Aucun fichier reçu (cvFile) ou upload incomplet." });
  }

  // 3. Extraction IA blindée (poste, competences, ville, experience, savoir-être)
  let extracted = { 
    poste_cible: body.poste || "", 
    competences: body.competences || [], 
    ville: body.ville || "", 
    experiences: body.experiences || [],
    savoir_etre: body.savoirEtre || []
  };
  if (pdfText) {
    const promptExtract = `
Lis le CV ci-dessous (brut, pas de format). Ta mission :
- Extrais de façon structurée :
  - "poste_cible" : le métier recherché (ou le plus probable)
  - "competences" : toutes les compétences techniques et transversales (liste)
  - "ville" : la ville ou la zone géographique principale pour la recherche d’emploi
  - "experiences" : liste d’objets { debut, fin, poste, entreprise }
  - "savoir_etre" : soft skills, qualités (liste, si trouvées)
- Si une info n’est pas évidente, infère-la ou laisse la valeur vide ("").

Réponds **UNIQUEMENT** par ce JSON :
{
  "poste_cible": "",
  "competences": [],
  "ville": "",
  "experiences": [{ "debut":"", "fin":"", "poste":"", "entreprise":"" }],
  "savoir_etre": []
}

Attention : retourne un JSON STRICTEMENT valide, sans commentaire, sans texte autour, sans virgule de trop, sinon le résultat sera rejeté.

Texte du CV :
---
${pdfText}
---
`;
    const respExtract = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: promptExtract }],
      temperature: 0.0,
      max_tokens: 400
    });
    const txt = respExtract.choices[0].message.content.trim();
    console.log('OpenAI Extraction brute :', txt);

    try {
      const start = txt.indexOf('{');
      const end = txt.lastIndexOf('}');
      let jsonStr;
      if (start !== -1 && end !== -1) {
        jsonStr = txt.slice(start, end + 1);
      } else {
        jsonStr = txt;
      }
      extracted = JSON.parse(jsonStr);
    } catch (e) {
      try {
        extracted = JSON.parse(jsonrepair(txt));
        console.warn('⚠️ JSON IA réparé automatiquement.');
      } catch (e2) {
        console.error('Erreur parsing extraction IA (même après réparation):', e2, '\nTexte IA reçu :\n', txt);
        return res.status(200).json({
          error: "Erreur de parsing du JSON IA (même après tentative de réparation).",
          details: e2.toString(),
          rawIA: txt
        });
      }
    }
  }

  // Blocage si aucune donnée exploitable
  if (
    (!extracted.poste_cible || extracted.poste_cible.trim() === "") &&
    (!extracted.competences || !extracted.competences.length)
  ) {
    return res.status(200).json({ 
      error: "Impossible d'extraire des infos exploitables du CV. Merci d'envoyer un CV au format texte (pas un scan/image).",
      extractedCV: extracted,
      rawCV: pdfText
    });
  }

  // 4. Critères principaux de recherche d’offres
  let motCle = extracted.poste_cible || body.poste || '';
  if (!motCle) {
    motCle = [...(extracted.competences || []), ...(body.competences || [])].filter(Boolean).join(' ');
  }
  const lieuRecherche = extracted.ville || body.ville || body.adresse || 'Paris';

  if (!motCle) {
    return res.status(200).json({ 
      error: "Aucun mot-clé n’a pu être extrait du CV, ou le format du CV est incompatible.", 
      extractedCV: extracted,
      rawCV: pdfText
    });
  }
  console.log('Recherche offres avec:', motCle, lieuRecherche);

  // 5. Appels aux APIs d’offres
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

  // 6. IA : tri pertinent et justification
  const promptTri = `
Tu es un expert RH. Voici un CV extrait, format JSON :
${JSON.stringify(extracted, null, 2)}

Voici des offres (format JSON) :
${JSON.stringify(allOffres, null, 2)}

Ta mission : sélectionne les 5 offres les plus pertinentes pour ce CV, en priorisant celles qui correspondent :
- au "poste_cible"
- aux "competences"
- à la "ville"
- et à l’expérience (niveau, secteur, etc).

Pour chaque offre retenue, réponds STRICTEMENT dans ce format :
[
  {
    "title": "",
    "company": "",
    "url": "",
    "score": 0.99,
    "motivation": "Correspond au poste visé, aux compétences [X, Y], et à la localisation recherchée"
  },
  ...
]

**AUCUN autre texte.** Retourne seulement ce tableau JSON.
`;
  let smartOffers = [];
  try {
    const respTri = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: promptTri }],
      temperature: 0.0,
      max_tokens: 800
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
