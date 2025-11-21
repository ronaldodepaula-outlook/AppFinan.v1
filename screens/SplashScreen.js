import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';

const SplashScreen = () => {
  const navigation = useNavigation();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const sessionActive = await AsyncStorage.getItem('sessionActive');
        if (sessionActive === 'true') {
          navigation.replace('Main'); 
        } else {
          navigation.replace('Login');
        }
      } catch (error) {
        console.error("Failed to check session state", error);
        navigation.replace('Login'); 
      }
    };

    const timer = setTimeout(checkSession, 1500); // Aumentei para 1.5s para melhor visualização

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" />
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons 
          name="finance" 
          size={80} 
          color="#fff" 
          style={styles.icon}
        />
        <Text style={styles.appName}>Finanças Pessoais</Text>
        <Text style={styles.slogan}>Controle suas despesas</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3a7ca5', // Mantive sua cor azul original
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  icon: {
    marginBottom: 20,
  },
  appName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  slogan: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
  },
});

export default SplashScreen;