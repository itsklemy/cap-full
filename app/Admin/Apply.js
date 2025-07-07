import * as DocumentPicker from 'expo-document-picker';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';

const BACKEND_URL = 'https://cap-backend-new.onrender.com';

// ---- Analyse intelligente : Détecte type & actions recommandées selon le doc ----
function analyseDocumentType(name) {
  const lower = name.toLowerCase();
  if (lower.includes('paie')) return { type: 'Fiche de paie', cat: 'Salaire' };
  if (lower.includes('facture') || lower.includes('edf') || lower.includes('engie')) return { type: 'Facture', cat: 'Factures' };
  if (lower.includes('quittance')) return { type: 'Quittance de loyer', cat: 'Logement' };
  if (lower.includes('rib')) return { type: 'RIB', cat: 'Banque' };
  if (lower.includes('impot') || lower.includes('avis')) return { type: 'Avis d\'imposition', cat: 'Impôts' };
  if (lower.includes('caf')) return { type: 'CAF', cat: 'Aides sociales' };
  if (lower.includes('ameli') || lower.includes('vitale')) return { type: 'Sécu / Santé', cat: 'Santé' };
  if (lower.includes('auto-entrepreneur') || lower.includes('urssaf')) return { type: 'Auto-entrepreneur', cat: 'Professionnel' };
  if (lower.includes('avocat')) return { type: 'Avocat', cat: 'Justice' };
  return { type: 'Autre', cat: 'Divers' };
}

