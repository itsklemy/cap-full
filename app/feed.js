import React from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { db, storage } from './firebaseConfig';

const categories = [
  {
    key: 'job',
    title: 'Trouver ou changer de job',
    tagline: 'CAP envoie, relance et gère pour toi toutes les démarches emploi.',
    route: '/Job/JobForm', // Respecte la casse du dossier et du fichier
  },
  {
    key: 'project',
    title: 'Lancer mon projet',
    tagline: 'Business plan, contacts, publication : CAP passe à l’action pour toi.',
    route: '/Admin/Apply',
  },
  {
    key: 'admin',
    title: 'Régler mes démarches',
    tagline: 'Dossiers administratifs, inscriptions, suivis : CAP fait pour toi.',
    route: '/Admin/Apply',
  },
  {
    key: 'care',
    title: 'Prendre soin de moi',
    tagline: 'CAP réserve tes RDV santé, ateliers, bilans – sans paperasse.',
    route: '/Care/Apply',
  },
  {
    key: 'money',
    title: 'Gérer mes finances',
    tagline: 'CAP gère prises de RDV, démarches, et centralise les réponses.',
    route: '/Money/Apply',
  },
  {
    key: 'followup',
    title: 'Suivre mes actions',
    tagline: 'Tableau de bord, relances, preuves : tout est centralisé.',
    route: '/FollowUp',
  },
];

export default function FeedScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Que veux-tu déléguer aujourd’hui ?</Text>
      <ScrollView contentContainerStyle={styles.cardsContainer} showsVerticalScrollIndicator={false}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.key}
            style={styles.card}
            onPress={() => router.push(cat.route)}
            activeOpacity={0.85}
          >
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{cat.title}</Text>
              <Text style={styles.cardTagline}>{cat.tagline}</Text>
            </View>
            <View style={styles.chevron}>
              <Text style={{ fontSize: 20, color: '#B2B2B2' }}>{'›'}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Text style={styles.note}>
        CAP, opérateur de changement réel. On agit pour toi. Tu valides, c’est réglé.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff',
    paddingTop: 36,
    paddingHorizontal: 0,
    justifyContent: 'flex-start',
  },
  header: {
    fontSize: 23,
    fontWeight: '600',
    color: '#101010',
    marginLeft: 32,
    marginBottom: 18,
    marginTop: 10,
    letterSpacing: -0.2,
  },
  cardsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#1DFFC2',
    backgroundColor: '#fff',
    paddingVertical: 26,
    paddingHorizontal: 24,
    marginBottom: 0,
    marginTop: 0,
    minHeight: 78,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'column',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  cardTagline: {
    fontSize: 14,
    color: '#343434',
    fontWeight: '400',
    opacity: 0.74,
    letterSpacing: 0.1,
  },
  chevron: {
    marginLeft: 18,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  note: {
    fontSize: 12.5,
    color: '#1DFFC2',
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 18,
    marginBottom: 12,
    paddingHorizontal: 36,
    fontWeight: '500',
    letterSpacing: 0.05,
  },
});
