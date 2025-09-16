import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, Image, FlatList, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as SQLite from 'expo-sqlite';
import MapView, { Marker } from 'react-native-maps';

const db = SQLite.openDatabase('photos.db');

export default function App() {
  const [photos, setPhotos] = useState([]);
  const [mapRegion, setMapRegion] = useState(null);

  useEffect(() => {
    (async () => {
      // Solicitar permissão da câmera
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus.status !== 'granted') {
        Alert.alert('Permissão necessária', 'Desculpe, precisamos da permissão da câmera para fazer isso funcionar!');
      }

      // Solicitar permissão de localização
      const locationStatus = await Location.requestForegroundPermissionsAsync();
      if (locationStatus.status !== 'granted') {
        Alert.alert('Permissão necessária', 'Desculpe, precisamos da permissão de localização para fazer isso funcionar!');
      }

      // Configuração inicial do mapa para a localização atual do usuário
      let location = await Location.getCurrentPositionAsync({});
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    })();

    // Criar tabela no banco de dados se não existir
    db.transaction(tx => {
      tx.executeSql(
        'CREATE TABLE IF NOT EXISTS photos (id INTEGER PRIMARY KEY AUTOINCREMENT, uri TEXT, latitude REAL, longitude REAL);'
      );
    });

    // Carregar fotos do banco de dados
    loadPhotos();
  }, []);

  const loadPhotos = () => {
    db.transaction(tx => {
      tx.executeSql('SELECT * FROM photos', [], (_, { rows }) => {
        setPhotos(rows._array);
      });
    });
  };

  const takePicture = async () => {
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      let location = await Location.getCurrentPositionAsync({});
      const { uri } = result.assets[0];
      const { latitude, longitude } = location.coords;

      db.transaction(tx => {
        tx.executeSql('INSERT INTO photos (uri, latitude, longitude) VALUES (?, ?, ?)', [uri, latitude, longitude],
          () => loadPhotos(),
          (_, error) => console.log('Erro ao salvar no banco de dados:', error)
        );
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aplicativo de Câmera e Mapa</Text>
      <Button title="Tirar Foto" onPress={takePicture} />
      {mapRegion && (
        <MapView style={styles.map} initialRegion={mapRegion}>
          {photos.map(photo => (
            <Marker
              key={photo.id}
              coordinate={{ latitude: photo.latitude, longitude: photo.longitude }}
              title={`Foto ${photo.id}`}
            >
              <Image source={{ uri: photo.uri }} style={{ width: 40, height: 40, borderRadius: 20 }} />
            </Marker>
          ))}
        </MapView>
      )}
      <FlatList
        data={photos}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.photoContainer}>
            <Image source={{ uri: item.uri }} style={styles.photo} />
            <Text>Latitude: {item.latitude}</Text>
            <Text>Longitude: {item.longitude}</Text>
          </View>
        )}
      />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  map: {
    width: '100%',
    height: 300,
    marginTop: 20,
  },
  photoContainer: {
    margin: 10,
    alignItems: 'center',
  },
  photo: {
    width: 200,
    height: 150,
  },
});