// ---- Chat IA flottant ----
function LibraryChatWidget({ visible, onClose }) {
  const [messages, setMessages] = useState([
    { from: "CAP", text: "Bienvenue dans ta bibliothèque CAP. Pose-moi toutes tes questions ou demande un conseil sur tes documents !" }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  async function sendMessage() {
    if (!input) return;
    setMessages([...messages, { from: "user", text: input }]);
    setSending(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/docs/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "demo", question: input }) // adapte l'userId si nécessaire
      });
      const data = await res.json();
      setMessages(m => [...m, { from: "CAP", text: data.answer || "Réponse non disponible." }]);
    } catch (e) {
      setMessages(m => [...m, { from: "CAP", text: "Erreur IA : " + (e.message || "Pas de réponse") }]);
    }
    setSending(false);
    setInput('');
  }
  

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.18)" }}>
        <View style={{
          backgroundColor: "#fff", borderTopLeftRadius: 26, borderTopRightRadius: 26, minHeight: 370, padding: 18,
          shadowColor: "#1DFFC2", shadowOpacity: 0.11, shadowRadius: 16, elevation: 7
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: "#1DFFC2", flex: 1 }}>Chat IA CAP</Text>
            <TouchableOpacity onPress={onClose}><Text style={{ color: "#1DFFC2", fontWeight: "bold", fontSize: 15 }}>Fermer</Text></TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 200, marginBottom: 13 }}>
            {messages.map((m, i) => (
              <View key={i} style={{
                alignSelf: m.from === "CAP" ? "flex-start" : "flex-end",
                backgroundColor: m.from === "CAP" ? "#E7FFF7" : "#1DFFC2",
                borderRadius: 11, marginBottom: 8, padding: 9, maxWidth: "85%"
              }}>
                <Text style={{ color: m.from === "CAP" ? "#1DFFC2" : "#fff" }}>{m.text}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={{ flexDirection: "row" }}>
            <TextInput
              style={{ flex: 1, borderWidth: 1, borderColor: "#1DFFC2", borderRadius: 11, padding: 8, fontSize: 15, marginRight: 8 }}
              value={input}
              onChangeText={setInput}
              placeholder="Pose ta question…"
              editable={!sending}
            />
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!input || sending}
              style={{
                backgroundColor: "#1DFFC2", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16,
                opacity: (!input || sending) ? 0.6 : 1
              }}>
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Envoyer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---- Bibliothèque Drive futuriste ----
function FuturLibraryModal({ showLibrary, setShowLibrary, docs, notif, setShowChat, showChat }) {
  const byCat = {};
  docs.forEach(doc => {
    const cat = doc.cat || "Divers";
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(doc);
  });
  const cats = Object.keys(byCat);

  return (
    <Modal visible={showLibrary} animationType="slide">
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F6FCFB" }}>
        {/* HEADER */}
        <View style={styles.libraryHeader}>
          <Text style={styles.libraryTitle}>Bibliothèque intelligente</Text>
          <TouchableOpacity onPress={() => setShowLibrary(false)}>
            <Text style={styles.closeBtn}>Fermer</Text>
          </TouchableOpacity>
        </View>
        {/* ALERTES/RAPPELS */}
        {notif.length > 0 && (
          <View style={styles.alertBlock}>
            {notif.map((n, i) => (
              <Text key={i} style={styles.alertText}>{n.label}</Text>
            ))}
          </View>
        )}
        {/* BARRE D'ACTIONS FUTURISTE */}
        <View style={styles.futurBar}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert("À venir", "Analyse complète bientôt dispo.")}>
            <Text style={styles.actionBtnText}>Analyser ma bibliothèque</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert("À venir", "Fonction anticipation à venir.")}>
            <Text style={styles.actionBtnText}>Anticiper mes démarches</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert("À venir", "Comparateur d'offres à venir.")}>
            <Text style={styles.actionBtnText}>Comparer mes offres</Text>
          </TouchableOpacity>
        </View>
        {/* DOSSIERS PAR CATÉGORIE */}
        <ScrollView contentContainerStyle={{ paddingBottom: 180 }}>
          {cats.map(cat => (
            <View key={cat} style={styles.folderBlock}>
              {/* Bloc dossier spacieux */}
              <View style={styles.folderHeader}>
                <Text style={styles.folderTitle}>{cat}</Text>
              </View>
              {/* Documents */}
              <View style={styles.docsRow}>
                {byCat[cat].map((d, i) => (
                  <View key={i} style={styles.driveCard}>
                    <Text style={styles.docTitle}>{d.name}</Text>
                    <Text style={styles.docType}>{d.type}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 7 }}>
                      <TouchableOpacity onPress={() => Linking.openURL(d.uri)}>
                        <Text style={styles.linkBtn}>Ouvrir</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => Alert.alert("Suppression non active en prod")}>
                        <Text style={styles.deleteBtn}>Suppr.</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
        {/* CHAT IA flottant */}
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => setShowChat(true)}
        >
          <Text style={styles.chatIcon}>💬</Text>
        </TouchableOpacity>
        <LibraryChatWidget visible={showChat} onClose={() => setShowChat(false)} />
      </SafeAreaView>
    </Modal>
  );
}

export default function AdminApplyScreen() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [gmailAccessToken, setGmailAccessToken] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [notif, setNotif] = useState([]);

  useEffect(() => { fetchDocsFromBackend(); }, []);

  async function fetchDocsFromBackend() {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/docs/list?userId=demo`);
      const data = await res.json();
      if (Array.isArray(data.docs)) {
        setDocs(data.docs.map(doc => ({
          ...doc,
          ...analyseDocumentType(doc.name)
        })));
      }
    } finally { setLoading(false); }
  }

  async function handleImportDoc() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets || !result.assets[0]) return;
      const file = result.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name || 'document.pdf',
        type: file.mimeType || 'application/pdf',
      });
      formData.append('userId', 'demo');
      const response = await fetch(`${BACKEND_URL}/api/docs`, { method: 'POST', body: formData });
      let data;
      try { data = await response.json(); } catch (e) { throw new Error("Erreur réseau ou backend (pas de JSON retourné)"); }
      if (data.doc) {
        const analysis = analyseDocumentType(data.doc.name);
        setDocs(prev => [...prev, { ...data.doc, uri: file.uri, ...analysis }]);
        Alert.alert("Succès", "Document importé !");
      } else {
        Alert.alert("Erreur", data.error || "Upload impossible.");
      }
    } catch (e) { Alert.alert("Erreur", e?.message || "Upload impossible."); }
  }

  async function handleConnectGmail() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/gmail/auth-url`);
      const { url } = await res.json();
      if (!url) throw new Error("Aucune URL d'auth trouvée");
      const result = await WebBrowser.openAuthSessionAsync(url, 'exp://localhost:19000');
      if (result.type === 'success' && result.url) {
        const code = new URL(result.url).searchParams.get('code');
        if (code) {
          const cbRes = await fetch(`${BACKEND_URL}/api/gmail/callback?code=${code}`);
          const data = await cbRes.json();
          if (data.tokens?.access_token) {
            setGmailAccessToken(data.tokens.access_token);
            Alert.alert("Connexion Gmail réussie", "CAP est connecté à ta boîte mail.");
          } else {
            Alert.alert("Erreur", data.error || "Connexion Gmail impossible.");
          }
        } else {
          Alert.alert("Erreur", "Code d'auth introuvable dans l'URL.");
        }
      }
    } catch (e) { Alert.alert("Erreur", e.message || "Impossible de connecter Gmail."); }
  }

  async function handleExtractionEmails() {
    if (!gmailAccessToken) {
      Alert.alert("Connexion requise", "Connecte-toi d'abord à Gmail pour autoriser l'accès à ta boîte mail.", [
        { text: "Se connecter à Gmail", onPress: handleConnectGmail }
      ]);
      return;
    }
    const res = await fetch(`${BACKEND_URL}/api/admin-mails/scan`, {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "demo" }) // ou l'email Gmail réel si dispo
    });
    const data = await res.json();
    if (data.ok) {
      fetchDocsFromBackend();
      Alert.alert("Extraction depuis mails", `${data.docsSaved} documents extraits et classés avec succès.`);
    } else {
      Alert.alert("Erreur", data.error || "Impossible d’extraire les mails.");
    }
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/mails/extract`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: gmailAccessToken })
      });
      const data = await res.json();
      if (data.documents) {
        setDocs(prev => [
          ...prev,
          ...data.documents.map(doc => ({ ...doc, ...analyseDocumentType(doc.name) }))
        ]);
        Alert.alert("Extraction depuis mails", "Documents extraits et classés avec succès.");
      } else {
        Alert.alert("Erreur", data.error || "Impossible d’extraire les mails.");
      }
    } catch (e) {
      Alert.alert("Erreur", e.message || "Impossible d’extraire les mails.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    const today = new Date();
    let notifs = [];
    docs.forEach(doc => {
      if (doc.type === 'Fiche de paie' && doc.date && (new Date(doc.date)).getFullYear() < today.getFullYear()) {
        notifs.push({ label: "Tes fiches de paie anciennes sont à archiver ou supprimer", cat: doc.cat });
      }
      if (doc.type === 'Facture') {
        notifs.push({ label: "Nouvelle facture détectée ! Vérifie s’il y a une hausse ou possibilité d’économiser.", cat: doc.cat });
      }
      if (doc.type === 'RIB') {
        notifs.push({ label: "Un RIB est prêt à être transmis à tout organisme ou employeur.", cat: doc.cat });
      }
    });
    setNotif(notifs);
  }, [docs]);

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
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ CAP API running on http://localhost:${PORT}`));


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.title}>CAP : ta bibliothèque administrative intelligente</Text>
        <Text style={styles.subtitle}>
          Tous tes documents rassemblés automatiquement, organisés et prêts à être analysés ou comparés.
        </Text>
        {loading && <ActivityIndicator size="large" color="#1DFFC2" style={{ marginTop: 20 }} />}
        <TouchableOpacity style={styles.libraryBtn} onPress={() => setShowLibrary(true)}>
          <Text style={styles.libraryBtnText}>Ouvrir ma bibliothèque</Text>
        </TouchableOpacity>
        <View style={styles.optionsBlock}>
          <TouchableOpacity style={styles.bigBtn} onPress={handleConnectGmail} disabled={loading}>
            <Text style={styles.bigBtnTitle}>Connecter Gmail</Text>
            <Text style={styles.bigBtnDesc}>Autorise CAP à détecter et extraire tous tes docs administratifs importants depuis ta boîte mail.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bigBtn} onPress={handleExtractionEmails} disabled={loading}>
            <Text style={styles.bigBtnTitle}>Extraire tous mes documents</Text>
            <Text style={styles.bigBtnDesc}>Récupère toutes tes fiches de paie, factures, attestations, etc. classées automatiquement.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bigBtn} onPress={handleImportDoc} disabled={loading}>
            <Text style={styles.bigBtnTitle}>Ajouter un document manuellement</Text>
            <Text style={styles.bigBtnDesc}>Photo, scan ou PDF : CAP détecte le type et le classe directement.</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <FuturLibraryModal
        showLibrary={showLibrary}
        setShowLibrary={setShowLibrary}
        docs={docs}
        notif={notif}
        setShowChat={setShowChat}
        showChat={showChat}
      />
    </SafeAreaView>
  );
}

