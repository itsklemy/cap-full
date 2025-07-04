import React from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { db, storage } from './firebaseConfig';


export default function LandingPage() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Contenu principal */}
      <View style={styles.mainContent}>
        <Text style={styles.logo}>CAP</Text>
        <Text style={styles.baseline}>
          Votre assistant quotidien, toujours là pour vous épauler dans chaque démarche réelle.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/feed')}>
          <Text style={styles.buttonText}>Commencer</Text>
        </TouchableOpacity>
      </View>

      {/* Liens bas de page */}
      <View style={styles.bottomLinks}>
        <Text
          style={styles.link}
          onPress={() => Linking.openURL('https://ton-site/cgu')}
        >
          CGU
        </Text>
        <Text style={styles.dot}>·</Text>
        <Text
          style={styles.link}
          onPress={() => Linking.openURL('https://ton-site/politique')}
        >
          Politique de confidentialité
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff', 
    justifyContent: 'space-between',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 32,
    paddingTop: 64,
  },
  logo: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#111',
    textAlign: 'left',
    letterSpacing: 2,
    marginBottom: 16,
  },
  baseline: {
    fontSize: 18,
    color: '#444',
    marginBottom: 48,
    textAlign: 'left',
    fontWeight: '400',
    maxWidth: 360,
  },
  button: {
    backgroundColor: '#1DFFC2',
    paddingVertical: 16,
    paddingHorizontal: 44,
    borderRadius: 32,
    alignSelf: 'flex-start',
    shadowColor: '#222',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  buttonText: {
    color: '#111',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  bottomLinks: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginBottom: 36,
    gap: 12,
  },
  link: {
    fontSize: 13,
    color: '#111',
    textDecorationLine: 'underline',
    opacity: 0.7,
  },
  dot: {
    color: '#bbb',
    fontSize: 14,
    marginHorizontal: 5,
    marginTop: 1,
  }
});
