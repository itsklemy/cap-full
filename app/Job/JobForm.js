import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import React, { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, SafeAreaView, Linking, Dimensions, Switch, Keyboard, Platform, KeyboardAvoidingView
} from 'react-native';

const ACCENT = '#1DFFC2';
const BG = '#F5FFFC';
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function JobForm() {
  const [step, setStep] = useState(0);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [mail, setMail] = useState('');
  const [adresse, setAdresse] = useState('');
  const [ville, setVille] = useState('');
  const [tel, setTel] = useState('');
  const [poste, setPoste] = useState('');
  const [typeContrat, setTypeContrat] = useState('CDI');
  const [competences, setCompetences] = useState([]);
  const [savoirEtre, setSavoirEtre] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [importedCv, setImportedCv] = useState(null);
  const [loading, setLoading] = useState(false);
  const [offres, setOffres] = useState([]);
  const [cvGenUrl, setCvGenUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [competenceMode, setCompetenceMode] = useState(false);
  const [feedbackIA, setFeedbackIA] = useState('');
  const [propositions, setPropositions] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          const [addr] = await Location.reverseGeocodeAsync(loc.coords);
          if (addr.city) setVille(addr.city);
        }
      } catch { }
    })();
  }, []);
  useEffect(() => { Keyboard.dismiss(); }, [step]);

  // Expérience helpers
  function addExperience() {
    setExperiences([...experiences, {
      id: Date.now() + '-' + Math.floor(Math.random() * 1000),
      poste: '', entreprise: '', debut: '', fin: ''
    }]);
  }
  function updateExp(idx, changes) {
    setExperiences(exps => exps.map((exp, i) =>
      i === idx ? { ...exp, ...changes } : exp
    ));
  }
  function removeExp(idx) {
    setExperiences(exps => exps.filter((_, i) => i !== idx));
  }

  // ==================== 0. ACCUEIL ====================
  if (step === 0) return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.homeContainer}>
        <Ionicons name="rocket-outline" size={40} color={ACCENT} style={{ alignSelf: 'center', marginBottom: 10, marginTop: 10 }} />
        <Text style={styles.brandHome}>CV Intelligent</Text>
        <Text style={styles.sloganHome}>
          Un <Text style={{ color: ACCENT, fontWeight: 'bold' }}>CV parfait</Text> généré par l’IA.
          <Text style={{ color: ACCENT }}> Obtiens des offres ciblées en 3 étapes.</Text>
        </Text>
        <View style={styles.stepsContainer}>
          <View style={styles.stepDotActive}><Text style={styles.stepDotText}>1</Text></View>
          <View style={styles.stepLine} />
          <View style={styles.stepDot}><Text style={styles.stepDotText}>2</Text></View>
          <View style={styles.stepLine} />
          <View style={styles.stepDot}><Text style={styles.stepDotText}>3</Text></View>
        </View>
        <View style={styles.stepLabelsRow}>
          <Text style={styles.stepLabel}>Infos</Text>
          <Text style={styles.stepLabel}>Expériences</Text>
          <Text style={styles.stepLabel}>Compétences</Text>
        </View>
        <Text style={styles.homeDesc}>
          <Text style={{ fontWeight: '700' }}>Remplis les 3 étapes guidées</Text> pour créer un CV optimisé, personnalisé, prêt à être téléchargé. <Text style={{ color: ACCENT, fontWeight: '600' }}>Découvre en 1 clic toutes les offres qui te correspondent.</Text>
        </Text>
        <View style={{ marginTop: 34, width: '100%', alignItems: 'center' }}>
          <TouchableOpacity style={styles.bigBtn} onPress={() => setStep(1)}>
            <Ionicons name="bulb-outline" size={24} color="#111" style={{ marginRight: 8 }} />
            <Text style={styles.bigBtnText}>Commencer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bigBtnSec} onPress={() => setStep(4)}>
            <Ionicons name="cloud-upload-outline" size={24} color={ACCENT} style={{ marginRight: 8 }} />
            <Text style={styles.bigBtnTextSec}>Importer un CV</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )

  // ==================== 1. INFOS PERSONNELLES ====================
  if (step === 1) return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.centeredForm} keyboardShouldPersistTaps="handled" ref={scrollRef}>
          <View style={styles.cvCard}>
            <Text style={styles.stepTitle}>
              <Ionicons name="person-outline" size={28} color={ACCENT} />  Informations personnelles
            </Text>
            <UniformInput label="Prénom" value={prenom} onChange={setPrenom} placeholder="Clémence" icon="person-outline" />
            <UniformInput label="Nom" value={nom} onChange={setNom} placeholder="Bouchot" icon="person-outline" />
            <UniformInput label="Email" value={mail} onChange={setMail} placeholder="clemence@email.com" keyboardType="email-address" icon="mail-outline" />
            <UniformInput label="Téléphone" value={tel} onChange={setTel} placeholder="06..." keyboardType="phone-pad" icon="call-outline" />
            <UniformInput label="Ville" value={ville} onChange={setVille} placeholder="Annecy" icon="location-outline" />
            <UniformInput label="Adresse complète (optionnel)" value={adresse} onChange={setAdresse} placeholder="5 rue des fleurs, Annecy" icon="home-outline" />
          </View>
          <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(2)}>
            <Text style={styles.nextBtnText}>Suivant</Text>
            <Ionicons name="arrow-forward-outline" size={24} color="#fff" style={{ marginLeft: 5 }} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkBtn} onPress={() => setStep(0)}>
            <Text style={styles.link}>← Accueil</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // ==================== 2. EXPÉRIENCES ====================
  if (step === 2) return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.centeredForm} keyboardShouldPersistTaps="handled" ref={scrollRef}>
          <View style={styles.cvCard}>
            <Text style={styles.stepTitle}>
              <Ionicons name="briefcase-outline" size={25} color={ACCENT} />  Expériences
            </Text>
            {experiences.map((exp, idx) => (
              <View key={exp.id || idx} style={styles.expCardModern}>
                <UniformInput
                  label="Poste occupé"
                  value={exp.poste}
                  onChange={txt => updateExp(idx, { poste: txt })}
                  icon="build-outline"
                  placeholder="Poste"
                />
                <UniformInput
                  label="Entreprise"
                  value={exp.entreprise}
                  onChange={txt => updateExp(idx, { entreprise: txt })}
                  icon="business-outline"
                  placeholder="Entreprise"
                />
                <UniformInput
                  label="Début"
                  value={exp.debut}
                  onChange={txt => updateExp(idx, { debut: txt })}
                  icon="calendar-outline"
                  placeholder="06/2023"
                />
                <UniformInput
                  label="Fin"
                  value={exp.fin}
                  onChange={txt => updateExp(idx, { fin: txt })}
                  icon="calendar-outline"
                  placeholder='Fin (ou "actuel")'
                />
                <TouchableOpacity
                  onPress={() => removeExp(idx)}
                  style={styles.removeExpBtn}
                >
                  <Ionicons name="close-circle" size={22} color="#ff6464" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              onPress={addExperience}
              style={styles.addExpBtn}
            >
              <Ionicons name="add-circle-outline" size={22} color={ACCENT} />
              <Text style={styles.addText}>Ajouter une expérience</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(3)}>
            <Text style={styles.nextBtnText}>Suivant</Text>
            <Ionicons name="arrow-forward-outline" size={24} color="#fff" style={{ marginLeft: 5 }} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkBtn} onPress={() => setStep(1)}>
            <Text style={styles.link}>← Retour</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // ==================== 3. COMPÉTENCES & SOFT SKILLS ====================
  if (step === 3) return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.centeredForm} keyboardShouldPersistTaps="handled" ref={scrollRef}>
          <View style={styles.cvCard}>
            <Text style={styles.stepTitle}>
              <Ionicons name="sparkles-outline" size={24} color={ACCENT} />  Compétences & Soft Skills
            </Text>
            <ChipsModern
              label="Compétences"
              data={competences}
              setData={setCompetences}
              accent={ACCENT}
              placeholder="Compétence"
            />
            <ChipsModern
              label="Soft skills"
              data={savoirEtre}
              setData={setSavoirEtre}
              accent={ACCENT}
              placeholder="Ex: autonome, créatif…"
            />
            <View style={styles.compSwitchRow}>
              <Ionicons name="list-outline" size={20} color="#222" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 16 }}>Recherche par compétences</Text>
              <Switch value={competenceMode} onValueChange={setCompetenceMode} trackColor={{ true: ACCENT }} />
            </View>
          </View>
          <TouchableOpacity style={styles.nextBtn} onPress={() => handleFindJobs(competenceMode)} disabled={loading}>
            {loading ? <ActivityIndicator color="#111" /> : <>
              <Text style={styles.nextBtnText}>Trouver des offres IA</Text>
              <Ionicons name="search-outline" size={22} color="#fff" style={{ marginLeft: 5 }} />
            </>}
          </TouchableOpacity>
          {/* Aperçu du CV IA */}
          <TouchableOpacity
            style={[styles.nextBtn, { marginTop: 8, backgroundColor: '#fff', borderWidth: 2, borderColor: ACCENT }]}
            onPress={() => {
              if (cvGenUrl && cvGenUrl.startsWith('http')) Linking.openURL(cvGenUrl);
              else Alert.alert('CV non généré', "Clique d'abord sur 'Trouver des offres IA' pour générer ton CV.");
            }}
          >
            <Ionicons name="download-outline" size={22} color={ACCENT} style={{ marginRight: 8 }} />
            <Text style={[styles.nextBtnText, { color: ACCENT }]}>Aperçu / Générer mon CV IA</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkBtn} onPress={() => setStep(2)}>
            <Text style={styles.link}>← Retour</Text>
          </TouchableOpacity>
          {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // ==================== 4. IMPORT CV PDF ====================
  if (step === 4) return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.centeredForm} keyboardShouldPersistTaps="handled" ref={scrollRef}>
          <Text style={styles.stepTitle}><Ionicons name="document-outline" size={27} color={ACCENT} />  Importer un CV PDF</Text>
          <View style={{ width: '96%', marginBottom: 16 }}>
            <UniformInput label="Ville" value={ville} onChange={setVille} placeholder="Annecy" icon="location-outline" />
            <UniformInput label="Intitulé du poste recherché" value={poste} onChange={setPoste} placeholder="Développeur, Designer..." icon="briefcase-outline" />
            <View style={styles.contractRow}>
              {['CDI', 'CDD', 'INTERIM'].map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.contratBtn, typeContrat === c && styles.contratBtnSel]}
                  onPress={() => setTypeContrat(c)}
                  disabled={loading}
                >
                  <Text style={styles.contratText}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity style={styles.importBtn} onPress={handleImportCv} disabled={loading}>
            <Ionicons name="document-attach-outline" size={22} color={ACCENT} />
            <Text style={styles.importText}>Choisir un fichier PDF</Text>
          </TouchableOpacity>
          {importedCv && (
            <View style={styles.file}>
              <Text style={styles.fileName}>{importedCv.name}</Text>
              <TouchableOpacity onPress={() => setImportedCv(null)} disabled={loading}>
                <Ionicons name="close-outline" size={20} color="#ff6464" />
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={handleImportAndFindJobs}
            disabled={loading || !importedCv}
          >
            {loading ? <ActivityIndicator color="#111" /> : <>
              <Text style={styles.nextBtnText}>Analyser & Trouver des offres</Text>
              <Ionicons name="search-outline" size={22} color="#fff" style={{ marginLeft: 5 }} />
            </>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkBtn} onPress={() => setStep(0)}>
            <Text style={styles.link}>← Accueil</Text>
          </TouchableOpacity>
          {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // ==================== 5. RÉSULTATS & FEEDBACK ====================
  if (step === 5) return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.centeredForm}>
        <Text style={styles.sectionTitle}>✨ Offres IA pour toi</Text>
        {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
        {loading && <ActivityIndicator color={ACCENT} style={{ margin: 30 }} />}
        <View>
          {Array.isArray(offres) && offres.length > 0 ? offres.map((item, i) => (
            <View key={i} style={styles.offerCard}>
              <Text style={styles.offerTitle}>{item.title}</Text>
              <Text style={styles.offerCompany}>{item.company} — {item.location}</Text>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => {
                  if (item.applyUrl) Linking.openURL(item.applyUrl);
                  else Alert.alert('À venir', 'Candidature automatique bientôt dispo !');
                }}
              >
                <Ionicons name="send-outline" size={20} color="#111" style={{ marginRight: 5 }} />
                <Text style={styles.applyBtnText}>Postuler pour moi</Text>
              </TouchableOpacity>
            </View>
          )) : !loading ? (
            <Text style={{ color: '#555', marginTop: 16, textAlign: 'center' }}>Aucune offre trouvée ou service indisponible.</Text>
          ) : null}
        </View>
        {(feedbackIA || (propositions && propositions.length > 0)) && (
          <View style={{ backgroundColor: '#E7FFF7', borderRadius: 15, padding: 16, marginVertical: 16, width: '97%' }}>
            {feedbackIA ? (
              <Text style={{ color: '#111', fontSize: 15, fontWeight: '700', marginBottom: 6 }}>{feedbackIA}</Text>
            ) : null}
            {propositions && propositions.length > 0 && (
              <View>
                <Text style={{ color: '#287E6F', fontWeight: '600', marginBottom: 6 }}>Suggestions pour avancer :</Text>
                {propositions.map((p, idx) => (
                  <TouchableOpacity key={idx} onPress={() => Linking.openURL(p.url)} style={{ marginBottom: 6 }}>
                    <Text style={{ color: ACCENT, fontWeight: '600', fontSize: 15 }}>• {p.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, { marginTop: 18, backgroundColor: '#fff', borderColor: ACCENT, borderWidth: 2 }]}
          onPress={() => {
            if (cvGenUrl && cvGenUrl.startsWith('http')) Linking.openURL(cvGenUrl);
            else Alert.alert('CV non généré', "Reviens à l'étape 3, clique sur 'Trouver des offres IA', puis reviens ici.");
          }}
        >
          <Ionicons name="download-outline" size={22} color={ACCENT} style={{ marginRight: 8 }} />
          <Text style={[styles.nextBtnText, { color: ACCENT }]}>Aperçu / Générer mon CV IA</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ ...styles.nextBtn, marginTop: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d0ece7' }}
          onPress={() => Alert.alert(
            "Demande spéciale",
            "Pour un CV ou une lettre de motivation vraiment moderne, contacte-nous avec tes préférences (style, couleurs, métier...).\n\nOu va sur Canva pour un template instantané !"
          )}
        >
          <Ionicons name="create-outline" size={22} color="#444" style={{ marginRight: 8 }} />
          <Text style={[styles.nextBtnText, { color: '#444' }]}>Demander un CV/LM moderne</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkBtn} onPress={() => setStep(0)}>
          <Text style={styles.link}>← Recommencer</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  // ================ HANDLERS ================
  async function handleFindJobs(onlyCompetence = false) {
    Keyboard.dismiss();
    setLoading(true); setErrorMsg('');
    let backendTimedOut = false;
    const timeout = setTimeout(() => {
      backendTimedOut = true;
      setErrorMsg('Service indisponible, vérifie ta connexion.');
      setLoading(false);
    }, 12000);
    try {
      let payload = {};
      if (onlyCompetence) {
        payload = {
          competences: competences.filter(Boolean),
          ville
        };
      } else {
        payload = {
          nom, prenom, adresse, ville, mail, tel, poste, typeContrat,
          competences: competences.filter(Boolean),
          savoirEtre: savoirEtre.filter(Boolean),
          experiences,
        };
      }
      const resp = await fetch('https://cap-backend-new.onrender.com/api/smart-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      clearTimeout(timeout);
      if (!resp.ok) throw new Error(`Erreur serveur (${resp.status})`);
      const text = await resp.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('Erreur JSON backend:\n' + text); }
      if (data.error) throw new Error(data.error);
      setOffres((data.smartOffers && data.smartOffers.length > 0)
        ? data.smartOffers
        : (data.offresBrutes || data.offres || []));
      setCvGenUrl(data.cvPdfUrl || '');
      setFeedbackIA(data.feedbackIA || '');
      setPropositions(data.propositions || []);
      setStep(5);
    } catch (e) {
      clearTimeout(timeout);
      if (backendTimedOut) return;
      setErrorMsg(e.message.includes('Network request failed') || e.message.includes('502') ? "Service indisponible, vérifie ta connexion." : e.message);
      setOffres([]);
      setFeedbackIA('');
      setPropositions([
        { title: "Découvrir les métiers du numérique (roadmap.sh)", url: "https://roadmap.sh" },
        { title: "Formations à distance (OpenClassrooms)", url: "https://openclassrooms.com/fr/" },
        { title: "Bilan de compétences (CPF)", url: "https://moncompteformation.gouv.fr/" }
      ]);
      setStep(5);
    } finally { setLoading(false); }
  }

  async function handleImportCv() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (!res.canceled && res.assets?.[0]) setImportedCv(res.assets[0]);
    } catch (e) { setErrorMsg("Erreur lors de l'import du PDF."); }
  }
  async function handleImportAndFindJobs() {
    Keyboard.dismiss();
    setLoading(true); setErrorMsg('');
    let backendTimedOut = false;
    const timeout = setTimeout(() => {
      backendTimedOut = true;
      setErrorMsg('Service indisponible, vérifie ta connexion.');
      setLoading(false);
    }, 12000);

    try {
      const formData = new FormData();
      formData.append('cvFile', {
        uri: importedCv.uri,
        name: importedCv.name || 'cv.pdf',
        type: importedCv.mimeType || 'application/pdf',
      });
      if (ville) formData.append('ville', ville);
      if (poste) formData.append('poste', poste);
      if (typeContrat) formData.append('typeContrat', typeContrat);

      const resp = await fetch('https://cap-backend-new.onrender.com/api/smart-jobs', {
        method: 'POST',
        body: formData,
      });
      clearTimeout(timeout);

      if (!resp.ok) throw new Error(`Erreur serveur (${resp.status})`);
      const text = await resp.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('Erreur JSON backend:\n' + text); }
      if (data.error) throw new Error(data.error);
      setOffres((data.smartOffers && data.smartOffers.length > 0)
        ? data.smartOffers
        : (data.offresBrutes || data.offres || []));
      setCvGenUrl(data.cvPdfUrl || '');
      setFeedbackIA(data.feedbackIA || '');
      setPropositions(data.propositions || []);
      setStep(5);
    } catch (e) {
      clearTimeout(timeout);
      if (backendTimedOut) return;
      setErrorMsg(e.message.includes('Network request failed') || e.message.includes('502') ? "Service indisponible, vérifie ta connexion." : e.message);
      setOffres([]);
      setFeedbackIA('');
      setPropositions([
        { title: "Formations à distance (OpenClassrooms)", url: "https://openclassrooms.com/fr/" },
        { title: "Bilan de compétences (CPF)", url: "https://moncompteformation.gouv.fr/" }
      ]);
      setStep(5);
    } finally { setLoading(false); }
  }

  // ============ COMPONENTS UNIFORMES ============

  function UniformInput({ label, value, onChange, placeholder, keyboardType, icon }) {
    return (
      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: '#287E6F', fontWeight: '600', marginBottom: 3 }}>{label}</Text>
        <View style={{
          flexDirection: 'row', alignItems: 'center', backgroundColor: '#f7fcfa',
          borderWidth: 1, borderColor: '#b7e9d9', borderRadius: 13, paddingHorizontal: 10
        }}>
          {icon && <Ionicons name={icon} size={19} color="#A0EAD3" style={{ marginRight: 6 }} />}
          <TextInput
            style={{ flex: 1, paddingVertical: 9, fontSize: 16, color: '#222' }}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor="#b0cfc6"
            keyboardType={keyboardType || 'default'}
            returnKeyType="done"
            blurOnSubmit={false}
          />
        </View>
      </View>
    );
  }

  function ChipsModern({ label, data, setData, accent, placeholder }) {
    const [value, setValue] = useState('');
    return (
      <View style={{ marginBottom: 15 }}>
        <Text style={{ color: '#287E6F', fontWeight: '600', marginBottom: 5 }}>{label}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 7 }}>
          {data.map((item, i) => (
            <View key={i} style={{
              backgroundColor: accent + '22', borderRadius: 16, flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 13, marginRight: 7, marginBottom: 5
            }}>
              <Text style={{ color: accent, fontWeight: '600', fontSize: 14 }}>{item}</Text>
              <TouchableOpacity onPress={() => setData(data.filter((_, j) => j !== i))}>
                <Ionicons name="close" size={16} color={accent} style={{ marginLeft: 3 }} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <View style={{
          flexDirection: 'row', alignItems: 'center', backgroundColor: '#f7fcfa', borderRadius: 14,
          borderWidth: 1, borderColor: '#b7e9d9', paddingHorizontal: 10
        }}>
          <TextInput
            style={{ flex: 1, fontSize: 15, color: '#222', paddingVertical: 8 }}
            placeholder={placeholder}
            placeholderTextColor="#b0cfc6"
            value={value}
            onChangeText={setValue}
            onSubmitEditing={() => {
              if (value.trim().length > 0 && !data.includes(value.trim())) {
                setData([...data, value.trim()]);
                setValue('');
              }
            }}
            returnKeyType="done"
          />
          <TouchableOpacity onPress={() => {
            if (value.trim().length > 0 && !data.includes(value.trim())) {
              setData([...data, value.trim()]);
              setValue('');
            }
          }}>
            <Ionicons name="add" size={18} color={accent} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

// =================== STYLE ===================
const styles = StyleSheet.create({
  cvCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 22, width: SCREEN_WIDTH * 0.95,
    shadowColor: '#1DFFC2', shadowOpacity: 0.10, shadowRadius: 8, elevation: 2, marginBottom: 20
  },
  expCardModern: {
    backgroundColor: BG, borderRadius: 15, padding: 12, marginBottom: 9, borderWidth: 1, borderColor: '#b7e9d9', position: 'relative'
  },
  removeExpBtn: { position: 'absolute', right: -9, top: -9 },
  addExpBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 4 },
  addText: { color: ACCENT, fontWeight: '600', marginLeft: 5, fontSize: 16 },
  safe: { flex: 1, backgroundColor: BG },
  homeContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 22, backgroundColor: BG, paddingBottom: 12 },
  brandHome: { fontSize: 32, fontWeight: '900', color: '#111', letterSpacing: 0.5, textAlign: 'center', marginBottom: 4 },
  sloganHome: { fontSize: 16.5, color: '#287E6F', textAlign: 'center', marginBottom: 10, lineHeight: 22, marginTop: 2 },
  homeDesc: { fontSize: 15.5, color: '#222', textAlign: 'center', marginTop: 8, marginBottom: 2, lineHeight: 23, paddingHorizontal: 2 },
  stepsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18, marginBottom: 6 },
  stepDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: ACCENT, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { width: 28, height: 28, borderRadius: 14, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  stepDotText: { color: '#222', fontWeight: '800', fontSize: 15 },
  stepLine: { width: 34, height: 2, backgroundColor: ACCENT, marginHorizontal: 3 },
  stepLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', width: 200, alignSelf: 'center', marginBottom: 2, marginTop: 1 },
  stepLabel: { fontSize: 12, color: '#287E6F', width: 62, textAlign: 'center', fontWeight: '600' },
  bigBtn: { backgroundColor: ACCENT, flexDirection: 'row', alignItems: 'center', borderRadius: 32, paddingVertical: 14, paddingHorizontal: 34, marginBottom: 16, shadowColor: ACCENT, shadowOpacity: 0.10, shadowRadius: 4, elevation: 1 },
  bigBtnText: { color: '#111', fontSize: 19, fontWeight: 'bold' },
  bigBtnSec: { backgroundColor: '#fff', borderColor: ACCENT, borderWidth: 2, flexDirection: 'row', alignItems: 'center', borderRadius: 32, paddingVertical: 14, paddingHorizontal: 34, marginBottom: 2 },
  bigBtnTextSec: { color: ACCENT, fontSize: 19, fontWeight: 'bold' },

  centeredForm: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 28, paddingHorizontal: 10, width: '100%' },

  sectionTitle: { fontSize: 23, fontWeight: '800', color: '#111', marginBottom: 14, marginTop: 8, textAlign: 'center' },
  sectionSubTitle: { fontSize: 17, fontWeight: '500', color: '#1C6F57', marginBottom: 10 },
  stepTitle: { fontSize: 24, fontWeight: '900', color: '#111', marginBottom: 22, marginTop: 6, textAlign: 'center', letterSpacing: 0.1, flexDirection: 'row', alignItems: 'center', alignSelf: 'center' },

  inputGroup: { marginBottom: 14, width: SCREEN_WIDTH * 0.92 },
  label: { fontSize: 15, color: '#555', marginBottom: 3 },
  input: { backgroundColor: '#F7FCFA', borderWidth: 1, borderColor: '#b7e9d9', borderRadius: 12, padding: 13, fontSize: 16, width: '100%' },
  inputFlex: { flex: 1, backgroundColor: '#F7FCFA', borderWidth: 1, borderColor: '#b7e9d9', borderRadius: 12, padding: 13, fontSize: 16, width: '95%', alignSelf: 'center' },

  contractRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 12, marginBottom: 20 },
  contratBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: ACCENT, marginRight: 8, backgroundColor: '#fff', marginBottom: 0 },
  contratBtnSel: { backgroundColor: ACCENT, borderColor: ACCENT },
  contratText: { color: '#111', fontWeight: '700', fontSize: 16 },
  addText: { color: ACCENT, fontWeight: '600', marginVertical: 8, fontSize: 16 },

  nextBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: ACCENT, borderRadius: 24, paddingVertical: 13, paddingHorizontal: 22, alignSelf: 'center', marginTop: 16, marginBottom: 10 },
  nextBtnText: { color: '#111', fontWeight: '700', fontSize: 18 },
  linkBtn: { alignSelf: 'center', marginVertical: 8 },
  link: { color: '#36a987', fontSize: 16, fontWeight: '500' },
  error: { color: 'red', textAlign: 'center', marginBottom: 8, marginTop: 8, fontWeight: 'bold' },

  importBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e3fff1', borderRadius: 12, padding: 16, marginBottom: 16, alignSelf: 'center', marginTop: 10 },
  importText: { marginLeft: 10, color: ACCENT, fontWeight: '600', fontSize: 16 },
  file: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E7FFF7', padding: 10, borderRadius: 10, marginBottom: 14, marginTop: 4 },
  fileName: { color: '#111', fontSize: 15, marginRight: 10 },

  expCard: { backgroundColor: BG, borderRadius: 14, padding: 12, marginBottom: 8, position: 'relative', width: '100%' },
  listContainer: { width: '100%', maxHeight: 220, marginBottom: 10 },

  offerCard: { backgroundColor: '#f2fff6', padding: 18, borderRadius: 16, marginBottom: 14, shadowColor: '#1DFFC2', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 1, height: 2 }, width: SCREEN_WIDTH * 0.95, alignSelf: 'center', alignItems: 'center' },
  offerTitle: { fontWeight: 'bold', fontSize: 17, marginBottom: 4, color: '#111', textAlign: 'center' },
  offerCompany: { fontSize: 15, color: '#555', marginBottom: 8, textAlign: 'center' },
  applyBtn: { flexDirection: 'row', backgroundColor: ACCENT, paddingVertical: 12, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginTop: 6, paddingHorizontal: 24 },
  applyBtnText: { color: '#111', fontWeight: '700', fontSize: 16, marginLeft: 4 },
  compSwitchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 16, marginTop: 4 },
});
