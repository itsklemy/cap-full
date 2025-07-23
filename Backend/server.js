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
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const { getCvHtml_Template1 } = require('../app/templates/CvTemplatesHtml');



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
console.log('➡️ redirect_uri brut :', process.env.GMAIL_REDIRECT_URI);

// ==== App & Middleware ====
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const upload = multer({ storage: multer.memoryStorage() });


app.use(express.static('public'));

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
  source: String,
  mailId: String,
  from: String,
  subject: String,
  deadline: Date,
  recommendations: [String],
});
const AdminDocModel = mongoose.model('AdminDoc', AdminDocSchema);

const GmailTokenSchema = new mongoose.Schema({
  userId: String,
  access_token: String,
  refresh_token: String,
  expires_at: Date
});
const GmailTokenModel = mongoose.model('GmailToken', GmailTokenSchema);

// ==== OpenAI Config ====
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ==== GMAIL OAuth2 ====
const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

// ==== GMAIL: Utilitaires gestion tokens longue durée ====
async function getValidGmailClient(userId) {
  const token = await GmailTokenModel.findOne({ userId });
  if (!token) throw new Error("Token Gmail non trouvé pour cet utilisateur");
  oAuth2Client.setCredentials({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
  });
  // Token expiré ? On refresh !
  if (!token.expires_at || token.expires_at < new Date()) {
    const { credentials } = await oAuth2Client.refreshAccessToken();
    token.access_token = credentials.access_token;
    token.expires_at = new Date(Date.now() + (credentials.expiry_date ? credentials.expiry_date - Date.now() : 3600 * 1000));
    await token.save();
    oAuth2Client.setCredentials({
      access_token: token.access_token,
      refresh_token: token.refresh_token,
    });
  }
  return google.gmail({ version: 'v1', auth: oAuth2Client });
}

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

// ==== GMAIL OAUTH ====

// 1. Demander l'URL d'auth Google pour connecter le compte
// Génère l’URL d’auth pour connecter un compte Gmail précis
app.get('/api/gmail/auth-url', (req, res) => {
  const { userId } = req.query; // ex : "clmbch@gmail.com"
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.labels'
    ],
    prompt: 'select_account consent',
    login_hint: userId, // passe ici l'email utilisé
    redirect_uri: process.env.GMAIL_REDIRECT_URI?.trim()
  });
  res.json({ url: authUrl });
});


// 2. Callback pour sauver les tokens Google/Mail en base
app.get('/api/gmail/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Code manquant');
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const me = await gmail.users.getProfile({ userId: 'me' });
    const googleEmail = me.data.emailAddress; // C’est ce mail qui sera la clé userId

    await GmailTokenModel.findOneAndUpdate(
      { userId: googleEmail },
      {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600 * 1000)
      },
      { upsert: true }
    );
    res.send("✅ Connexion Gmail réussie ! Vous pouvez fermer cette page.");
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ==== Scan et extraction des mails administratifs ====
// Chaque mail analysé par l’IA, transformé en doc "bibliothèque"
app.post('/api/admin-mails/scan', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId (email Gmail) manquant' });
    const gmail = await getValidGmailClient(userId);

    // NOUVEAU FILTRE : tout prendre sur 7 jours pour debug
    const resp = await gmail.users.messages.list({
      userId: 'me',
      q: 'newer_than:7d', // élargir au max pour tester
      maxResults: 50
    });

    let docsSaved = 0;
    if (resp.data.messages && resp.data.messages.length) {
      for (const msg of resp.data.messages) {
        // Pour debug : affiche le sujet de chaque mail trouvé
        const msgData = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
        const headers = msgData.data.payload.headers || [];
        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const from = headers.find(h => h.name === 'From')?.value || '';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        console.log('MAIL RÉCUPÉRÉ :', subject);

        const already = await AdminDocModel.findOne({ mailId: msg.id, userId });
        if (already) continue;

        // --- Extraction body texte sans erreur ---
        let body = '';
        const parts = msgData.data.payload.parts;
        if (parts && Array.isArray(parts)) {
          const partPlain = parts.find(p => p.mimeType === 'text/plain');
          if (partPlain && partPlain.body && partPlain.body.data) {
            body = Buffer.from(partPlain.body.data, 'base64').toString('utf-8');
          }
        } else if (msgData.data.payload.body?.data) {
          body = Buffer.from(msgData.data.payload.body.data, 'base64').toString('utf-8');
        }

        // Analyse IA pour classer et extraire les infos utiles du mail
        let extracted = {
          type: 'Inconnu',
          recommendations: [],
          deadline: null,
          resume: ''
        };
        try {
          const prompt = `
Lis ce mail administratif et indique :
- La nature du mail (facture, relance, attestation, quittance, impôt, aide, etc.)
- S'il y a une action urgente à faire (payer, relancer, transmettre, etc.)
- Si tu trouves une date d'échéance, indique-la
- Résume le mail 
Réponds STRICTEMENT au format JSON :
{
  "type": "",
  "recommendations": [""],
  "deadline": "",
  "resume": ""
}
Mail reçu :
---
Sujet : ${subject}
Corps :
${body}
---
          `;
          const respAi = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 300
          });
          const txt = respAi.choices[0].message.content.trim();
          const jsonStr = txt.substring(txt.indexOf('{'), txt.lastIndexOf('}') + 1);
          extracted = JSON.parse(jsonStr);
        } catch (e) {
          // En cas d'échec de l'IA, laisse les valeurs par défaut
        }

        const doc = new AdminDocModel({
          name: subject || '(mail sans sujet)',
          userId,
          type: 'Inconnu', // à remplacer si tu ajoutes l'analyse IA
          uri: '',
          textContent: body,
          extractedData: {},
          dateUpload: date ? new Date(date) : new Date(),
          source: 'mail',
          mailId: msg.id,
          from,
          subject,
        });
        await doc.save();
        docsSaved++;
      }
    }
    res.json({ ok: true, docsSaved });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==== Upload d'un document administratif + extraction IA/OCR ====