// ---- STYLES ----
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 0 },
  title: { fontSize: 25, fontWeight: 'bold', color: '#1DFFC2', marginLeft: 24, marginTop: 32, marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#343434', marginLeft: 24, marginBottom: 16, opacity: 0.8, fontWeight: '500' },
  libraryBtn: { marginTop: 8, marginLeft: 24, marginBottom: 10, alignSelf: 'flex-start' },
  libraryBtnText: { color: '#1DFFC2', fontWeight: '700', fontSize: 15 },
  optionsBlock: { paddingHorizontal: 18, marginTop: 10, gap: 18 },
  bigBtn: { backgroundColor: '#E7FFF7', borderRadius: 18, paddingVertical: 20, paddingHorizontal: 18, marginBottom: 2, borderColor: '#1DFFC2', borderWidth: 1.2, shadowColor: '#eee', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  bigBtnTitle: { color: '#1DFFC2', fontWeight: '700', fontSize: 16, marginBottom: 5 },
  bigBtnDesc: { color: '#222', fontSize: 14, opacity: 0.75 },

  // --- BIBLIOTHÈQUE STYLE DRIVE ---
  libraryHeader: { flexDirection: "row", alignItems: "center", padding: 24, backgroundColor: "#E7FFF7", borderBottomColor: "#1DFFC2", borderBottomWidth: 1.5 },
  libraryTitle: { fontSize: 28, color: "#1DFFC2", fontWeight: "bold", flex: 1, letterSpacing: 0.5 },
  closeBtn: { fontWeight: "bold", color: "#1DFFC2", fontSize: 20 },

  alertBlock: { backgroundColor: "#E7FFF7", borderRadius: 13, marginHorizontal: 24, marginTop: 18, marginBottom: 6, padding: 14, borderLeftWidth: 4, borderLeftColor: "#1DFFC2" },
  alertText: { color: "#1DFFC2", fontWeight: "600", fontSize: 15, marginBottom: 3 },

  futurBar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 18, marginVertical: 19, gap: 7 },
  actionBtn: { flex: 1, backgroundColor: "#fff", borderRadius: 13, marginHorizontal: 4, paddingVertical: 17, alignItems: "center", borderColor: "#1DFFC2", borderWidth: 1.2, elevation: 2 },
  actionBtnText: { color: "#1DFFC2", fontWeight: "bold", fontSize: 15 },

  folderBlock: { marginBottom: 35, marginTop: 10, paddingHorizontal: 0 },
  folderHeader: { backgroundColor: "#1DFFC2", paddingVertical: 18, paddingHorizontal: 24, borderRadius: 19, marginBottom: 12, marginTop: 3, alignSelf: "stretch" },
  folderTitle: { fontWeight: "bold", color: "#fff", fontSize: 22, letterSpacing: 0.5, textTransform: "uppercase" },
  docsRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, paddingLeft: 12 },

  driveCard: { backgroundColor: "#fff", borderRadius: 19, padding: 15, marginBottom: 7, marginRight: 10, width: 260, minHeight: 95, justifyContent: "space-between", shadowColor: "#aaa", shadowOpacity: 0.07, shadowRadius: 7, elevation: 2 },
  docTitle: { color: "#111", fontWeight: "700", fontSize: 15, marginBottom: 4 },
  docType: { color: "#1DFFC2", fontWeight: "500", fontSize: 14, marginBottom: 4 },
  linkBtn: { color: "#1DFFC2", fontWeight: "bold", fontSize: 14, marginRight: 13 },
  deleteBtn: { color: "#FF5252", fontWeight: "bold", fontSize: 14 },

  chatBtn: { position: "absolute", bottom: 33, right: 27, backgroundColor: "#1DFFC2", borderRadius: 40, padding: 18, zIndex: 90, shadowColor: "#111", shadowOpacity: 0.14, shadowRadius: 8 },
  chatIcon: { fontSize: 27, color: "#fff", fontWeight: "bold" },
});

