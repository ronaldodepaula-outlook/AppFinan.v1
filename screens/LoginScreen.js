import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Text as PaperText } from 'react-native-paper';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation();

  const handleLogin = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        if (user.email === email && user.password === password) {
          await AsyncStorage.setItem('sessionActive', 'true');
          navigation.replace('Main');
        } else {
          Alert.alert('Erro', 'Email ou senha incorretos');
        }
      } else {
        Alert.alert('Erro', 'Nenhum usuário cadastrado');
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao fazer login');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <MaterialCommunityIcons 
          name="finance" 
          size={60} 
          color="#3a7ca5" 
          style={styles.logoIcon}
        />
        <PaperText style={styles.title}>Controle Financeiro</PaperText>
        <PaperText style={styles.subtitle}>Gestão de Despesas Pessoais</PaperText>
      </View>
      
      <View style={styles.inputContainer}>
        <MaterialIcons name="email" size={24} color="#3a7ca5" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <MaterialIcons name="lock" size={24} color="#3a7ca5" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity 
          onPress={() => setShowPassword(!showPassword)}
          style={styles.passwordToggle}
        >
          <MaterialIcons 
            name={showPassword ? "visibility" : "visibility-off"} 
            size={24} 
            color="#3a7ca5" 
          />
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <PaperText style={styles.buttonText}>Entrar</PaperText>
        <MaterialIcons name="login" size={24} color="#fff" />
      </TouchableOpacity>
      
      <View style={styles.registerContainer}>
        <PaperText style={styles.registerText}>Ainda não tem conta?</PaperText>
        <TouchableOpacity 
          style={styles.registerButton}
          onPress={() => navigation.navigate('Register')}
        >
          <PaperText style={styles.registerButtonText}>Cadastre-se</PaperText>
          <MaterialIcons name="person-add" size={20} color="#3a7ca5" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 25,
    backgroundColor: '#f8f9fa',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoIcon: {
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3a7ca5',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#333',
  },
  passwordToggle: {
    padding: 5,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: 50,
    backgroundColor: '#3a7ca5',
    borderRadius: 8,
    marginTop: 10,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  registerText: {
    color: '#666',
    marginRight: 5,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#3a7ca5',
    fontWeight: 'bold',
    marginRight: 5,
  },
});

export default LoginScreen;