import React from 'react';
import { SafeAreaView, View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { db, storage } from '../firebaseConfig';


const DOC_CATEGORIES = ['Impôts', 'CAF', 'Factures', 'Santé', 'Autres'];

// Pour le test, tu peux remplacer par des vrais docs via props ou context
const MOCK_DOCS = [
  { name: "Avis d'imposition 2023.pdf", category: "Impôts" },
  { name: "Attestation CAF.pdf", category: "CAF" },
  { name: "Facture EDF mars.pdf", category: "Factures" },
  { name: "Attestation carte vitale.jpg", category: "Santé" },
  { name: "Photo ticket métro.jpg", category: "Autres" },
];

export default function Library() {
  const router = useRouter();
  const docs = MOCK_DOCS; // À remplacer plus tard par ton vrai state ou un context/global store

  const docsByCategory = DOC_CATEGORIES.map(cat => ({
    category: cat,
    items: docs.filter(d => d.category === cat)
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Ma bibliothèque CAP</Text>
      </View>
      <ScrollView>
        {docsByCategory.map(({ category, items }) => (
          <View key={category} style={styles.catBlock}>
            <Text style={styles.catTitle}>{category}</Text>
            {items.length === 0 ? (
              <Text style={styles.empty}>Aucun document</Text>
            ) : (
              items.map((doc, i) => (
                <View key={i} style={styles.docItem}>
                  <Text style={styles.docName}>{doc.name}</Text>
                  {/* Tu ajoutes ici les boutons (supprimer, renommer, télécharger...) */}
                </View>
              ))
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 28, marginBottom: 4, marginHorizontal: 12 },
  backBtn: { marginRight: 6, padding: 6, borderRadius: 10, backgroundColor: '#E7FFF7' },
  backBtnText: { color: '#1DFFC2', fontWeight: '700', fontSize: 16 },
  title: { fontSize: 21, fontWeight: 'bold', color: '#1DFFC2', marginLeft: 10 },
  catBlock: { marginBottom: 24, paddingHorizontal: 18 },
  catTitle: { color: '#1DFFC2', fontSize: 17, fontWeight: '600', marginBottom: 8 },
  empty: { color: '#888', marginLeft: 10, fontStyle: 'italic' },
  docItem: { backgroundColor: '#E7FFF7', borderRadius: 8, padding: 10, marginBottom: 6 },
  docName: { color: '#222', fontWeight: '500', fontSize: 15 },
});