app.post('/api/docs', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu' });
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
    const prompt = `
Lis et analyse attentivement ce document administratif (texte intégral ci-dessous). 

1. Détermine précisément le type de document parmi : 
- facture (électricité, téléphonie, internet, eau, etc.), 
- avis d'imposition, 
- attestation CAF, 
- quittance de loyer, 
- attestation d’assurance, 
- relance, 
- attestation AMELI, 
- document Pôle Emploi, 
- assurance auto 
-Documents relatifs aux RH 
- documents de voyage transport, ou rèservation
- autre (précise si possible).

2. Selon le type, extrais : 
- Pour une facture : "montant", "date", "fournisseur", "numéro de contrat" (ou "référence"), "type de facture" (électricité, gaz, mobile, etc.).
- Pour un avis d’imposition : "année", "montant", "type de document" (revenus, taxe d’habitation, etc.), "date".
- Pour un document CAF : "type d’aide", "montant", "date", "numéro allocataire".
- Pour une quittance de loyer : "montant", "date", "bailleur/propriétaire", "adresse du logement".
- Pour une attestation d’assurance : "assureur", "numéro de contrat", "date de validité", "type d’assurance" (habitation, auto, etc.).
- Pour tout autre type : extrais les infos principales (nature, date, référence, émetteur).

3. Si une info est absente ou non trouvable, laisse la valeur vide ("").

Réponds **UNIQUEMENT** avec ce JSON :
{
  "type": "<type détecté>",
  "infos": {
    ... // objets clés/valeurs extraits comme ci-dessus
  }
}

Aucun commentaire, ni texte avant ou après. Pas de markdown. 
Voici le texte du document à analyser :
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
    const doc = new AdminDocModel({
      name: req.file.originalname,
      userId: req.body.userId || 'demo',
      type: extractedData.type,
      uri: '',
      textContent,
      extractedData,
      dateUpload: new Date(),
      source: 'upload'
    });
    await doc.save();
    res.json({ success: true, doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==== Analyse intelligente de la bibliothèque ====
app.post('/api/docs/analyse', async (req, res) => {
  try {
    const userId = req.body.userId || 'demo';
    const docs = await AdminDocModel.find({ userId }).lean();
    const details = docs.map(d =>
      `Nom: ${d.name}, Type: ${d.type}, Echéance: ${d.deadline || ''}, Source: ${d.source || ''}`
    ).join('\n');
    const prompt = `
Tu es expert en gestion administrative. Voici la bibliothèque de documents de l’utilisateur :

${details}

1. Classe les documents par catégorie : Impôts, CAF, Factures, Logement, Banque, Santé, Assurance, Voyage, Applications, Jobs, Divers.
2. Identifie les pièces manquantes pour avoir un dossier complet (pour chaque grande catégorie).
3. Liste les doublons, incohérences ou dates dépassées.
4. Pour chaque secteur, indique les démarches à anticiper et les relances nécessaires.

Réponds en français, formaté et lisible, mais pas en Markdown.
    `;
    const analyse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500
    });
    res.json({ analyse: analyse.choices[0].message.content.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/docs/list', async (req, res) => {
  const userId = req.query.userId || 'demo';
  try {
    const docs = await AdminDocModel.find({ userId }).sort({ dateUpload: -1 }).lean();
    res.json({ docs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/docs/chat', async (req, res) => {
  const { userId, question } = req.body;
  if (!userId || !question) return res.status(400).json({ error: "userId ou question manquant" });
  try {
    const docs = await AdminDocModel.find({ userId }).lean();
    const context = docs.map(d => `- ${d.type} : ${d.name} [${d.dateUpload?.toLocaleString() || ""}]`).join('\n');
    const prompt = `
Tu es l'assistant administratif personnel de l'utilisateur.
Voici ses documents à ce jour :
${context || "(aucun doc encore)"}

Question : ${question}

Réponds de façon claire et utile, en te basant sur les documents présents. 
`;
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 350,
      temperature: 0.3,
    });
    res.json({ answer: resp.choices[0].message.content.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==== Anticiper les démarches ====
app.post('/api/docs/anticiper', async (req, res) => {
  try {
    const userId = req.body.userId || 'demo';
    const docs = await AdminDocModel.find({ userId }).lean();
    const details = docs.map(d =>
      `Nom: ${d.name}, Type: ${d.type}, Deadline: ${d.deadline || ''}, Source: ${d.source || ''}`
    ).join('\n');
    const prompt = `
Voici la liste des documents administratifs et leurs éventuelles dates d’échéance :

${details}

En te basant sur ce dossier, liste toutes les démarches à anticiper ou relancer (paiement de factures, renouvellement, déclaration à venir, relance, etc) pour éviter tout retard ou pénalité. Classe-les par urgence, et indique la date limite pour chaque action si connue.

Réponds uniquement par une liste concise en français, sans intro.
    `;
    const anticipation = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 350
    });
    res.json({ anticipation: anticipation.choices[0].message.content.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==== Comparer les offres à partir des factures ====
app.post('/api/docs/comparer', async (req, res) => {
  try {
    const userId = req.body.userId || 'demo';
    const docs = await AdminDocModel.find({ userId, type: /facture|edf|engie|gdf|orange|sfr|free/i }).lean();
    if (!docs.length) return res.json({ comparatif: "Aucune facture détectée dans votre bibliothèque." });
    const synthese = docs.map(d =>
      `Nom: ${d.name}, Fournisseur: ${d.extractedData?.infos?.fournisseur || ""}, Montant: ${d.extractedData?.infos?.montant || ""}, Date: ${d.extractedData?.infos?.date || ""}`
    ).join('\n');
    const prompt = `
Voici une synthèse des factures utilisateur :

${synthese}

1. Pour chaque facture (énergie, téléphonie…), propose des alternatives ou offres concurrentes plus avantageuses (avec estimation d’économies potentielles si possible, sinon des conseils pour réduire la facture).
2. Mets en avant les meilleures opportunités pour faire des économies immédiatement.
Réponds seulement par une liste d’actions ou de suggestions, sans texte superflu.
    `;
    const comparaison = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 350
    });
    res.json({ comparatif: comparaison.choices[0].message.content.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==== Smart jobs (CV intelligent ou import) ====
app.post('/api/smart-jobs', upload.single('cvFile'), async (req, res) => {
  // TA ROUTE CV/EMPLOI ICI (identique à avant, non modifié ici pour la lisibilité)
});
// ==== Smart jobs (CV intelligent ou import) ====
app.post('/api/smart-jobs', upload.single('cvFile'), async (req, res) => {
  console.log('===> /api/smart-jobs: requête reçue');
  try {
    let userProfile = {};
    if (req.file) {
      console.log('===> CV PDF importé');
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
      userProfile = { texte: textContent, ville: req.body.ville || '' };
    } else {
      console.log('===> Formulaire rempli, pas de PDF');
      userProfile = {
        nom: req.body.nom, prenom: req.body.prenom, adresse: req.body.adresse, ville: req.body.ville,
        mail: req.body.mail, tel: req.body.tel, poste: req.body.poste, typeContrat: req.body.typeContrat,
        competences: req.body.competences || [],
        savoirEtre: req.body.savoirEtre || [],
        experiences: req.body.experiences || []
      };
      if (typeof userProfile.competences === 'string') userProfile.competences = JSON.parse(userProfile.competences);
      if (typeof userProfile.savoirEtre === 'string') userProfile.savoirEtre = JSON.parse(userProfile.savoirEtre);
      if (typeof userProfile.experiences === 'string') userProfile.experiences = JSON.parse(userProfile.experiences);
    }

    // Recherche d'offres
    console.log('===> Recherche d\'offres');
    async function getPoleEmploiTokenSafe(timeoutMs = 2000) {
      return Promise.race([
        getPoleEmploiToken(),
        new Promise(resolve => setTimeout(() => resolve(null), timeoutMs))
      ]);
    }
    const token = await getPoleEmploiTokenSafe();
    let offres = [];
    if (userProfile.poste || userProfile.competences?.length) {
      let keyword = userProfile.poste || (userProfile.competences?.[0] || '');
      let ville = userProfile.ville || '';
      let pe = [], adz = [];
      if (token) {
        console.log('===> Recherche Pole Emploi...');
        pe = await searchJobsPoleEmploi(token, keyword, ville);
        console.log('===> PE terminé', pe.length);
      }
      console.log('===> Recherche Adzuna...');
      adz = await searchJobsAdzuna(keyword, ville);
      console.log('===> Adzuna terminé', adz.length);
      offres = [...pe, ...adz].slice(0, 15);
    }

    let feedbackIA = '';
    let propositions = [];
    if (offres.length === 0) {
      console.log('===> Aucune offre, prompt IA de réorientation');
      const prompt = `
Voici le profil d'une personne en recherche d'emploi, pour laquelle aucune offre immédiate n'a été trouvée avec ses critères.
Détaille :
1. Une analyse rapide de son parcours et de ses compétences (même si info partielle)
2. Propose trois axes de réorientation professionnelle concrets, adaptés à son expérience, ses compétences et ses savoir-être. Pour chaque axe, donne :
- une suggestion de métier réaliste
- pourquoi ce métier est pertinent
- la première action concrète à faire pour s’orienter vers cette voie.
Sois très concret, donne des conseils immédiatement activables (site, contact, formation, etc), en français, sans intro ni blabla.

Profil :
${JSON.stringify(userProfile, null, 2)}
      `;
      try {
        const resp = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.15,
          max_tokens: 350
        });
        feedbackIA = resp.choices?.[0]?.message?.content?.trim() || "Pas d'analyse IA disponible pour ce profil.";
      } catch (e) {
        feedbackIA = "Impossible de générer l’analyse IA.";
      }
      // Suggestions de plateformes ou aides (toujours utiles en plus)
      propositions = [
        { title: "Formations à distance (OpenClassrooms)", url: "https://openclassrooms.com/fr/" },
        { title: "Bilan de compétences (CPF)", url: "https://moncompteformation.gouv.fr/" }
      ];
    } else {
      feedbackIA = `Bravo ! Ton profil ressort principalement pour le métier de "${userProfile.poste || offres[0]?.title}".`;
      propositions = [];
      console.log('===> Offres trouvées');
    }

    // Génération PDF si nécessaire
    let cvPdfUrl = '';
    if ((userProfile.nom && userProfile.prenom) || userProfile.texte) {
      console.log('===> Génération PDF');
      const cvHtml = getCvHtml_Template1(userProfile, { mainColor: "#1DFFC2" });
      const browser = await puppeteer.launch({ headless: 'new' });
      const page = await browser.newPage();
      await page.setContent(cvHtml, { waitUntil: 'networkidle0' });
      const filename = `cv-${Date.now()}-${Math.floor(Math.random()*100000)}.pdf`;
      const pdfPath = path.join(__dirname, 'public', filename);
      await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
      await browser.close();
      cvPdfUrl = `https://cap-backend-new.onrender.com/${filename}`;
    }

    console.log('===> Réponse envoyée');
    res.json({
      smartOffers: offres,
      feedbackIA,
      propositions,
      cvPdfUrl
    });

  } catch (e) {
    console.error('Erreur smart-jobs', e);
    res.status(500).json({
      error: e.message || 'Erreur interne backend',
      smartOffers: [],
      feedbackIA: "Erreur dans l’analyse du profil ou du CV. Merci de réessayer.",
      propositions: [
        { title: "Faire un bilan de compétences (CPF)", url: "https://moncompteformation.gouv.fr/" },
        { title: "Essayer d’autres métiers sur Pôle Emploi", url: "https://www.pole-emploi.fr/" }
      ],
      cvPdfUrl: ''
    });
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

// ==== CRON auto : scan toutes les 6h pour tous les utilisateurs connectés ====
cron.schedule('15 */6 * * *', async () => {
  try {
    const users = await GmailTokenModel.find().lean();
    for (const u of users) {
      try {
        await fetch('http://localhost:' + (process.env.PORT || 10000) + '/api/admin-mails/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: u.userId })
        });
        console.log('✅ Scan auto admin mails pour', u.userId);
      } catch (err) {
        console.error('❌ Scan CRON admin mails pour', u.userId, err.message);
      }
    }
  } catch (err) {
    console.error('❌ CRON admin-mails global', err.message);
  }
});

// ==== Start server ====
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ CAP API running on http://localhost:${PORT}`));

