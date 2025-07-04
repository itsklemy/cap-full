import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert,
  FlatList,
  KeyboardAvoidingView, Platform,
  ScrollView,
  StyleSheet,
  Text, TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// INPUT RÉUTILISABLE
function Input({ label, value, onChange, placeholder='', keyboardType='default' }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        keyboardType={keyboardType}
        placeholderTextColor="#999"
      />
    </View>
  );
}

const ACCENT = '#1DFFC2';

export default function JobForm() {
  const [screen, setScreen] = useState('home');

  // Infos du formulaire
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [adresse, setAdresse] = useState('');
  const [mail, setMail] = useState('');
  const [tel, setTel] = useState('');
  const [poste, setPoste] = useState('');
  const [domaine, setDomaine] = useState('');
  const [typeContrat, setTypeContrat] = useState(null);

  const [competences, setCompetences] = useState([]);
  const [savoirEtre, setSavoirEtre] = useState([]);

  // CV/lettre en import
  const [importedCv, setImportedCv] = useState(null);
  const [importedLetter, setImportedLetter] = useState(null);

  // Localisation
  const [fallbackCity, setFallbackCity] = useState('');

  // Résultats/offres
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Permissions geo à l'ouverture
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          const [addr] = await Location.reverseGeocodeAsync(loc.coords);
          if (addr.city) setFallbackCity(addr.city);
        }
      } catch (err) {
        console.warn('Erreur géoloc:', err);
      }
    })();
  }, []);

  // Gérer l'import de CV/lettre
  const handleImportCv = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!res.canceled && res.assets?.[0]) setImportedCv(res.assets[0]);
  };
  const handleImportLetter = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!res.canceled && res.assets?.[0]) setImportedLetter(res.assets[0]);
  };

  // Helpers compétences/savoirs-être
  const addCompetence = () => setCompetences([...competences, '']);
  const updateCompetence = (i, text) => {
    const list = [...competences]; list[i] = text; setCompetences(list);
  };
  const removeCompetence = i => setCompetences(competences.filter((_, idx) => idx !== i));
  const addSavoirEtre = () => setSavoirEtre([...savoirEtre, '']);
  const updateSavoirEtre = (i, text) => {
    const list = [...savoirEtre]; list[i] = text; setSavoirEtre(list);
  };
  const removeSavoirEtre = i => setSavoirEtre(savoirEtre.filter((_, idx) => idx !== i));

  // Fonction de recherche d'offres
  const handleFindJobs = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // Compose mot-clé complet avec poste, domaine, compétences
      const motCle = [poste, domaine, ...competences].filter(Boolean).join(' ');
      const villeRecherche = fallbackCity || 'Paris';

      // PAYLOAD GÉNÉRAL (toujours utilisé)
      const payload = {
        nom, prenom, adresse, mail, tel, poste, domaine, typeContrat,
        competences, savoirEtre,
        ville: villeRecherche,
        // On ne met pas cvFile ni lettreFile ici, car ça dépend du format !
      };

      // ===== NOUVELLE LOGIQUE : envoie FormData S'IL Y A UN FICHIER =====
      let resp;
      if (importedCv || importedLetter) {
        // --- Cas FormData avec fichiers PDF ---
        const formData = new FormData();
        // Ajout des champs classiques (en string !)
        Object.entries(payload).forEach(([k, v]) => {
          // Stringify arrays/objets pour backend Node/multer
          if (Array.isArray(v) || typeof v === 'object') {
            formData.append(k, JSON.stringify(v));
          } else if (v !== undefined && v !== null) {
            formData.append(k, v);
          }
        });
        // Ajout fichiers
        if (importedCv) {
          formData.append('cvFile', {
            uri: importedCv.uri,
            name: importedCv.name || 'cv.pdf',
            type: 'application/pdf',
          });
        }
        if (importedLetter) {
          formData.append('lettreFile', {
            uri: importedLetter.uri,
            name: importedLetter.name || 'lettre.pdf',
            type: 'application/pdf',
          });
        }
        resp = await fetch('https://test-backend-push.onrender.com/api/smart-jobs', {
          method: 'POST',
          headers: {
            // Ne pas définir 'Content-Type' pour FormData
          },
          body: formData,
        });
      } else {
        // --- Cas JSON classique ---
        resp = await fetch('https://test-backend-push.onrender.com/api/smart-jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      // Pour debug, affiche la réponse brute
      const text = await resp.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error('Erreur JSON (Backend):\n' + text);
      }

      if (data.error) throw new Error(data.error);
      const list = (data.smartOffers && data.smartOffers.length > 0)
        ? data.smartOffers
        : (data.offresBrutes || data.offres || []);
      if (!Array.isArray(list) || list.length === 0) throw new Error("Aucune offre trouvée. Essaie d'élargir tes critères.");
      setOffres(list);
      setScreen('offers');
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  // === Écrans ===

  // Écran d'accueil
  if (screen === 'home') return (
    <View style={styles.container}>
      <View style={styles.mainContent}>
        <Text style={styles.logo}>Trouve ton Job en 1 min !</Text>
        <TouchableOpacity style={styles.button} onPress={() => setScreen('form')}>
          <Text style={styles.buttonText}>Créer un CV intelligent</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => setScreen('library')}>
          <Text style={styles.buttonText}>Importer mon CV</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // FORMULAIRE "CV intelligent"
  if (screen === 'form') return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS==='ios'?'padding':undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Remplis ton CV intelligent</Text>
        {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

        <Input label="Nom" value={nom} onChange={setNom} />
        <Input label="Prénom" value={prenom} onChange={setPrenom} />
        <Input label="Adresse" value={adresse} onChange={setAdresse} placeholder="Rue, ville" />
        <Input label="Email" value={mail} onChange={setMail} keyboardType="email-address" />
        <Input label="Téléphone" value={tel} onChange={setTel} keyboardType="phone-pad" />
        <Input label="Poste visé" value={poste} onChange={setPoste} />
        <Input label="Domaine" value={domaine} onChange={setDomaine} />

        <View style={styles.row}>
          <Text style={styles.label}>Contrat :</Text>
          {['CDI','CDD'].map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.contratBtn, typeContrat===c && styles.contratBtnSel]}
              onPress={()=>setTypeContrat(c)}
            >
              <Text style={styles.contratText}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionSubTitle}>Compétences</Text>
        {competences.map((c, i) => (
          <View key={i} style={styles.inputRow}>
            <TextInput
              style={styles.inputFlex}
              value={c}
              onChangeText={t => updateCompetence(i, t)}
              placeholder="Compétence"
            />
            <TouchableOpacity onPress={() => removeCompetence(i)}>
              <Ionicons name="close-circle" size={24} color="#f00" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity onPress={addCompetence}>
          <Text style={styles.addText}>+ Ajouter compétence</Text>
        </TouchableOpacity>

        <Text style={styles.sectionSubTitle}>Savoirs-être</Text>
        {savoirEtre.map((s, i) => (
          <View key={i} style={styles.inputRow}>
            <TextInput
              style={styles.inputFlex}
              value={s}
              onChangeText={t => updateSavoirEtre(i, t)}
              placeholder="Savoir-être"
            />
            <TouchableOpacity onPress={() => removeSavoirEtre(i)}>
              <Ionicons name="close-circle" size={24} color="#f00" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity onPress={addSavoirEtre}>
          <Text style={styles.addText}>+ Ajouter savoir-être</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleFindJobs} disabled={loading}>
          {loading ? <ActivityIndicator color="#111" /> : <Text style={styles.buttonText}>Voir mes offres</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkBtn} onPress={() => setScreen('home')}>
          <Text style={styles.link}>← Retour</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // IMPORT DE CV ("bibliothèque")
  if (screen === 'library') return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Ma bibliothèque de documents</Text>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.importBtn} onPress={handleImportCv}>
          <Ionicons name="document-attach" size={20} color={ACCENT} />
          <Text style={styles.importText}>Importer un CV</Text>
        </TouchableOpacity>
        {importedCv && (
          <View style={styles.file}>
            <Text style={styles.fileName}>{importedCv.name}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.importBtn} onPress={handleImportLetter}>
          <Ionicons name="mail" size={20} color={ACCENT} />
          <Text style={styles.importText}>Importer une lettre</Text>
        </TouchableOpacity>
        {importedLetter && (
          <View style={styles.file}>
            <Text style={styles.fileName}>{importedLetter.name}</Text>
          </View>
        )}
        <Input label="Domaine" value={domaine} onChange={setDomaine} />
        <View style={styles.row}>
          <Text style={styles.label}>Contrat :</Text>
          {['CDI','CDD'].map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.contratBtn, typeContrat===c && styles.contratBtnSel]}
              onPress={()=>setTypeContrat(c)}
            >
              <Text style={styles.contratText}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Input label="Poste recherché" value={poste} onChange={setPoste} />
        <TouchableOpacity style={styles.button} onPress={handleFindJobs} disabled={loading}>
          {loading ? <ActivityIndicator color="#111" /> : <Text style={styles.buttonText}>Voir mes offres</Text>}
        </TouchableOpacity>
      </ScrollView>
      <TouchableOpacity style={styles.linkBtn} onPress={() => setScreen('home')}>
        <Text style={styles.link}>← Retour</Text>
      </TouchableOpacity>
    </View>
  );

  // AFFICHAGE OFFRES
  if (screen === 'offers') return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Offres pour toi</Text>
      {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
      <FlatList
        data={offres}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => (
          <View style={styles.offerCard}>
            <Text style={styles.offerTitle}>{item.title}</Text>
            <Text style={styles.offerCompany}>{item.company} — {item.location}</Text>
            <TouchableOpacity style={styles.applyBtn} onPress={() => Alert.alert('À venir', 'Candidature automatique bientôt dispo !')}>
              <Text style={styles.applyBtnText}>Postuler pour moi</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.content}
      />
      <TouchableOpacity style={styles.linkBtn} onPress={() => setScreen('home')}>
        <Text style={styles.link}>← Nouvel écran d’accueil</Text>
      </TouchableOpacity>
    </View>
  );

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'ios' ? 50 : 20 },
  content: { padding: 20 },
  mainContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logo: { fontSize: 36, fontWeight: 'bold', marginBottom: 32, color: '#111', letterSpacing: 2 },
  button: { backgroundColor: ACCENT, paddingVertical: 16, paddingHorizontal: 44, borderRadius: 32, marginBottom: 12 },
  buttonText: { color: '#111', fontSize: 18, fontWeight: 'bold' },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#111', marginBottom: 12 },
  sectionSubTitle: { fontSize: 16, fontWeight: '500', color: '#111', marginTop: 16, marginBottom: 8 },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 14, color: '#555', marginBottom: 4 },
  input: { backgroundColor: '#F7FCFA', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10 },
  inputFlex: { flex: 1, backgroundColor: '#F7FCFA', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginRight: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  contratBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: ACCENT, marginRight: 8 },
  contratBtnSel: { backgroundColor: ACCENT },
  contratText: { color: '#111', fontWeight: '600' },
  addText: { color: ACCENT, fontWeight: '600', marginVertical: 8 },
  error: { color: 'red', textAlign: 'center', marginBottom: 8 },
  importBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FCFA', borderRadius: 8, padding: 12, marginBottom: 12 },
  importText: { marginLeft: 8, color: ACCENT, fontWeight: '600' },
  file: { backgroundColor: '#E7FFF7', padding: 10, borderRadius: 6, marginBottom: 12 },
  fileName: { color: '#111' },
  linkBtn: { alignSelf: 'center', marginVertical: 12 },
  offerCard: { backgroundColor: '#e7fff9', padding: 16, borderRadius: 12, marginBottom: 12 },
  offerTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 4, color: '#111' },
  offerCompany: { fontSize: 14, color: '#555', marginBottom: 8 },
  applyBtn: { backgroundColor: ACCENT, paddingVertical: 12, borderRadius: 24, alignItems: 'center' },
  applyBtnText: { color: '#111', fontWeight: '600' },
});
