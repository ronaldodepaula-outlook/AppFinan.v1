import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { 
  Avatar, 
  TextInput, 
  Button, 
  Text, 
  HelperText, 
  Provider as PaperProvider 
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { dataUpdateEvents } from './TransactionScreen'; // For potential future use if profile change affects other screens

const ProfileScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileImage, setProfileImage] = useState(null); // URI of the image
  const [isEditingName, setIsEditingName] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    loadUserProfile();
    requestMediaLibraryPermissions();
  }, []);

  const requestMediaLibraryPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão Necessária', 'Precisamos de permissão para acessar suas fotos para definir uma foto de perfil.');
      }
    }
  };

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      const storedProfileImage = await AsyncStorage.getItem('profileImage');

      if (storedUserData) {
        const user = JSON.parse(storedUserData);
        setUserData(user);
        setName(user.name);
        setEmail(user.email); // Email is generally not editable
      }
      if (storedProfileImage) {
        setProfileImage(storedProfileImage);
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do perfil.');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio
      quality: 0.5, // Compress image slightly
    });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      setProfileImage(imageUri);
      try {
        await AsyncStorage.setItem('profileImage', imageUri);
        Alert.alert('Sucesso', 'Foto de perfil atualizada.');
        // Potentially notify other screens if needed: dataUpdateEvents.notify();
      } catch (error) {
        console.error("Erro ao salvar foto de perfil:", error);
        Alert.alert('Erro', 'Não foi possível salvar a foto de perfil.');
      }
    }
  };

  const handleSaveName = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'O nome não pode ficar em branco.');
      return;
    }
    setLoading(true);
    try {
      const updatedUserData = { ...userData, name: name.trim() };
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
      setUserData(updatedUserData);
      setIsEditingName(false);
      Alert.alert('Sucesso', 'Nome atualizado.');
      // Notify HomeScreen to update name if displayed there
      // This depends on how HomeScreen gets the name, might need event bus or context
    } catch (error) {
      console.error("Erro ao salvar nome:", error);
      Alert.alert('Erro', 'Não foi possível salvar o nome.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Todos os campos de senha são obrigatórios.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('A nova senha e a confirmação não coincidem.');
      return;
    }
    if (newPassword.length < 6) { // Example minimum length
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (userData?.password !== currentPassword) {
      setPasswordError('Senha atual incorreta.');
      return;
    }

    setLoading(true);
    try {
      const updatedUserData = { ...userData, password: newPassword };
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
      setUserData(updatedUserData); // Update local state
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Sucesso', 'Senha alterada com sucesso.');
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      Alert.alert('Erro', 'Não foi possível alterar a senha.');
      setPasswordError('Ocorreu um erro ao tentar alterar a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PaperProvider> 
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {loading && !userData ? (
          <ActivityIndicator size="large" color="#3a7ca5" style={{ marginTop: 50 }}/>
        ) : (
          <>
            <View style={styles.avatarContainer}>
              <TouchableOpacity onPress={pickImage}>
                <Avatar.Image 
                  size={120} 
                  source={profileImage ? { uri: profileImage } : require('../assets/avatar_placeholder.png')} // Use a placeholder
                  style={styles.avatar}
                />
                <View style={styles.cameraIconContainer}>
                    <Icon name="photo-camera" size={24} color="#fff" />
                </View>
              </TouchableOpacity>
              <Text style={styles.emailText}>{email}</Text>
            </View>

            {/* Name Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nome</Text>
              {isEditingName ? (
                <View>
                  <TextInput
                    mode="outlined"
                    label="Nome Completo"
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                    disabled={loading}
                  />
                  <View style={styles.buttonRow}>
                    <Button 
                        mode="text" 
                        onPress={() => { setIsEditingName(false); setName(userData?.name || ''); }} 
                        disabled={loading}
                        compact
                        style={styles.cancelButton}
                    >
                        Cancelar
                    </Button>
                    <Button 
                        mode="contained" 
                        onPress={handleSaveName} 
                        loading={loading} 
                        disabled={loading}
                        icon="check"
                        style={styles.saveButton}
                    >
                        Salvar Nome
                    </Button>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.displayRow} onPress={() => setIsEditingName(true)}>
                  <Text style={styles.displayText}>{name}</Text>
                  <Icon name="edit" size={20} color="#3a7ca5" />
                </TouchableOpacity>
              )}
            </View>

            {/* Password Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Senha</Text>
              {isChangingPassword ? (
                <View>
                  <TextInput
                    mode="outlined"
                    label="Senha Atual"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry
                    style={styles.input}
                    disabled={loading}
                  />
                  <TextInput
                    mode="outlined"
                    label="Nova Senha"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    style={styles.input}
                    disabled={loading}
                  />
                  <TextInput
                    mode="outlined"
                    label="Confirmar Nova Senha"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    style={styles.input}
                    error={!!passwordError} // Show error state if passwordError is not empty
                    disabled={loading}
                  />
                   <HelperText type="error" visible={!!passwordError}>
                      {passwordError}
                    </HelperText>
                  <View style={styles.buttonRow}>
                    <Button 
                        mode="text" 
                        onPress={() => { 
                            setIsChangingPassword(false); 
                            setCurrentPassword(''); 
                            setNewPassword(''); 
                            setConfirmPassword('');
                            setPasswordError('');
                        }}
                        disabled={loading}
                        compact
                        style={styles.cancelButton}
                    >
                        Cancelar
                    </Button>
                    <Button 
                        mode="contained" 
                        onPress={handleChangePassword} 
                        loading={loading} 
                        disabled={loading}
                        icon="lock-reset"
                        style={styles.saveButton}
                    >
                        Alterar Senha
                    </Button>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.displayRow} onPress={() => setIsChangingPassword(true)}>
                  <Text style={styles.displayText}>••••••••</Text>
                  <Icon name="edit" size={20} color="#3a7ca5" />
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    padding: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    marginBottom: 10,
    backgroundColor: '#e0e0e0', // Placeholder background
  },
   cameraIconContainer: {
    position: 'absolute',
    bottom: 10,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    borderRadius: 20,
  },
  emailText: {
    fontSize: 16,
    color: '#555',
    marginTop: 5,
  },
  section: {
    marginBottom: 25,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  input: {
    marginBottom: 10,
    backgroundColor: '#fff', // Ensure background for outlined input
  },
  displayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  displayText: {
    fontSize: 16,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  saveButton: {
    marginLeft: 10,
  },
  cancelButton: {
    // Add specific styles if needed
  },
});

export default ProfileScreen;