import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as SQLite from "expo-sqlite";
import { useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";

export default function ImagePickerScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [imagesFromDb, setImagesFromDb] = useState<any[]>([]);

  // Inicializar o banco de dados
  useEffect(() => {
    async function initDatabase() {
      try {
        const database = await SQLite.openDatabaseAsync("myapp.db");
        setDb(database);

        // Criar tabelas
        await database.execAsync(`
          PRAGMA journal_mode = WAL;
          CREATE TABLE IF NOT EXISTS images (
            id INTEGER PRIMARY KEY NOT NULL, 
            uri TEXT NOT NULL, 
            latitude REAL,
            longitude REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Carregar imagens salvas
        loadImagesFromDb(database);
      } catch (error) {
        console.error("Erro ao inicializar banco:", error);
      }
    }

    initDatabase();
  }, []);

  // Pegar localização
  useEffect(() => {
    async function getCurrentLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    }

    getCurrentLocation();
  }, []);

  // Carregar imagens do banco
  const loadImagesFromDb = async (database: SQLite.SQLiteDatabase) => {
    try {
      const images = await database.getAllAsync(
        "SELECT * FROM images ORDER BY created_at DESC"
      );
      setImagesFromDb(images);
    } catch (error) {
      console.error("Erro ao carregar imagens:", error);
    }
  };

  // Selecionar e salvar imagem
  const pickAndSaveImage = async () => {
    if (!db) return;

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      setImage(imageUri);

      // Salvar no banco com localização
      await db.runAsync(
        "INSERT INTO images (uri, latitude, longitude) VALUES (?, ?, ?)",
        imageUri,
        location?.coords.latitude || null,
        location?.coords.longitude || null
      );

      // Recarregar lista de imagens
      loadImagesFromDb(db);
    }
  };

  let locationText = "Waiting for location...";
  if (errorMsg) {
    locationText = errorMsg;
  } else if (location) {
    locationText = `Lat: ${location.coords.latitude.toFixed(
      6
    )}, Long: ${location.coords.longitude.toFixed(6)}`;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.paragraph}>{locationText}</Text>

      <Button title="Pick and Save Image" onPress={pickAndSaveImage} />

      {image && <Image source={{ uri: image }} style={styles.image} />}

      <Text style={styles.subtitle}>Imagens Salvas:</Text>
      {imagesFromDb.map((img) => (
        <View key={img.id} style={styles.savedImageContainer}>
          <Image source={{ uri: img.uri }} style={styles.thumbImage} />
          <Text style={styles.smallText}>
            {img.latitude ? `Lat: ${img.latitude.toFixed(4)}` : "No location"}
          </Text>
          <Text style={styles.smallText}>
            {img.longitude ? `Long: ${img.longitude.toFixed(4)}` : ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    padding: 20,
  },
  image: {
    width: 300,
    height: 300,
    marginVertical: 20,
    borderRadius: 10,
  },
  thumbImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
  },
  paragraph: {
    fontSize: 16,
    textAlign: "center",
    marginVertical: 10,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  savedImageContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
    padding: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  smallText: {
    fontSize: 12,
    color: "#666",
  },
});
