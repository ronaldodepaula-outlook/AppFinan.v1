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

import RNPickerSelect from 'react-native-picker-select';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GroupScreen = () => {
  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Carrega dados ao iniciar
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        await loadCategories();
        await loadGroups();
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Filtra grupos quando o texto de busca muda - CORREÇÃO APLICADA AQUI
  useEffect(() => {
    const filterData = () => {
      if (searchText === '') {
        setFilteredGroups([...groups]);
      } else {
        setFilteredGroups(
          groups.filter(group => 
            group.name.toLowerCase().includes(searchText.toLowerCase())
          )
        );
      }
    };
    filterData();
  }, [searchText, groups]);

  const loadCategories = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        const storedCategories = await AsyncStorage.getItem(`categories_${user.email}`);
        
        if (storedCategories) {
          const parsedCategories = JSON.parse(storedCategories);
          setCategories(parsedCategories);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      Alert.alert('Erro', 'Não foi possível carregar as categorias');
    }
  };

  const loadGroups = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        const storedGroups = await AsyncStorage.getItem(`groups_${user.email}`);
        
        if (storedGroups) {
          const parsedGroups = JSON.parse(storedGroups);
          setGroups(parsedGroups);
        } else {
          await AsyncStorage.setItem(`groups_${user.email}`, JSON.stringify([]));
          setGroups([]);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os grupos');
    }
  };

  const saveGroups = async (updatedGroups) => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        await AsyncStorage.setItem(`groups_${user.email}`, JSON.stringify(updatedGroups));
        setGroups(updatedGroups); // Atualiza o estado com os novos grupos
      }
    } catch (error) {
      console.error('Erro ao salvar grupos:', error);
      Alert.alert('Erro', 'Não foi possível salvar os grupos');
    }
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsProcessing(true);
    try {
      let updatedGroups = [...groups];
      if (currentGroup) {
        const index = updatedGroups.findIndex(group => group.id === currentGroup.id);
        if (index !== -1) {
          updatedGroups[index] = {
            ...updatedGroups[index],
            name: formData.name.trim(),
            description: formData.description.trim(),
            categoryId: formData.categoryId,
            updatedAt: new Date().toISOString()
          };
        }
      } else {
        const newGroup = {
          id: Date.now().toString(),
          name: formData.name.trim(),
          description: formData.description.trim(),
          categoryId: formData.categoryId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        updatedGroups = [newGroup, ...updatedGroups];
      }
      await saveGroups(updatedGroups); // Salva os grupos atualizados
      setModalVisible(false);
      resetForm();
      Alert.alert(
        'Sucesso', 
        currentGroup ? 'Grupo atualizado!' : 'Grupo cadastrado!'
      );
    } catch (error) {
      console.error('Erro ao salvar grupo:', error);
      Alert.alert('Erro', 'Não foi possível salvar o grupo');
    } finally {
      setIsProcessing(false);
    }
  };
  
  

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Nome muito curto (mín. 3 caracteres)';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }
    
    if (!formData.categoryId) {
      newErrors.categoryId = 'Categoria é obrigatória';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      categoryId: ''
    });
    setCurrentGroup(null);
    setErrors({});
  };

 
  const handleEdit = (group) => {
    setCurrentGroup(group);
    setFormData({
      name: group.name,
      description: group.description,
      categoryId: group.categoryId
    });
    setModalVisible(true);
  };

  const handleDelete = async (groupId) => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir este grupo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsProcessing(true);
              const updatedGroups = groups.filter(group => group.id !== groupId);
              await saveGroups(updatedGroups);
              Alert.alert('Sucesso', 'Grupo excluído!');
            } catch (error) {
              console.error('Erro ao excluir grupo:', error);
              Alert.alert('Erro', 'Não foi possível excluir o grupo');
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
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.description : 'Categoria não encontrada';
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
        <Text style={styles.headerTitle}>Gerenciar Grupos</Text>
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

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar grupos..."
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

      {/* Lista de Grupos */}
      {filteredGroups.length > 0 ? (
        <FlatList
          data={filteredGroups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.groupCard}>
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{item.name}</Text>
                <Text style={styles.groupCategory}>
                  Categoria: {getCategoryName(item.categoryId)}
                </Text>
                <Text style={styles.groupDate}>
                  Atualizado em: {formatDate(item.updatedAt)}
                </Text>
                {item.description && (
                  <Text style={styles.groupDetails}>{item.description}</Text>
                )}
              </View>
              <View style={styles.groupActions}>
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
          <Icon name="group" size={50} color="#ddd" />
          <Text style={styles.emptyText}>
            {searchText ? 'Nenhum grupo encontrado' : 'Nenhum grupo cadastrado'}
          </Text>
        </View>
      )}

      {/* Modal de Formulário */}
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
                {currentGroup ? 'Editar Grupo' : 'Novo Grupo'}
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
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Ex: Grupo Familiar, Grupo de Trabalho..."
                placeholderTextColor="#999"
                value={formData.name}
                onChangeText={(text) => handleInputChange('name', text)}
                maxLength={50}
                editable={!isProcessing}
              />
              {errors.name && (
                <Text style={styles.errorText}>{errors.name}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
  <Text style={styles.label}>Categoria*</Text>
  <View style={[styles.pickerContainer, errors.categoryId && styles.inputError]}>
    {categories.length > 0 ? (
      <RNPickerSelect
        onValueChange={(value) => handleInputChange('categoryId', value)}
        items={categories.map(category => ({
          label: category.description,
          value: category.id
        }))}
        value={formData.categoryId}
        placeholder={{ label: "Selecione uma categoria...", value: null }}
        style={pickerSelectStyles}
        disabled={isProcessing}
      />
    ) : (
      <Text style={styles.errorText}>Nenhuma categoria disponível</Text>
    )}
  </View>
  {errors.categoryId && (
    <Text style={styles.errorText}>{errors.categoryId}</Text>
  )}
</View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Descrição*</Text>
              <TextInput
                style={[styles.textArea, errors.description && styles.inputError]}
                placeholder="Detalhes sobre este grupo..."
                placeholderTextColor="#999"
                value={formData.description}
                onChangeText={(text) => handleInputChange('description', text)}
                multiline
                numberOfLines={4}
                maxLength={200}
                editable={!isProcessing}
              />
              {errors.description && (
                <Text style={styles.errorText}>{errors.description}</Text>
              )}
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
                  {currentGroup ? 'Atualizar Grupo' : 'Salvar Grupo'}
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
  groupCard: {
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
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  groupCategory: {
    fontSize: 14,
    color: '#3a7ca5',
    marginBottom: 5,
  },
  groupDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  groupDetails: {
    fontSize: 14,
    color: '#666',
  },
  groupActions: {
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
  },
  picker: {
    height: 50,
    width: '100%',
  },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    height: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginTop: 5,
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
  });

  const pickerSelectStyles = StyleSheet.create({
    inputIOS: {
      fontSize: 16,
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 8,
      color: '#333',
      paddingRight: 30, // Para garantir que o texto não fique sob o ícone
      backgroundColor: '#fff',
    },
    inputAndroid: {
      fontSize: 16,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 8,
      color: '#333',
      paddingRight: 30, // Para garantir que o texto não fique sob o ícone
      backgroundColor: '#fff',
    },
    placeholder: {
      color: '#999',
    },
  });

export default GroupScreen;