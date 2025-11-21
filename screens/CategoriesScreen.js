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
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CategoriesScreen = () => {
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    info: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Carrega categorias ao iniciar
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        await loadCategories();
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

 // Filtra categorias quando o texto de busca muda
useEffect(() => {
    const filterData = () => {
      if (searchText === '') {
        setFilteredCategories([...categories]);
      } else {
        setFilteredCategories(
          categories.filter(cat => {
            return cat.description.toLowerCase().includes(searchText.toLowerCase());
          })
        );
      }
    };
    
    filterData();
  }, [searchText, categories]);

  const loadCategories = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        const storedCategories = await AsyncStorage.getItem(`categories_${user.email}`);
        
        if (storedCategories) {
          const parsedCategories = JSON.parse(storedCategories);
          setCategories(parsedCategories);
        } else {
          // Inicializa com array vazio se não existir
          await AsyncStorage.setItem(`categories_${user.email}`, JSON.stringify([]));
          setCategories([]);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      Alert.alert('Erro', 'Não foi possível carregar as categorias');
    }
  };

  const saveCategories = async (categoriesList) => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        await AsyncStorage.setItem(
          `categories_${user.email}`,
          JSON.stringify(categoriesList)
        );
        setCategories(categoriesList);
      }
    } catch (error) {
      console.error('Erro ao salvar categorias:', error);
      throw error;
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    } else if (formData.description.length < 3) {
      newErrors.description = 'Descrição muito curta (mín. 3 caracteres)';
    }
    
    if (!formData.info.trim()) {
      newErrors.info = 'Informação é obrigatória';
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
      description: '',
      info: ''
    });
    setCurrentCategory(null);
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsProcessing(true);
    
    try {
      let updatedCategories = [...categories];
      
      if (currentCategory) {
        // Edição de categoria existente
        const index = updatedCategories.findIndex(cat => cat.id === currentCategory.id);
        if (index !== -1) {
          updatedCategories[index] = {
            ...updatedCategories[index],
            description: formData.description.trim(),
            info: formData.info.trim(),
            updatedAt: new Date().toISOString()
          };
        }
      } else {
        // Nova categoria
        const newCategory = {
          id: Date.now().toString(),
          description: formData.description.trim(),
          info: formData.info.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        updatedCategories = [newCategory, ...updatedCategories];
      }
      
      await saveCategories(updatedCategories);
      setModalVisible(false);
      resetForm();
      
      Alert.alert(
        'Sucesso', 
        currentCategory ? 'Categoria atualizada!' : 'Categoria cadastrada!'
      );
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      Alert.alert('Erro', 'Não foi possível salvar a categoria');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (category) => {
    setCurrentCategory(category);
    setFormData({
      description: category.description,
      info: category.info
    });
    setModalVisible(true);
  };

  const handleDelete = async (categoryId) => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir esta categoria?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsProcessing(true);
              const updatedCategories = categories.filter(cat => cat.id !== categoryId);
              await saveCategories(updatedCategories);
              Alert.alert('Sucesso', 'Categoria excluída!');
            } catch (error) {
              console.error('Erro ao excluir categoria:', error);
              Alert.alert('Erro', 'Não foi possível excluir a categoria');
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
        <Text style={styles.headerTitle}>Gerenciar Categorias</Text>
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
          placeholder="Pesquisar categorias..."
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

      {/* Lista de Categorias */}
      {filteredCategories.length > 0 ? (
        <FlatList
          data={filteredCategories}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.categoryCard}>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryDescription}>{item.description}</Text>
                <Text style={styles.categoryDate}>
                  Atualizado em: {formatDate(item.updatedAt)}
                </Text>
                {item.info && (
                  <Text style={styles.categoryDetails}>{item.info}</Text>
                )}
              </View>
              <View style={styles.categoryActions}>
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
          <Icon name="category" size={50} color="#ddd" />
          <Text style={styles.emptyText}>
            {searchText ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria cadastrada'}
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
                {currentCategory ? 'Editar Categoria' : 'Nova Categoria'}
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
              <Text style={styles.label}>Descrição*</Text>
              <TextInput
                style={[styles.input, errors.description && styles.inputError]}
                placeholder="Ex: Alimentação, Transporte..."
                placeholderTextColor="#999"
                value={formData.description}
                onChangeText={(text) => handleInputChange('description', text)}
                maxLength={50}
                editable={!isProcessing}
              />
              {errors.description && (
                <Text style={styles.errorText}>{errors.description}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Informações*</Text>
              <TextInput
                style={[styles.textArea, errors.info && styles.inputError]}
                placeholder="Detalhes sobre esta categoria..."
                placeholderTextColor="#999"
                value={formData.info}
                onChangeText={(text) => handleInputChange('info', text)}
                multiline
                numberOfLines={4}
                maxLength={200}
                editable={!isProcessing}
              />
              {errors.info && (
                <Text style={styles.errorText}>{errors.info}</Text>
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
                  {currentCategory ? 'Atualizar Categoria' : 'Salvar Categoria'}
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
  categoryCard: {
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
  categoryInfo: {
    flex: 1,
  },
  categoryDescription: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  categoryDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  categoryDetails: {
    fontSize: 14,
    color: '#666',
  },
  categoryActions: {
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

export default CategoriesScreen;