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

const SubgroupScreen = () => {
  const [subgroups, setSubgroups] = useState([]);
  const [filteredSubgroups, setFilteredSubgroups] = useState([]);
  const [groups, setGroups] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [currentSubgroup, setCurrentSubgroup] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    groupId: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Carrega dados ao iniciar
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        await loadGroups();
        await loadSubgroups();
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Filtra subgrupos quando o texto de busca muda
  useEffect(() => {
    const filtered = searchText === '' 
      ? [...subgroups] 
      : subgroups.filter(subgroup => 
          subgroup.name.toLowerCase().includes(searchText.toLowerCase())
        );
    setFilteredSubgroups(filtered);
  }, [searchText, subgroups]);

  const loadGroups = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        const storedGroups = await AsyncStorage.getItem(`groups_${user.email}`);

        if (storedGroups) {
          let parsed = null;
          try {
            parsed = JSON.parse(storedGroups);
          } catch (e) {
            console.warn('Formato inesperado em groups, ignorando:', e);
            parsed = [];
          }

          // Aceita tanto array quanto objeto mapeado por id
          if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
            parsed = Object.keys(parsed).map(key => parsed[key]);
          }

          setGroups(parsed || []);
        } else {
          // Garante estado consistente quando não há dados salvos
          await AsyncStorage.setItem(`groups_${user.email}`, JSON.stringify([]));
          setGroups([]);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os grupos');
    }
  };

  const loadSubgroups = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        const storedSubgroups = await AsyncStorage.getItem(`subgroups_${user.email}`);
        
        if (storedSubgroups) {
          const parsedSubgroups = JSON.parse(storedSubgroups);
          setSubgroups(parsedSubgroups);
        } else {
          await AsyncStorage.setItem(`subgroups_${user.email}`, JSON.stringify([]));
          setSubgroups([]);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar subgrupos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os subgrupos');
    }
  };

  const saveSubgroups = async (updatedSubgroups) => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        await AsyncStorage.setItem(`subgroups_${user.email}`, JSON.stringify(updatedSubgroups));
        setSubgroups(updatedSubgroups);
      }
    } catch (error) {
      console.error('Erro ao salvar subgrupos:', error);
      Alert.alert('Erro', 'Não foi possível salvar os subgrupos');
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
    
    if (!formData.groupId) {
      newErrors.groupId = 'Grupo é obrigatório';
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
      groupId: ''
    });
    setCurrentSubgroup(null);
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsProcessing(true);
    
    try {
      let updatedSubgroups = [...subgroups];
      
      if (currentSubgroup) {
        const index = updatedSubgroups.findIndex(subgroup => subgroup.id === currentSubgroup.id);
        if (index !== -1) {
          updatedSubgroups[index] = {
            ...updatedSubgroups[index],
            name: formData.name.trim(),
            description: formData.description.trim(),
            groupId: formData.groupId,
            updatedAt: new Date().toISOString()
          };
        }
      } else {
        const newSubgroup = {
          id: Date.now().toString(),
          name: formData.name.trim(),
          description: formData.description.trim(),
          groupId: formData.groupId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        updatedSubgroups = [newSubgroup, ...updatedSubgroups];
      }
      
      await saveSubgroups(updatedSubgroups);
      setModalVisible(false);
      resetForm();
      
      Alert.alert(
        'Sucesso', 
        currentSubgroup ? 'Subgrupo atualizado!' : 'Subgrupo cadastrado!'
      );
    } catch (error) {
      console.error('Erro ao salvar subgrupo:', error);
      Alert.alert('Erro', 'Não foi possível salvar o subgrupo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (subgroup) => {
    setCurrentSubgroup(subgroup);
    setFormData({
      name: subgroup.name,
      description: subgroup.description,
      groupId: subgroup.groupId
    });
    setModalVisible(true);
  };

  const handleDelete = async (subgroupId) => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir este subgrupo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsProcessing(true);
              const updatedSubgroups = subgroups.filter(subgroup => subgroup.id !== subgroupId);
              await saveSubgroups(updatedSubgroups);
              Alert.alert('Sucesso', 'Subgrupo excluído!');
            } catch (error) {
              console.error('Erro ao excluir subgrupo:', error);
              Alert.alert('Erro', 'Não foi possível excluir o subgrupo');
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

  const getGroupName = (groupId) => {
    const group = groups.find(grp => grp.id === groupId);
    return group ? group.name : 'Grupo não encontrado';
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
        <Text style={styles.headerTitle}>Gerenciar Subgrupos</Text>
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
          placeholder="Pesquisar subgrupos..."
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

      {/* Lista de Subgrupos */}
      {filteredSubgroups.length > 0 ? (
        <FlatList
          data={filteredSubgroups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.subgroupCard}>
              <View style={styles.subgroupInfo}>
                <Text style={styles.subgroupName}>{item.name}</Text>
                <Text style={styles.subgroupGroup}>
                  Grupo: {getGroupName(item.groupId)}
                </Text>
                <Text style={styles.subgroupDate}>
                  Atualizado em: {formatDate(item.updatedAt)}
                </Text>
                {item.description && (
                  <Text style={styles.subgroupDetails}>{item.description}</Text>
                )}
              </View>
              <View style={styles.subgroupActions}>
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
          <Icon name="layers" size={50} color="#ddd" />
          <Text style={styles.emptyText}>
            {searchText ? 'Nenhum subgrupo encontrado' : 'Nenhum subgrupo cadastrado'}
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
                {currentSubgroup ? 'Editar Subgrupo' : 'Novo Subgrupo'}
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
                placeholder="Ex: Alimentação, Transporte..."
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
              <Text style={styles.label}>Grupo*</Text>
              <View style={[styles.pickerContainer, errors.groupId && styles.inputError]}>
                {groups.length > 0 ? (
                  <RNPickerSelect
                    onValueChange={(value) => handleInputChange('groupId', value)}
                    items={groups.map(group => ({
                      label: group.name,
                      value: group.id
                    }))}
                    value={formData.groupId}
                    placeholder={{ label: "Selecione um grupo...", value: null }}
                    style={pickerSelectStyles}
                    disabled={isProcessing}
                  />
                ) : (
                  <Text style={styles.errorText}>Nenhum grupo disponível</Text>
                )}
              </View>
              {errors.groupId && (
                <Text style={styles.errorText}>{errors.groupId}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Descrição*</Text>
              <TextInput
                style={[styles.textArea, errors.description && styles.inputError]}
                placeholder="Detalhes sobre este subgrupo..."
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
                  {currentSubgroup ? 'Atualizar Subgrupo' : 'Salvar Subgrupo'}
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
  subgroupCard: {
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
  subgroupInfo: {
    flex: 1,
  },
  subgroupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subgroupGroup: {
    fontSize: 14,
    color: '#3a7ca5',
    marginBottom: 5,
  },
  subgroupDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  subgroupDetails: {
    fontSize: 14,
    color: '#666',
  },
  subgroupActions: {
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
    paddingRight: 30,
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
    paddingRight: 30,
    backgroundColor: '#fff',
  },
  placeholder: {
    color: '#999',
  },
});

export default SubgroupScreen;