import React, { useState } from 'react';
import { SafeAreaView, ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import CvTemplate from '../templates/CvTemplate'; // adapte le chemin selon ta structure
import { useRouter } from 'expo-router';
import { db, storage } from '../firebaseConfig';


export default function ApplyJob() {
  const router = useRouter();

  const [data, setData] = useState({
    prenom: 'Lou',
    nom: 'Huet',
    poste: 'Commercial',
    accroche: 'Dynamique et persévérant, passionné par les relations clients.',
    experiences: [
      {
        titre: 'Commercial terrain',
        date: '2019-2022',
        entreprise: 'Société ABC',
        description: 'Gestion d’un portefeuille clients et développement des ventes.'
      },
    ],
    formations: ['BTS Commerce International, Lycée XYZ'],
    langues: [{ nom: 'Français', niveau: 'Langue maternelle' }, { nom: 'Anglais', niveau: 'Intermédiaire' }],
    interets: ['Voyages', 'Football', 'Lecture'],
    contact: { tel: '06 12 34 56 78', email: 'lou.huet@example.com', adresse: '10 rue des Fleurs, Paris' },
    competences: ['Négociation', 'CRM', 'Analyse des besoins'],
    qualites: ['Persévérance', 'Empathie', 'Organisation'],
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <CvTemplate data={data} />
      <TouchableOpacity style={styles.button} onPress={() => router.push('/followup')}>
        <Text style={styles.buttonText}>Voir le suivi des candidatures</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#1DFFC2',
    borderRadius: 22,
    paddingVertical: 16,
    margin: 24,
    alignItems: 'center',
  },
  buttonText: {
    color: '#101010',
    fontWeight: '700',
    fontSize: 16,
  },
});
