import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EstablishmentScreen = () => {
  // Estados principais
  const [establishments, setEstablishments] = useState([]);
  const [filteredEstablishments, setFilteredEstablishments] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [currentEstablishment, setCurrentEstablishment] = useState(null);
  
  // Estado do formulário
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    category: ''
  });
  
  // Estados de carregamento
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Categorias pré-definidas
  const categories = [
    'Supermercado',
    'Restaurante',
    'Lanchonet',
    'Fast Food',
    'Farmácia',
    'Governo',
    'Tecnologias',
    'Serviços',
    'Posto de Gasolina',
    'Loja de Roupas',
    'Outros'
  ];

  // Carrega estabelecimentos ao iniciar
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        await loadEstablishments();
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Filtra estabelecimentos quando o texto de busca muda
  useEffect(() => {
    if (searchText === '') {
      setFilteredEstablishments([...establishments]);
    } else {
      setFilteredEstablishments(
        establishments.filter(est => 
          est.name.toLowerCase().includes(searchText.toLowerCase()) ||
          est.address.toLowerCase().includes(searchText.toLowerCase()) ||
          est.category.toLowerCase().includes(searchText.toLowerCase())
        )
      );
    }
  }, [searchText, establishments]);

  const loadEstablishments = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        const storedEstablishments = await AsyncStorage.getItem(`establishments_${user.email}`);
        
        if (storedEstablishments) {
          setEstablishments(JSON.parse(storedEstablishments));
        } else {
          // Inicializa com array vazio se não existir
          await AsyncStorage.setItem(`establishments_${user.email}`, JSON.stringify([]));
          setEstablishments([]);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar estabelecimentos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os estabelecimentos');
    }
  };

  const saveEstablishments = async (establishmentsList) => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        await AsyncStorage.setItem(
          `establishments_${user.email}`,
          JSON.stringify(establishmentsList)
        );
        setEstablishments(establishmentsList);
      }
    } catch (error) {
      console.error('Erro ao salvar estabelecimentos:', error);
      throw error;
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Atenção', 'O nome do estabelecimento é obrigatório');
      return false;
    }
    if (!formData.category) {
      Alert.alert('Atenção', 'A categoria do estabelecimento é obrigatória');
      return false;
    }
    return true;
  };

  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      category: ''
    });
    setCurrentEstablishment(null);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsProcessing(true);
    
    try {
      let updatedEstablishments = [...establishments];
      
      if (currentEstablishment) {
        // Edição de estabelecimento existente
        const index = updatedEstablishments.findIndex(
          est => est.id === currentEstablishment.id
        );
        if (index !== -1) {
          updatedEstablishments[index] = {
            ...updatedEstablishments[index],
            ...formData,
            updatedAt: new Date().toISOString()
          };
        }
      } else {
        // Novo estabelecimento
        const newEstablishment = {
          id: Date.now().toString(),
          ...formData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        updatedEstablishments = [newEstablishment, ...updatedEstablishments];
      }
      
      await saveEstablishments(updatedEstablishments);
      setModalVisible(false);
      resetForm();
      
      Alert.alert(
        'Sucesso', 
        currentEstablishment ? 'Estabelecimento atualizado!' : 'Estabelecimento cadastrado!'
      );
    } catch (error) {
      console.error('Erro ao salvar estabelecimento:', error);
      Alert.alert('Erro', 'Não foi possível salvar o estabelecimento');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (establishment) => {
    setCurrentEstablishment(establishment);
    setFormData({
      name: establishment.name,
      address: establishment.address,
      phone: establishment.phone,
      category: establishment.category
    });
    setModalVisible(true);
  };

  const handleDelete = async (establishmentId) => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir este estabelecimento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsProcessing(true);
              const updatedEstablishments = establishments.filter(
                est => est.id !== establishmentId
              );
              await saveEstablishments(updatedEstablishments);
              Alert.alert('Sucesso', 'Estabelecimento excluído!');
            } catch (error) {
              console.error('Erro ao excluir estabelecimento:', error);
              Alert.alert('Erro', 'Não foi possível excluir o estabelecimento');
            } finally {
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#3a7ca5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gerenciar Estabelecimentos</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
          disabled={isProcessing}
        >
          <Icon name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Barra de Pesquisa */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar estabelecimentos..."
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={setSearchText}
          editable={!isProcessing}
        />
        {searchText !== '' && (
          <TouchableOpacity 
            style={styles.clearSearchButton}
            onPress={() => setSearchText('')}
            disabled={isProcessing}
          >
            <Icon name="close" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Lista de Estabelecimentos */}
      {filteredEstablishments.length > 0 ? (
        <FlatList
          data={filteredEstablishments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.establishmentCard}>
              <View style={styles.establishmentInfo}>
                <Text style={styles.establishmentName}>{item.name}</Text>
                <Text style={styles.establishmentCategory}>{item.category}</Text>
                {item.address && (
                  <Text style={styles.establishmentDetails}>
                    <Icon name="place" size={16} color="#666" /> {item.address}
                  </Text>
                )}
                {item.phone && (
                  <Text style={styles.establishmentDetails}>
                    <Icon name="phone" size={16} color="#666" /> {item.phone}
                  </Text>
                )}
                <Text style={styles.establishmentDate}>
                  Atualizado em: {formatDate(item.updatedAt)}
                </Text>
              </View>
              <View style={styles.establishmentActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleEdit(item)}
                  disabled={isProcessing}
                >
                  <Icon name="edit" size={20} color="#3a7ca5" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleDelete(item.id)}
                  disabled={isProcessing}
                >
                  <Icon name="delete" size={20} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="store" size={50} color="#ddd" />
          <Text style={styles.emptyText}>
            {searchText ? 'Nenhum estabelecimento encontrado' : 'Nenhum estabelecimento cadastrado'}
          </Text>
        </View>
      )}

      {/* Modal do Formulário */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => {
          if (!isProcessing) {
            setModalVisible(false);
            resetForm();
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {currentEstablishment ? 'Editar Estabelecimento' : 'Novo Estabelecimento'}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  if (!isProcessing) {
                    setModalVisible(false);
                    resetForm();
                  }
                }}
                disabled={isProcessing}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
  <Text style={styles.label}>Nome*</Text>
  <TextInput
    style={styles.input}
    placeholder="Nome do estabelecimento"
    placeholderTextColor="#999"
    value={formData.name}
    onChangeText={(text) => handleInputChange('name', text)}
    maxLength={100}
    editable={!isProcessing}
  />
</View>
<View style={styles.formGroup}>
  <Text style={styles.label}>Categoria*</Text>
  <View style={styles.pickerContainer}>
    <Picker
      selectedValue={formData.category}
      onValueChange={(value) => handleInputChange('category', value)}
      style={styles.picker}
    >
      <Picker.Item label="Selecione uma categoria..." value="" />
      {categories.map((category, index) => (
        <Picker.Item key={index} label={category} value={category} />
      ))}
    </Picker>
  </View>
</View>
<View style={styles.formGroup}>
  <Text style={styles.label}>Endereço</Text>
  <TextInput
    style={styles.input}
    placeholder="Endereço completo"
    placeholderTextColor="#999"
    value={formData.address}
    onChangeText={(text) => handleInputChange('address', text)}
    maxLength={200}
    editable={!isProcessing}
  />
</View>
<View style={styles.formGroup}>
  <Text style={styles.label}>Telefone</Text>
  <TextInput
    style={styles.input}
    placeholder="(00) 00000-0000"
    placeholderTextColor="#999"
    value={formData.phone}
    onChangeText={(text) => handleInputChange('phone', text)}
    keyboardType="phone-pad"
    maxLength={15}
    editable={!isProcessing}
  />
</View>
<TouchableOpacity 
  style={[styles.saveButton, isProcessing && styles.buttonDisabled]}
  onPress={handleSubmit}
  disabled={isProcessing}
>
  {isProcessing ? (
    <ActivityIndicator color="#fff" />
  ) : (
    <Text style={styles.saveButtonText}>
      {currentEstablishment ? 'Atualizar' : 'Salvar'}
    </Text>
  )}
</TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#3a7ca5',
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#2c6693',
    borderRadius: 25,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 15,
    paddingHorizontal: 15,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    color: '#333',
  },
  clearSearchButton: {
    padding: 5,
  },
  listContent: {
    padding: 15,
    paddingBottom: 30,
  },
  establishmentCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  establishmentInfo: {
    flex: 1,
  },
  establishmentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  establishmentCategory: {
    fontSize: 14,
    color: '#3a7ca5',
    marginBottom: 8,
  },
  establishmentDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  establishmentDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  establishmentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalContent: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#555',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
    padding: 4, // Adicione um padding leve
  },
  picker: {
    height: 50,
    width: '100%',
    
  },
  saveButton: {
    backgroundColor: '#3a7ca5',
    borderRadius: 8,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 15, // Reduzido de 20 para 15
  },
  formGroup: {
    marginBottom: 15, // Reduzido de 20 para 15
  },
  saveButton: {
    backgroundColor: '#3a7ca5',
    borderRadius: 8,
    padding: 12, // Reduzido de 15 para 12
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15, // Reduzido de 20 para 15
    elevation: 3,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14, // Reduzido de 16 para 14
    fontWeight: 'bold',
  },
});

export default EstablishmentScreen;