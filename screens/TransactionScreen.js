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
import { useFocusEffect } from '@react-navigation/native';

// Event bus para comunicação entre telas
export const dataUpdateEvents = {
  // Função callback para atualização de dados
  listeners: [],
  
  // Adiciona um listener
  addListener: (callback) => {
    dataUpdateEvents.listeners.push(callback);
    return () => {
      dataUpdateEvents.listeners = dataUpdateEvents.listeners.filter(cb => cb !== callback);
    };
  },
  
  // Notifica todos os listeners
  notify: () => {
    dataUpdateEvents.listeners.forEach(callback => callback());
  }
};

const TransactionScreen = ({ navigation, route }) => {
  // Estados principais
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [establishmentModalVisible, setEstablishmentModalVisible] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [calendarVisible, setCalendarVisible] = useState(false); // Novo estado para o calendário
  
  // Estados do formulário de transação
  const [form, setForm] = useState({
    type: 'income',
    frequency: 'variable',
    categoryId: '',
    groupId: '',
    subgroupId: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    establishmentId: null
  });
  
  // Estados do formulário de estabelecimento
  const [establishmentForm, setEstablishmentForm] = useState({
    name: '',
    category: ''
  });
  
  // Estados para dados auxiliares
  const [categories, setCategories] = useState([]);
  const [groups, setGroups] = useState([]);
  const [subgroups, setSubgroups] = useState([]);
  const [establishments, setEstablishments] = useState([]);
  
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

  // Categorias pré-definidas para estabelecimentos
  const establishmentCategories = [
    'Supermercado',
    'Restaurante',
    'Lanchonete',
    'Fast Food',
    'Farmácia',
    'Governo',
    'Tecnologia',
    'Serviços',
    'Posto de Gasolina',
    'Loja de Roupas',
    'Outros'
  ];

  // Função para carregar dados
  const loadData = async () => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserEmail(user.email);
        const [txs, cats, grps, subgrps, ests] = await Promise.all([
          AsyncStorage.getItem(`transactions_${user.email}`),
          AsyncStorage.getItem(`categories_${user.email}`),
          AsyncStorage.getItem(`groups_${user.email}`),
          AsyncStorage.getItem(`subgroups_${user.email}`),
          AsyncStorage.getItem(`establishments_${user.email}`)
        ]);
        
        setTransactions(txs ? JSON.parse(txs) : []);
        setCategories(cats ? JSON.parse(cats) : []);
        setGroups(grps ? JSON.parse(grps) : []);
        setSubgroups(subgrps ? JSON.parse(subgrps) : []);
        setEstablishments(ests ? JSON.parse(ests) : []);

        // Inicializar form.type com initialType se fornecido nos parâmetros da rota
        if (route?.params?.initialType) {
          setForm(prev => ({ ...prev, type: route.params.initialType }));
        }
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, []);

  // Recarregar dados quando a tela recebe foco
  useFocusEffect(
    React.useCallback(() => {
      if (!transactionModalVisible && !establishmentModalVisible) {
        loadData();
      }
      return () => {};
    }, [transactionModalVisible, establishmentModalVisible])
  );

  // Filtrar transações quando o texto de busca muda
  useEffect(() => {
    if (searchText === '') {
      setFilteredTransactions(transactions);
    } else {
      setFilteredTransactions(
        transactions.filter(tx => 
          tx.description.toLowerCase().includes(searchText.toLowerCase()) ||
          tx.amount.toString().includes(searchText) ||
          (tx.establishmentId && getEstablishmentName(tx.establishmentId).toLowerCase().includes(searchText.toLowerCase()))
        )
      );
    }
  }, [searchText, transactions, establishments]);

  // Filtros para grupos e subgrupos
  const filteredGroups = form.categoryId 
    ? groups.filter(g => g.categoryId === form.categoryId)
    : [];

  const filteredSubgroups = form.groupId
    ? subgroups.filter(s => s.groupId === form.groupId)
    : [];

  // Manipuladores de formulário de transação
  const handleChange = (name, value) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm({
      type: route?.params?.initialType || 'income',
      frequency: 'variable',
      categoryId: '',
      groupId: '',
      subgroupId: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      establishmentId: null
    });
    setCurrentTransaction(null);
  };

  // Manipuladores de formulário de estabelecimento
  const handleEstablishmentChange = (name, value) => {
    setEstablishmentForm(prev => ({ ...prev, [name]: value }));
  };

  const resetEstablishmentForm = () => {
    setEstablishmentForm({
      name: '',
      category: ''
    });
  };

  // Salvar novo estabelecimento
  const handleSaveEstablishment = async () => {
    if (!establishmentForm.name || !establishmentForm.category) {
      Alert.alert('Atenção', 'Preencha o nome e a categoria do estabelecimento');
      return;
    }

    setProcessing(true);
    
    try {
      const key = `establishments_${userEmail}`;
      
      const newEstablishment = {
        id: Date.now().toString(),
        ...establishmentForm,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const updatedEstablishments = [newEstablishment, ...establishments];
      
      await AsyncStorage.setItem(key, JSON.stringify(updatedEstablishments));
      setEstablishments(updatedEstablishments);
      
      // Atualiza o formulário de transação com o novo estabelecimento
      handleChange('establishmentId', newEstablishment.id);
      
      // Notifica outras telas
      dataUpdateEvents.notify();
      
      Alert.alert('Sucesso', 'Estabelecimento cadastrado com sucesso!');
      setEstablishmentModalVisible(false);
      resetEstablishmentForm();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar estabelecimento');
    } finally {
      setProcessing(false);
    }
  };

  // Salvar transação (Create/Update)
  const handleSubmit = async () => {
    if (!form.amount || !form.categoryId) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios');
      return;
    }

    setProcessing(true);
    
    try {
      const key = `transactions_${userEmail}`;
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
      
      // Notifica outras telas sobre a atualização
      dataUpdateEvents.notify();
      
      Alert.alert('Sucesso', `Transação ${currentTransaction ? 'atualizada' : 'criada'} com sucesso!`);
      setTransactionModalVisible(false);
      resetForm();
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
      date: transaction.date,
      establishmentId: transaction.establishmentId || null
    });
    setTransactionModalVisible(true);
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
              const key = `transactions_${userEmail}`;
              const updatedTransactions = transactions.filter(tx => tx.id !== id);
              
              await AsyncStorage.setItem(key, JSON.stringify(updatedTransactions));
              setTransactions(updatedTransactions);
              
              // Notifica outras telas sobre a atualização
              dataUpdateEvents.notify();
              
              Alert.alert('Sucesso', 'Transação excluída!');
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

  // Obter nome da categoria/grupo/subgrupo/estabelecimento
  const getCategoryName = (id) => categories.find(c => c.id === id)?.description || 'N/A';
  const getGroupName = (id) => groups.find(g => g.id === id)?.name || 'N/A';
  const getSubgroupName = (id) => subgroups.find(s => s.id === id)?.name || 'N/A';
  const getEstablishmentName = (id) => establishments.find(e => e.id === id)?.name || 'N/A';

  // Função utilitária para gerar matriz de dias do mês
  const getCalendarMatrix = (year, month) => {
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    let matrix = [];
    let week = [];
    let day = 1 - firstDay;
    for (let i = 0; i < 6; i++) {
      week = [];
      for (let j = 0; j < 7; j++, day++) {
        if (day > 0 && day <= lastDate) {
          week.push(day);
        } else {
          week.push(null);
        }
      }
      matrix.push(week);
    }
    return matrix;
  };

  // Componente de calendário simples
  const Calendar = ({ selectedDate, onSelect, onClose }) => {
    const [currentMonth, setCurrentMonth] = useState(() => {
      const d = new Date(selectedDate);
      return d.getMonth();
    });
    const [currentYear, setCurrentYear] = useState(() => {
      const d = new Date(selectedDate);
      return d.getFullYear();
    });
    const daysOfWeek = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    const matrix = getCalendarMatrix(currentYear, currentMonth);

    const handlePrevMonth = () => {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(y => y - 1);
      } else {
        setCurrentMonth(m => m - 1);
      }
    };
    const handleNextMonth = () => {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(y => y + 1);
      } else {
        setCurrentMonth(m => m + 1);
      }
    };

    const handleSelectDay = (day) => {
      if (!day) return;
      const date = new Date(currentYear, currentMonth, day);
      onSelect(date.toISOString().split('T')[0]);
      onClose();
    };

    return (
      <View style={styles.calendarOverlay}>
        <View style={styles.calendarContainer}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={handlePrevMonth}>
              <Icon name="chevron-left" size={24} color="#3a7ca5" />
            </TouchableOpacity>
            <Text style={styles.calendarHeaderText}>
              {`${('0' + (currentMonth + 1)).slice(-2)}/${currentYear}`}
            </Text>
            <TouchableOpacity onPress={handleNextMonth}>
              <Icon name="chevron-right" size={24} color="#3a7ca5" />
            </TouchableOpacity>
          </View>
          <View style={styles.calendarDaysRow}>
            {daysOfWeek.map((d, i) => (
              <Text key={i} style={styles.calendarDayLabel}>{d}</Text>
            ))}
          </View>
          {matrix.map((week, i) => (
            <View key={i} style={styles.calendarDaysRow}>
              {week.map((day, j) => {
                const isSelected = day &&
                  new Date(currentYear, currentMonth, day).toISOString().split('T')[0] === selectedDate;
                return (
                  <TouchableOpacity
                    key={j}
                    style={[styles.calendarDay, isSelected && styles.calendarDaySelected]}
                    onPress={() => handleSelectDay(day)}
                    disabled={!day}
                  >
                    <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected]}>{day ? day : ''}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          <TouchableOpacity style={styles.calendarCloseButton} onPress={onClose}>
            <Text style={styles.calendarCloseButtonText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
            setTransactionModalVisible(true);
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
                
                {item.establishmentId && (
                  <Text style={styles.transactionEstablishment}>
                    <Icon name="store" size={14} color="#666" /> {getEstablishmentName(item.establishmentId)}
                  </Text>
                )}
                
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

      {/* Modal do Formulário de Transação */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={transactionModalVisible}
        onRequestClose={() => {
          if (!processing) {
            setTransactionModalVisible(false);
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
                    setTransactionModalVisible(false);
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
              <TouchableOpacity onPress={() => setCalendarVisible(true)}>
                <TextInput
                  style={styles.input}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor="#999"
                  value={form.date}
                  editable={false}
                  pointerEvents="none"
                />
              </TouchableOpacity>
              {calendarVisible && (
                <Calendar
                  selectedDate={form.date}
                  onSelect={(date) => handleChange('date', date)}
                  onClose={() => setCalendarVisible(false)}
                />
              )}
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
              <Text style={styles.label}>Estabelecimento</Text>
              <View style={styles.establishmentContainer}>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={form.establishmentId}
                    onValueChange={(value) => handleChange('establishmentId', value)}
                  >
                    <Picker.Item label="Nenhum estabelecimento" value={null} />
                    {establishments.map(e => (
                      <Picker.Item key={e.id} label={e.name} value={e.id} />
                    ))}
                  </Picker>
                </View>
                <TouchableOpacity 
                  style={styles.addEstablishmentButton}
                  onPress={() => setEstablishmentModalVisible(true)}
                >
                  <Icon name="add-business" size={20} color="#3a7ca5" />
                </TouchableOpacity>
              </View>
            </View>

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

      {/* Modal do Formulário de Estabelecimento */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={establishmentModalVisible}
        onRequestClose={() => {
          if (!processing) {
            setEstablishmentModalVisible(false);
            resetEstablishmentForm();
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Estabelecimento</Text>
              <TouchableOpacity 
                onPress={() => {
                  if (!processing) {
                    setEstablishmentModalVisible(false);
                    resetEstablishmentForm();
                  }
                }}
                disabled={processing}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nome do Estabelecimento*</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Supermercado XYZ"
                placeholderTextColor="#999"
                value={establishmentForm.name}
                onChangeText={(text) => handleEstablishmentChange('name', text)}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Categoria*</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={establishmentForm.category}
                  onValueChange={(value) => handleEstablishmentChange('category', value)}
                >
                  <Picker.Item label="Selecione uma categoria..." value="" />
                  {establishmentCategories.map((cat, index) => (
                    <Picker.Item key={index} label={cat} value={cat} />
                  ))}
                </Picker>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, processing && styles.buttonDisabled]}
              onPress={handleSaveEstablishment}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Salvar Estabelecimento</Text>
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
  transactionEstablishment: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
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
    flex: 1,
  },
  establishmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addEstablishmentButton: {
    marginLeft: 10,
    padding: 10,
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
  calendarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: 320,
    elevation: 5,
    alignItems: 'center',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  calendarHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3a7ca5',
  },
  calendarDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 2,
  },
  calendarDayLabel: {
    width: 32,
    textAlign: 'center',
    color: '#888',
    fontWeight: 'bold',
  },
  calendarDay: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    margin: 1,
  },
  calendarDaySelected: {
    backgroundColor: '#3a7ca5',
  },
  calendarDayText: {
    color: '#333',
    fontSize: 15,
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  calendarCloseButton: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#eee',
    borderRadius: 6,
  },
  calendarCloseButtonText: {
    color: '#3a7ca5',
    fontWeight: 'bold',
    fontSize: 15,
  },
});

export default TransactionScreen;