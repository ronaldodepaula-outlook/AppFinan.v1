import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import RadioForm from 'react-native-simple-radio-button';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TransactionScreen = () => {
  // Estados principais
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState(null);
  
  // Estados do formulário
  const [form, setForm] = useState({
    type: 'income',
    frequency: 'variable',
    categoryId: '',
    groupId: '',
    subgroupId: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  // Estados para dados auxiliares
  const [categories, setCategories] = useState([]);
  const [groups, setGroups] = useState([]);
  const [subgroups, setSubgroups] = useState([]);
  
  // Estados de carregamento
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Opções para os radio buttons
  const typeOptions = [
    { label: 'Receita', value: 'income' },
    { label: 'Despesa', value: 'expense' }
  ];

  const frequencyOptions = [
    { label: 'Fixa', value: 'fixed' },
    { label: 'Variável', value: 'variable' }
  ];

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const user = JSON.parse(userData);
          const [txs, cats, grps, subgrps] = await Promise.all([
            AsyncStorage.getItem(`transactions_${user.email}`),
            AsyncStorage.getItem(`categories_${user.email}`),
            AsyncStorage.getItem(`groups_${user.email}`),
            AsyncStorage.getItem(`subgroups_${user.email}`)
          ]);
          
          setTransactions(txs ? JSON.parse(txs) : []);
          setCategories(cats ? JSON.parse(cats) : []);
          setGroups(grps ? JSON.parse(grps) : []);
          setSubgroups(subgrps ? JSON.parse(subgrps) : []);
        }
      } catch (error) {
        Alert.alert('Erro', 'Falha ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Filtrar transações quando o texto de busca muda
  useEffect(() => {
    if (searchText === '') {
      setFilteredTransactions(transactions);
    } else {
      setFilteredTransactions(
        transactions.filter(tx => 
          tx.description.toLowerCase().includes(searchText.toLowerCase()) ||
          tx.amount.toString().includes(searchText)
        )
      );
    }
  }, [searchText, transactions]);

  // Filtros para grupos e subgrupos
  const filteredGroups = form.categoryId 
    ? groups.filter(g => g.categoryId === form.categoryId)
    : [];

  const filteredSubgroups = form.groupId
    ? subgroups.filter(s => s.groupId === form.groupId)
    : [];

  // Manipuladores de formulário
  const handleChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm({
      type: 'income',
      frequency: 'variable',
      categoryId: '',
      groupId: '',
      subgroupId: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
    setCurrentTransaction(null);
  };

  // Salvar transação (Create/Update)
  const handleSubmit = async () => {
    if (!form.amount || !form.categoryId) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios');
      return;
    }

    setProcessing(true);
    
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        const key = `transactions_${user.email}`;
        let updatedTransactions = [];

        if (currentTransaction) {
          // Atualizar transação existente
          updatedTransactions = transactions.map(tx => 
            tx.id === currentTransaction.id ? { 
              ...form, 
              id: currentTransaction.id,
              amount: parseFloat(form.amount),
              updatedAt: new Date().toISOString()
            } : tx
          );
        } else {
          // Criar nova transação
          const newTransaction = {
            id: Date.now().toString(),
            ...form,
            amount: parseFloat(form.amount),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          updatedTransactions = [newTransaction, ...transactions];
        }

        await AsyncStorage.setItem(key, JSON.stringify(updatedTransactions));
        setTransactions(updatedTransactions);
        Alert.alert('Sucesso', `Transação ${currentTransaction ? 'atualizada' : 'criada'} com sucesso!`);
        setModalVisible(false);
        resetForm();
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar transação');
    } finally {
      setProcessing(false);
    }
  };

  // Editar transação
  const handleEdit = (transaction) => {
    setCurrentTransaction(transaction);
    setForm({
      type: transaction.type,
      frequency: transaction.frequency,
      categoryId: transaction.categoryId,
      groupId: transaction.groupId,
      subgroupId: transaction.subgroupId,
      amount: transaction.amount.toString(),
      description: transaction.description,
      date: transaction.date
    });
    setModalVisible(true);
  };

  // Excluir transação
  const handleDelete = (id) => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir esta transação?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              const userData = await AsyncStorage.getItem('userData');
              if (userData) {
                const user = JSON.parse(userData);
                const key = `transactions_${user.email}`;
                const updatedTransactions = transactions.filter(tx => tx.id !== id);
                
                await AsyncStorage.setItem(key, JSON.stringify(updatedTransactions));
                setTransactions(updatedTransactions);
                Alert.alert('Sucesso', 'Transação excluída!');
              }
            } catch (error) {
              Alert.alert('Erro', 'Falha ao excluir transação');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  // Formatar data para exibição
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  // Obter nome da categoria/grupo/subgrupo
  const getCategoryName = (id) => categories.find(c => c.id === id)?.description || 'N/A';
  const getGroupName = (id) => groups.find(g => g.id === id)?.name || 'N/A';
  const getSubgroupName = (id) => subgroups.find(s => s.id === id)?.name || 'N/A';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3a7ca5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header e Barra de Pesquisa */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Movimentações Financeiras</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
          disabled={processing}
        >
          <Icon name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar transações..."
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText !== '' && (
          <TouchableOpacity 
            style={styles.clearSearchButton}
            onPress={() => setSearchText('')}
          >
            <Icon name="close" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Lista de Transações */}
      {filteredTransactions.length > 0 ? (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.transactionCard}>
              <View style={styles.transactionInfo}>
                <View style={styles.transactionHeader}>
                  <Text style={[
                    styles.transactionAmount,
                    item.type === 'income' ? styles.income : styles.expense
                  ]}>
                    {item.type === 'income' ? '+' : '-'} R$ {parseFloat(item.amount).toFixed(2)}
                  </Text>
                  <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
                </View>
                
                <Text style={styles.transactionCategory}>
                  {getCategoryName(item.categoryId)} → {getGroupName(item.groupId)} → {getSubgroupName(item.subgroupId)}
                </Text>
                
                {item.description && (
                  <Text style={styles.transactionDescription}>{item.description}</Text>
                )}
              </View>
              
              <View style={styles.transactionActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleEdit(item)}
                  disabled={processing}
                >
                  <Icon name="edit" size={20} color="#3a7ca5" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleDelete(item.id)}
                  disabled={processing}
                >
                  <Icon name="delete" size={20} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="attach-money" size={50} color="#ddd" />
          <Text style={styles.emptyText}>
            {searchText ? 'Nenhuma transação encontrada' : 'Nenhuma transação cadastrada'}
          </Text>
        </View>
      )}

      {/* Modal do Formulário */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => {
          if (!processing) {
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
                {currentTransaction ? 'Editar Transação' : 'Nova Transação'}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  if (!processing) {
                    setModalVisible(false);
                    resetForm();
                  }
                }}
                disabled={processing}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tipo*</Text>
              <RadioForm
                radio_props={typeOptions}
                initial={currentTransaction ? (currentTransaction.type === 'income' ? 0 : 1) : 0}
                onPress={(value) => handleChange('type', value)}
                buttonSize={12}
                buttonOuterSize={20}
                selectedButtonColor="#3a7ca5"
                buttonColor="#999"
                labelStyle={styles.radioLabel}
                formHorizontal
                style={styles.radioGroup}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Frequência*</Text>
              <RadioForm
                radio_props={frequencyOptions}
                initial={currentTransaction ? (currentTransaction.frequency === 'fixed' ? 0 : 1) : 1}
                onPress={(value) => handleChange('frequency', value)}
                buttonSize={12}
                buttonOuterSize={20}
                selectedButtonColor="#3a7ca5"
                buttonColor="#999"
                labelStyle={styles.radioLabel}
                formHorizontal
                style={styles.radioGroup}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Valor*</Text>
              <TextInput
                style={styles.input}
                placeholder="R$ 0,00"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={form.amount}
                onChangeText={(text) => handleChange('amount', text)}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Data</Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#999"
                value={form.date}
                onChangeText={(text) => handleChange('date', text)}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Categoria*</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={form.categoryId}
                  onValueChange={(value) => handleChange('categoryId', value)}
                >
                  <Picker.Item label="Selecione uma categoria..." value="" />
                  {categories.map(c => (
                    <Picker.Item key={c.id} label={c.description} value={c.id} />
                  ))}
                </Picker>
              </View>
            </View>

            {form.categoryId && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Grupo</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={form.groupId}
                    onValueChange={(value) => handleChange('groupId', value)}
                  >
                    <Picker.Item label="Selecione um grupo..." value="" />
                    {filteredGroups.map(g => (
                      <Picker.Item key={g.id} label={g.name} value={g.id} />
                    ))}
                  </Picker>
                </View>
              </View>
            )}

            {form.groupId && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Subgrupo</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={form.subgroupId}
                    onValueChange={(value) => handleChange('subgroupId', value)}
                  >
                    <Picker.Item label="Selecione um subgrupo..." value="" />
                    {filteredSubgroups.map(s => (
                      <Picker.Item key={s.id} label={s.name} value={s.id} />
                    ))}
                  </Picker>
                </View>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Observações</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Detalhes sobre esta transação..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                value={form.description}
                onChangeText={(text) => handleChange('description', text)}
              />
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, processing && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {currentTransaction ? 'Atualizar' : 'Salvar'}
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
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
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
  transactionCard: {
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
  transactionInfo: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  income: {
    color: '#2ecc71',
  },
  expense: {
    color: '#e74c3c',
  },
  transactionDate: {
    fontSize: 14,
    color: '#999',
  },
  transactionCategory: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  transactionDescription: {
    fontSize: 14,
    color: '#666',
  },
  transactionActions: {
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
  radioGroup: {
    marginTop: 5,
    justifyContent: 'space-between',
  },
  radioLabel: {
    fontSize: 16,
    marginRight: 20,
    color: '#333',
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
    height: 100,
    textAlignVertical: 'top',
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

export default TransactionScreen;