import React, { useState } from 'react';
import { SafeAreaView, Button, Alert } from 'react-native';
import CvTemplate from '../templates/CvTemplate';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import { db, storage } from '../firebaseConfig';


export default function CvScreen() {
  const [theme, setTheme] = useState('green');
  const data = {
    prenom: 'Lou',
    nom: 'Huet',
    poste: 'Commercial',
    accroche: 'Dynamique et persévérant, passionné par les relations clients.',
    experiences: [
      {
        titre: 'Commercial terrain',
        date: '2019-2022',
        entreprise: 'Société ABC',
        description: 'Gestion d’un portefeuille clients et développement des ventes.',
      },
    ],
    contact: {
      tel: '06 12 34 56 78',
      email: 'lou.huet@example.com',
      adresse: '10 rue des Fleurs, Paris',
    },
  };

  // Convertir JSX en HTML basique (simplifié)
  const generateHtml = () => `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #222; }
          h1 { color: ${theme === 'green' ? '#1DFFC2' : theme === 'blue' ? '#007AFF' : '#555'}; }
          h2 { color: ${theme === 'green' ? '#1DFFC2' : theme === 'blue' ? '#007AFF' : '#555'}; text-transform: uppercase; }
          p, li { font-size: 15px; }
        </style>
      </head>
      <body>
        <h1>${data.prenom} ${data.nom}</h1>
        <h2>${data.poste}</h2>
        <p><em>${data.accroche}</em></p>

        <h2>Expériences professionnelles</h2>
        ${data.experiences.map(exp => `
          <div>
            <strong>${exp.titre}</strong><br/>
            <small>${exp.date} | ${exp.entreprise}</small>
            <p>${exp.description}</p>
          </div>
        `).join('')}

        <h2>Contact</h2>
        <p>${data.contact.tel}<br/>${data.contact.email}<br/>${data.contact.adresse}</p>
      </body>
    </html>
  `;

  const exportPdf = async () => {
    const html = generateHtml();
    try {
      const options = {
        html,
        fileName: 'cv-cap',
        directory: 'Documents',
      };
      const file = await RNHTMLtoPDF.convert(options);
      Alert.alert('PDF généré', `Fichier enregistré: ${file.filePath}`);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <CvTemplate data={data} theme={theme} />
      <Button title="Exporter en PDF" onPress={exportPdf} />
      <Button title="Thème Bleu" onPress={() => setTheme('blue')} />
      <Button title="Thème Gris" onPress={() => setTheme('gray')} />
      <Button title="Thème Vert" onPress={() => setTheme('green')} />
    </SafeAreaView>
  );
}
