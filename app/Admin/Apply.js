import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
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
  View
} from 'react-native';

// CHANGE ICI avec l’IP locale de ton PC backend
const BACKEND_IP = '192.168.X.X'; // <-- Mets ici ton IP locale réseau (ex: 192.168.1.42)
const BACKEND_URL = `https://test-backend-push.onrender.com/api/openai`;

async function callOpenAI(prompt, temperature = 0.6) {
  const res = await fetch(BACKEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      temperature,
      model: "gpt-4o",
      max_tokens: 900,
    }),
  });
  data = await res.json();
  if (!data.content) throw new Error(data.error || "Réponse vide");
  return data.content.trim();
}

function getDocCategory(name) {
  const lower = name.toLowerCase();
  if (lower.includes('impot') || lower.includes('avis')) return 'Impôts';
  if (lower.includes('caf')) return 'CAF';
  if (lower.includes('facture') || lower.includes('edf') || lower.includes('engie') || lower.includes('électricité')) return 'Factures';
  if (lower.includes('sosh') || lower.includes('orange') || lower.includes('mobile')) return 'Téléphonie';
  if (lower.includes('sécu') || lower.includes('vitale') || lower.includes('ameli')) return 'Santé';
  return 'Autres';
}

export default function AdminApplyScreen() {
  const [step, setStep] = useState(0);
  const [actions, setActions] = useState([]);
  const [showOffers, setShowOffers] = useState(false);
  const [docs, setDocs] = useState([]);
  const [loadingGen, setLoadingGen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryCategory, setLibraryCategory] = useState('Toutes');

  // 1. Analyse bibliothèque
  async function handleAnalyseBibliotheque() {
    setLoadingGen(true);
    try {
      const docList = docs.map(d => d.name).join(', ');
      const prompt = `
Voici une liste de documents administratifs de l'utilisateur : ${docList}.
- Classe chaque document dans une catégorie : Impôts, CAF, Factures, Téléphonie, Santé, Autres.
- Indique les documents manquants (exemple : "Il manque l'avis d'imposition 2022").
- Repère les doublons ou incohérences (ex : 2 factures EDF du même mois).
- Pour chaque secteur, dis ce qu’il faudrait anticiper ou relancer.
- Présente tout ça simplement.
Pas de markdown, réponses courtes, synthétiques, en français.
      `;
      const analyse = await callOpenAI(prompt);
      Alert.alert("Analyse bibliothèque CAP", analyse);
    } catch (e) {
      Alert.alert("Erreur", e.message || "Analyse impossible.");
    } finally {
      setLoadingGen(false);
    }
  }

  // 2. Anticipation démarches
  async function handleAnticipationDémarches() {
    setLoadingGen(true);
    try {
      const prompt = `
Tu es un assistant administratif qui anticipe toutes les démarches à prévoir pour l’utilisateur. Analyse :
- Pièces expirées (carte identité, titre de séjour)
- Demandes RSA/CAF en attente
- Factures non payées, relances à faire
- Relances auprès des administrations si pas de réponse après 7 jours
Pour chaque point, explique quoi faire : exemple “Relancer la CAF maintenant”, “Renouveler la carte d’identité”, “Rappeler EDF”.
Présente tout sous forme de to-do ultra concrète. Réponses courtes, en français.
      `;
      const plan = await callOpenAI(prompt);
      Alert.alert("Démarches à anticiper", plan);
    } catch (e) {
      Alert.alert("Erreur", e.message || "Impossible d’anticiper.");
    } finally {
      setLoadingGen(false);
    }
  }

  // 3. Génération lettre IA
  async function handleGenLetter({ nom = "Martin", fournisseur = "EDF", contrat = "12345678", adresse = "14 rue du Parc, Lyon", type = "résiliation" }) {
    setLoadingGen(true);
    try {
      const prompt = `
Génère une lettre de ${type} d’abonnement, complète et professionnelle, pour :
- Nom : ${nom}
- Fournisseur : ${fournisseur}
- Référence contrat : ${contrat}
- Adresse : ${adresse}
Lettre claire, prête à envoyer, sans intro ni markdown.
      `;
      const lettre = await callOpenAI(prompt);
      Alert.alert("Lettre générée", lettre);
    } catch (e) {
      Alert.alert("Erreur", e.message || "Impossible de générer la lettre.");
    } finally {
      setLoadingGen(false);
    }
  }

  // 4. Optimisation factures
  async function handleOptimisationFactures() {
    setLoadingGen(true);
    try {
      const res = await fetch(`https://test-backend-push.onrender.com/api/openai`, { method: 'POST' });
      const data = await res.json();
      Alert.alert("Optimisation factures", data.message || "Optimisation réussie");
    } catch (e) {
      Alert.alert("Erreur", e.message || "Impossible d’optimiser.");
    } finally {
      setLoadingGen(false);
    }
  }

  // 5. Extraction mails
  async function handleExtractionEmails() {
    setLoadingGen(true);
    try {
      const res = await fetch(`https://test-backend-push.onrender.com/api/openai`, { method: 'POST' });
      const data = await res.json();
      if (data.documents) {
        setDocs(prev => [...prev, ...data.documents]);
      }
      Alert.alert("Extraction depuis mails", "Documents extraits avec succès");
    } catch (e) {
      Alert.alert("Erreur", e.message || "Impossible d’extraire les mails.");
    } finally {
      setLoadingGen(false);
    }
  }

  // Import doc via picker
  async function handleImportDoc() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets) {
        setDocs(prev => [
          ...prev,
          ...result.assets.map(file => ({
            name: file.name,
            uri: file.uri,
            type: file.mimeType || 'application/octet-stream',
            date: new Date().toISOString(),
          }))
        ]);
        Alert.alert("Document importé", "Le document a bien été ajouté à ta bibliothèque CAP.");
      }
    } catch (e) {
      Alert.alert("Erreur", "Impossible d'importer le document.");
    }
  }

  // Ouvrir doc avec Linking
  function openDocument(uri) {
    Linking.openURL(uri).catch(() => {
      Alert.alert("Erreur", "Impossible d'ouvrir ce document.");
    });
  }

  function renderLibrary() {
    const byCat = {};
    docs.forEach(doc => {
      const cat = getDocCategory(doc.name);
      if (!byCat[cat]) byCat[cat] = [];
      byCat[cat].push(doc);
    });
    const cats = Object.keys(byCat);

    return (
      <Modal visible={showLibrary} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={{ flexDirection: "row", alignItems: "center", padding: 18 }}>
            <Text style={{ fontSize: 21, color: "#1DFFC2", fontWeight: "bold", flex: 1 }}>Ma bibliothèque CAP</Text>
            <TouchableOpacity onPress={() => setShowLibrary(false)}>
              <Text style={{ fontWeight: "bold", color: "#1DFFC2", fontSize: 17 }}>Fermer</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 42 }}>
            {/* Filtres catégories */}
            <ScrollView horizontal style={{ marginBottom: 12, marginLeft: 14 }}>
              <TouchableOpacity onPress={() => setLibraryCategory("Toutes")}>
                <Text style={{
                  marginRight: 12,
                  color: libraryCategory === "Toutes" ? "#1DFFC2" : "#555",
                  fontWeight: libraryCategory === "Toutes" ? "bold" : "500"
                }}>Toutes</Text>
              </TouchableOpacity>
              {cats.map(cat => (
                <TouchableOpacity key={cat} onPress={() => setLibraryCategory(cat)}>
                  <Text style={{
                    marginRight: 12,
                    color: libraryCategory === cat ? "#1DFFC2" : "#555",
                    fontWeight: libraryCategory === cat ? "bold" : "500"
                  }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {/* Docs par catégorie */}
            {cats.map(cat => {
              if (libraryCategory !== "Toutes" && libraryCategory !== cat) return null;
              return (
                <View key={cat} style={{ marginBottom: 20 }}>
                  <Text style={{ fontWeight: "bold", color: "#1DFFC2", fontSize: 16, marginLeft: 18 }}>{cat}</Text>
                  {byCat[cat].map((d, i) => (
                    <View key={i} style={{
                      backgroundColor: "#F8FFFD",
                      borderRadius: 9,
                      padding: 11,
                      marginHorizontal: 14,
                      marginVertical: 6,
                      flexDirection: "row",
                      alignItems: "center"
                    }}>
                      <TouchableOpacity style={{ flex: 1 }} onPress={() => openDocument(d.uri)}>
                        <Text style={{ color: "#111", fontWeight: "500" }}>{d.name}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setDocs(prev => prev.filter((dd, idx) => dd.name !== d.name || idx !== i))}>
                        <Text style={{ color: "#FF5252", fontWeight: "bold", marginLeft: 8 }}>Suppr.</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  }

  async function handleFranceConnect() {
    Alert.alert(
      "Connexion FranceConnect",
      "Tu vas être redirigé·e vers FranceConnect pour t’authentifier.\n\nAprès connexion, CAP télécharge automatiquement tous tes documents administratifs (CAF, Impôts, Ameli…).\nTu reviens sur CAP et tu retrouves tout dans ta bibliothèque — sans rien faire !"
    );
    setUploading(true);
    setTimeout(() => {
      setDocs(prev => [
        ...prev,
        { name: "Avis d'imposition 2023.pdf", uri: 'fakeuri://avisimpots', type: 'application/pdf', date: new Date().toISOString() },
        { name: "Attestation CAF.pdf", uri: 'fakeuri://caf', type: 'application/pdf', date: new Date().toISOString() },
        { name: "Attestation carte vitale.jpg", uri: 'fakeuri://ameli', type: 'image/jpeg', date: new Date().toISOString() }
      ]);
      setUploading(false);
      Alert.alert("Succès !", "Documents FranceConnect récupérés et ajoutés à ta bibliothèque CAP.");
    }, 2000);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 44 }}>
        <Text style={styles.title}>Mes démarches, zéro charge mentale</Text>
        {uploading && <ActivityIndicator size="large" color="#1DFFC2" style={{ marginTop: 20 }} />}
        <Text style={styles.subtitle}>
          CAP récupère et automatise tes papiers administratifs. Choisis comment démarrer.
        </Text>
        <TouchableOpacity style={styles.libraryBtn} onPress={() => setShowLibrary(true)}>
          <Text style={styles.libraryBtnText}>📁 Voir ma bibliothèque</Text>
        </TouchableOpacity>
        {step === 0 && (
          <View style={styles.optionsBlock}>
            <TouchableOpacity
              style={styles.bigBtn}
              onPress={handleFranceConnect}
              disabled={uploading || loadingGen}
            >
              <Text style={styles.bigBtnTitle}>Connexion FranceConnect</Text>
              <Text style={styles.bigBtnDesc}>Connecte-toi pour récupérer automatiquement tous tes documents officiels. Retour ici automatique, CAP gère tout.</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bigBtn}
              onPress={handleExtractionEmails}
              disabled={loadingGen}
            >
              <Text style={styles.bigBtnTitle}>Connexion à ma boîte mail</Text>
              <Text style={styles.bigBtnDesc}>Autorise CAP à accéder à tes mails pour repérer et classer tous tes documents importants.</Text>
            </TouchableOpacity>
            <View style={styles.smallBtnBox}>
              <TouchableOpacity style={styles.smallBtn} onPress={handleImportDoc}>
                <Text style={styles.smallBtnTitle}>Importer une capture ou un document</Text>
                <Text style={styles.smallBtnDesc}>Ajoute une photo ou un PDF, CAP les trie et les classe dans ta bibliothèque privée (espace illimité).</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.analyseBtn} onPress={handleAnalyseBibliotheque} disabled={loadingGen}>
              <Text style={styles.analyseBtnText}>{loadingGen ? "Analyse..." : "Analyser ma bibliothèque"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.analyseBtn} onPress={handleAnticipationDémarches} disabled={loadingGen}>
              <Text style={styles.analyseBtnText}>{loadingGen ? "Analyse..." : "Anticiper mes démarches"}</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.optimBlock}>
          <Text style={styles.optimTitle}>Optimiser mes factures et abonnements</Text>
          <Text style={styles.optimDesc}>CAP analyse tes factures pour repérer les meilleures offres du moment. Change de fournisseur en 1 clic, on gère la résiliation et la souscription.</Text>
          <TouchableOpacity style={styles.scanBtn} onPress={handleOptimisationFactures} disabled={loadingGen}>
            <Text style={styles.scanBtnText}>{loadingGen ? "Optimisation..." : "Scanner mes factures"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {renderLibrary()}
    </SafeAreaView>
  );
}

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
  smallBtnBox: { marginTop: 8, marginBottom: 8 },
  smallBtn: { backgroundColor: '#f8fffd', borderRadius: 14, borderColor: '#d5fff5', borderWidth: 1, paddingVertical: 14, paddingHorizontal: 14 },
  smallBtnTitle: { color: '#1DFFC2', fontWeight: '600', fontSize: 14, marginBottom: 2 },
  smallBtnDesc: { color: '#555', fontSize: 13, opacity: 0.72 },
  docLibBlock: { backgroundColor: '#F8FFFD', borderRadius: 11, padding: 12, marginTop: 16, marginBottom: 8, borderColor: '#1DFFC2', borderWidth: 1 },
  docLibTitle: { color: '#1DFFC2', fontWeight: '700', fontSize: 14, marginBottom: 8 },
  docItem: { borderBottomColor: '#d5fff5', borderBottomWidth: 1, paddingVertical: 6 },
  docName: { color: '#111', fontWeight: '500', fontSize: 14 },
  autoBlock: { marginTop: 14, marginBottom: 16, padding: 12, backgroundColor: '#F6FCFB', borderRadius: 14, borderLeftWidth: 3, borderLeftColor: '#1DFFC2' },
  autoTitle: { fontWeight: '600', color: '#1DFFC2', fontSize: 14, marginBottom: 4 },
  autoDesc: { color: '#222', fontSize: 13, opacity: 0.7 },
  analyseBtn: { backgroundColor: '#1DFFC2', borderRadius: 22, paddingVertical: 16, alignItems: 'center', marginTop: 18 },
  analyseBtnText: { color: '#111', fontWeight: 'bold', fontSize: 17 },
  analyseBlock: { paddingHorizontal: 20, paddingBottom: 40, gap: 18 },
  cardAction: { backgroundColor: '#E7FFF7', borderRadius: 13, padding: 16, marginBottom: 8 },
  actionLabel: { color: '#222', fontWeight: '500', fontSize: 15, marginBottom: 8 },
  actionBtn: { backgroundColor: '#1DFFC2', borderRadius: 15, alignSelf: 'flex-start', paddingVertical: 9, paddingHorizontal: 18 },
  actionBtnText: { color: '#111', fontWeight: '700', fontSize: 14 },
  optimBlock: { backgroundColor: '#f8fffd', borderRadius: 16, padding: 16, marginTop: 24, marginBottom: 8, borderColor: '#1DFFC2', borderWidth: 1 },
  optimTitle: { color: '#1DFFC2', fontWeight: '700', fontSize: 15, marginBottom: 6 },
  optimDesc: { color: '#222', fontSize: 13.5, opacity: 0.78 },
  scanBtn: { backgroundColor: '#1DFFC2', borderRadius: 19, paddingVertical: 14, alignItems: 'center', marginTop: 12, marginBottom: 8 },
  scanBtnText: { color: '#111', fontWeight: 'bold', fontSize: 15 },
  offerBlock: { backgroundColor: '#E7FFF7', borderRadius: 13, padding: 13, marginBottom: 8, marginTop: 12 },
  offerTitle: { color: '#1DFFC2', fontWeight: '700', fontSize: 14, marginBottom: 5 },
  offerLine: { color: '#111', fontSize: 14, marginBottom: 7 },
  changeBtn: { backgroundColor: '#1DFFC2', borderRadius: 14, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  changeBtnText: { color: '#111', fontWeight: '700', fontSize: 14 },
});
