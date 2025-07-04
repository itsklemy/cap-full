import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { db, storage } from '../firebaseConfig';


// Palette : tu peux étendre facilement !
const COLOR_THEMES = {
  green:   { main: '#1DFFC2', badge: '#E7FFF7', name: 'Vert menthe' },
  blue:    { main: '#007AFF', badge: '#E3F0FF', name: 'Bleu pro' },
  orange:  { main: '#FFB05E', badge: '#FFF5E7', name: 'Orange pop' },
  purple:  { main: '#A36CFF', badge: '#F3EDFF', name: 'Violet frais' },
  grey:    { main: '#222', badge: '#EEE', name: 'Gris classique' },
};

export default function CvTemplate({ data = {}, theme = 'green' }) {
  const colors = COLOR_THEMES[theme] || COLOR_THEMES.green;
  const styles = getStyles(colors);

  if (!data) return null;

  return (
    <ScrollView contentContainerStyle={styles.cvContainer}>
      {/* Header : Nom, Rôle, Accroche */}
      <View style={styles.headerRow}>
        <View style={{ flex: 2 }}>
          <Text style={styles.name}>{(data.prenom || '') + ' ' + (data.nom || '')}</Text>
          <Text style={styles.role}>{data.poste || ''}</Text>
          {!!data.accroche && <Text style={styles.catchline}>{data.accroche}</Text>}
        </View>
        <View style={styles.contactCol}>
          {data.contact?.email    && <Text style={styles.contactTxt}>{data.contact.email}</Text>}
          {data.contact?.tel      && <Text style={styles.contactTxt}>{data.contact.tel}</Text>}
          {data.contact?.adresse  && <Text style={styles.contactTxt}>{data.contact.adresse}</Text>}
        </View>
      </View>

      {/* Compétences (badges) */}
      {Array.isArray(data.competences) && data.competences.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compétences clés</Text>
          <View style={styles.badgeRow}>
            {data.competences.map((c, i) =>
              !!c && (
                <View style={styles.badge} key={i}>
                  <Text style={styles.badgeTxt}>{c}</Text>
                </View>
              )
            )}
          </View>
        </View>
      )}

      {/* Savoirs-être (chips) */}
      {Array.isArray(data.savoirEtre) && data.savoirEtre.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Savoirs-être</Text>
          <View style={styles.chipRow}>
            {data.savoirEtre.map((s, i) =>
              !!s && (
                <View style={styles.chip} key={i}>
                  <Text style={styles.chipTxt}>{s}</Text>
                </View>
              )
            )}
          </View>
        </View>
      )}

      {/* Expériences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Expériences professionnelles</Text>
        {Array.isArray(data.experiences) && data.experiences.length > 0 ? (
          data.experiences.map((exp, i) => (
            <View key={i} style={styles.expBloc}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <Text style={styles.expTitle}>{exp.titre || exp.poste || ''}</Text>
                {exp.date ? <Text style={styles.expDate}>  {exp.date}</Text> : null}
              </View>
              {exp.entreprise ? <Text style={styles.expCompany}>{exp.entreprise}</Text> : null}
              {exp.description ? <Text style={styles.expDesc}>{exp.description}</Text> : null}
            </View>
          ))
        ) : (
          <Text style={styles.none}>Aucune expérience renseignée.</Text>
        )}
      </View>
    </ScrollView>
  );
}

function getStyles({ main, badge }) {
  return StyleSheet.create({
    cvContainer: { padding: 28, backgroundColor: '#fff' },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      borderBottomColor: main,
      borderBottomWidth: 2,
      paddingBottom: 16,
      marginBottom: 18,
      gap: 18,
    },
    name:     { fontSize: 32, fontWeight: '900', color: main, marginBottom: 2, letterSpacing: 1 },
    role:     { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 4 },
    catchline:{ fontSize: 15, fontStyle: 'italic', color: '#545454', marginBottom: 8 },
    contactCol: {
      alignItems: 'flex-end', minWidth: 120, gap: 2, flex: 1.2,
    },
    contactTxt: { fontSize: 13, color: '#232323', opacity: 0.83, marginBottom: 2 },
    section: { marginBottom: 20 },
    sectionTitle: { fontWeight: '700', color: main, fontSize: 15.5, marginBottom: 9, textTransform: 'uppercase', letterSpacing: 1 },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
    badge: { backgroundColor: badge, borderColor: main, borderWidth: 1, borderRadius: 16, paddingVertical: 7, paddingHorizontal: 14, marginBottom: 5 },
    badgeTxt: { color: main, fontWeight: '700', fontSize: 14 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 5 },
    chip: { backgroundColor: '#F3F8F7', borderRadius: 9, paddingHorizontal: 11, paddingVertical: 4, marginBottom: 2 },
    chipTxt: { color: main, fontWeight: '600', fontSize: 13 },
    expBloc: { marginBottom: 15, paddingBottom: 7, borderBottomWidth: 1, borderBottomColor: '#f4f4f4' },
    expTitle: { fontWeight: '700', fontSize: 16, color: '#232323' },
    expDate:  { fontSize: 13, color: '#888', fontWeight: '400' },
    expCompany: { fontSize: 14, color: '#333', fontWeight: '600', marginBottom: 2, marginTop: 2 },
    expDesc: { color: '#222', fontSize: 14, fontStyle: 'italic', opacity: 0.8 },
    none: { color: '#aaa', fontStyle: 'italic' },
  });
}
