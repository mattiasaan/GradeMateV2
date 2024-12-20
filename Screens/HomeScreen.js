import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, StatusBar, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Python from 'react-native-python'; // Importa react-native-python
import { PythonBridge } from 'react-native-python';

PythonBridge.initialize({
  assetPath: 'assets/python-libs', // Percorso alla tua directory
});

const HomeScreen = ({ navigation }) => {
  const [materie, setMaterie] = useState({});
  const [loading, setLoading] = useState(false);

  // Funzione per calcolare la media di una materia
  const calcolaMediaMateria = (voti) => {
    let pesoTotale = 0;
    let sommaPesi = 0;

    voti.forEach(({ voto, tipo }) => {
      const peso = tipo === 'pratico' ? 1 / 3 : 1;
      sommaPesi += voto * peso;
      pesoTotale += peso;
    });

    return (sommaPesi / pesoTotale).toFixed(2);
  };

  // Funzione per fetchare i voti tramite ClasseViva
  const fetchVoti = async () => {
    setLoading(true);

    try {
      // Ottieni username e password da AsyncStorage
      const username = await AsyncStorage.getItem('username');
      const password = await AsyncStorage.getItem('password');

      if (!username || !password) {
        Alert.alert('Errore', 'Credenziali non trovate. Torna alla schermata di benvenuto.');
        navigation.replace('Welcome');
        return;
      }

      // Codice Python per ottenere i voti
      const pythonCode = `
import sys
import json
sys.path.append('assets/python-libs')  # Aggiungi la cartella Python al path
from classeviva import ClasseViva

# Credenziali dell'utente
username = "${username}"
password = "${password}"

# Collegati a ClasseViva
cv = ClasseViva(username, password)

# Ottieni i voti delle materie
materie_voti = cv.get_marks()

# Stampa i voti in formato JSON
print(json.dumps(materie_voti))
`;

      // Esegui il codice Python
      Python.runString(pythonCode, async (response) => {
        try {
          // Stampa la risposta Python per debug
          console.log('Risposta Python:', response);

          const voti = JSON.parse(response); // Parsing della risposta Python

          // Salva i voti in AsyncStorage
          await AsyncStorage.setItem('materie', JSON.stringify(voti));

          // Aggiorna lo stato delle materie
          setMaterie(voti);
        } catch (error) {
          Alert.alert('Errore', 'Impossibile processare i voti ricevuti da Python.');
          console.error('Errore nel parsing JSON:', error);
        }
      });
    } catch (error) {
      Alert.alert('Errore', 'Si è verificato un errore durante il fetch dei voti.');
      console.error('Errore nel fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carica i voti salvati da AsyncStorage o fetcha nuovi voti
  useEffect(() => {
    const caricaMaterie = async () => {
      try {
        const materieSalvate = await AsyncStorage.getItem('materie');
        const materieParse = materieSalvate ? JSON.parse(materieSalvate) : {};

        // Controlla se sono salvati voti validi
        const materieValide = Object.fromEntries(
          Object.entries(materieParse).map(([nome, voti]) => [
            nome,
            Array.isArray(voti) ? voti : [],
          ])
        );

        setMaterie(materieValide);
      } catch (errore) {
        console.error('Errore nel caricamento dei voti:', errore);
        setMaterie({});
      }
    };

    const listenerFocus = navigation.addListener('focus', caricaMaterie);
    fetchVoti(); // Fetcha i voti all'avvio
    return () => navigation.removeListener('focus', caricaMaterie);
  }, [navigation]);

  const renderMateria = ({ item }) => {
    const nomeMateria = item[0];
    const voti = item[1] || [];

    const ultimiVoti = voti.slice(-3);
    const media = calcolaMediaMateria(voti);

    return (
      <TouchableOpacity 
        style={stili.containerMateria} 
        onPress={() => navigation.navigate('DettagliMateria', { nomeMateria, voti })}
      >
        <View style={{ flex: 3 }}>
          <Text style={stili.nomeMateria}>{nomeMateria}</Text>
          <Text style={stili.rigaVoti}>
            {ultimiVoti.map((voto, index) => `${voto.voto} (${voto.tipo})`).join('   ')}
          </Text>
        </View>
        <Text style={stili.media}>{media}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      <SafeAreaView style={stili.container}>
        <Text style={stili.titolo}>Le tue medie</Text>
        {loading ? (
          <Text style={stili.testoNoVoti}>Caricamento voti...</Text>
        ) : Object.keys(materie).length === 0 ? (
          <Text style={stili.testoNoVoti}>Non hai ancora inserito voti</Text>
        ) : (
          <FlatList
            data={Object.entries(materie)}
            renderItem={renderMateria}
            keyExtractor={(item, index) => index.toString()}
          />
        )}
      </SafeAreaView>
    </>
  );
};

const stili = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 30,
    padding: 20,
  },
  titolo: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  containerMateria: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1F1F1F',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    borderColor: '#333',
    borderWidth: 1,
  },
  nomeMateria: {
    color: '#EAEAEA',
    fontSize: 18,
  },
  rigaVoti: {
    color: '#CCCCCC',
    fontSize: 14,
    marginTop: 5,
  },
  media: {
    color: '#76FF03',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  testoNoVoti: {
    color: '#888',
    fontSize: 18,
    textAlign: 'center',
    marginVertical: 20,
  },
});

export default HomeScreen;
