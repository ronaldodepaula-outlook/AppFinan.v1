import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { Picker } from '@react-native-picker/picker';
import RadioForm from 'react-native-simple-radio-button';
import { useFocusEffect } from '@react-navigation/native';
import { FAB, Portal, Provider as PaperProvider } from 'react-native-paper';
import { dataUpdateEvents } from './TransactionScreen';

global.AsyncStorage = AsyncStorage;

const HomeScreen = ({ navigation }) => {
  const [userName, setUserName] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [establishments, setEstablishments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Indicadores
  const [balance, setBalance] = useState(0);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [biggestExpense, setBiggestExpense] = useState(null);
  const [monthlyTrend, setMonthlyTrend] = useState('stable');
  const [frequentEstablishments, setFrequentEstablishments] = useState([]);
  const [monthlyComparison, setMonthlyComparison] = useState([]);
  const [yearOverYearExpenseChange, setYearOverYearExpenseChange] = useState(null);

  // Estados para o modal de transação
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [establishmentModalVisible, setEstablishmentModalVisible] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [groups, setGroups] = useState([]);
  const [subgroups, setSubgroups] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  
  // State for FAB group
  const [fabOpen, setFabOpen] = useState(false);

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
  
  // Função para carregar todos os dados
  const loadData = async () => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserName(user.name);
        setUserEmail(user.email);
        
        const [txs, cats, grps, subgrps, ests] = await Promise.all([
          AsyncStorage.getItem(`transactions_${user.email}`),
          AsyncStorage.getItem(`categories_${user.email}`),
          AsyncStorage.getItem(`groups_${user.email}`),
          AsyncStorage.getItem(`subgroups_${user.email}`),
          AsyncStorage.getItem(`establishments_${user.email}`)
        ]);
        
        const loadedTransactions = txs ? JSON.parse(txs) : [];
        const loadedCategories = cats ? JSON.parse(cats) : [];
        const loadedGroups = grps ? JSON.parse(grps) : [];
        const loadedSubgroups = subgrps ? JSON.parse(subgrps) : [];
        const loadedEstablishments = ests ? JSON.parse(ests) : [];
        
        setTransactions(loadedTransactions);
        setCategories(loadedCategories);
        setGroups(loadedGroups);
        setSubgroups(loadedSubgroups);
        setEstablishments(loadedEstablishments);
        calculateIndicators(loadedTransactions, loadedCategories, loadedEstablishments);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carrega dados iniciais na montagem do componente
  useEffect(() => {
    loadData();

    // Inscreve-se para receber notificações de atualização de dados
    const unsubscribe = dataUpdateEvents.addListener(() => {
      console.log('HomeScreen: recebida notificação de atualização de dados');
      loadData();
    });

    // Limpa a inscrição quando o componente for desmontado
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Recarrega dados quando a tela recebe foco
  useFocusEffect(
    React.useCallback(() => {
      // Não recarregamos se a modal está aberta para evitar loops
      if (!transactionModalVisible && !establishmentModalVisible) {
        console.log('HomeScreen recebeu foco, recarregando dados...');
        loadData();
      }
      return () => {};
    }, [transactionModalVisible, establishmentModalVisible])
  );

  // Calcula todos os indicadores financeiros
  const calculateIndicators = (transactions, categories, establishments) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const previousYear = currentYear - 1;
    
    // Filtra transações do mês atual
    const currentMonthTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
    });

    // Calcula receitas, despesas e saldo do MÊS ATUAL
    let currentMonthTotalIncome = 0;
    let currentMonthTotalExpenses = 0;
    const categoryMap = {};
    let maxExpense = { amount: 0 };
    const establishmentMap = {};

    currentMonthTransactions.forEach(tx => {
      const amount = parseFloat(tx.amount);
      
      if (tx.type === 'income') {
        currentMonthTotalIncome += amount;
      } else {
        currentMonthTotalExpenses += amount;
        
        // Mapeia gastos por categoria
        if (tx.categoryId) {
          const categoryName = getCategoryName(tx.categoryId, categories);
          categoryMap[categoryName] = (categoryMap[categoryName] || 0) + amount;
        }
        
        // Identifica maior despesa
        if (amount > maxExpense.amount) {
          maxExpense = {
            amount,
            description: tx.description,
            categoryId: tx.categoryId,
            date: tx.date,
            establishmentId: tx.establishmentId
          };
        }
        
        // Mapeia estabelecimentos frequentes
        if (tx.establishmentId) {
          establishmentMap[tx.establishmentId] = (establishmentMap[tx.establishmentId] || 0) + 1;
        }
      }
    });

    // Calcula saldo atual
    const currentBalance = currentMonthTotalIncome - currentMonthTotalExpenses;
    
    // Ordena categorias por valor gasto
    const sortedCategories = Object.entries(categoryMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
    
    // Ordena estabelecimentos por frequência
    const sortedEstablishments = Object.entries(establishmentMap)
      .map(([id, count]) => ({ 
        id, 
        count,
        name: getEstablishmentName(id, establishments)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Calcula comparação mensal (últimos 6 meses) - ANO ATUAL
    const monthlyDataCurrentYear = [];
    let totalCurrentYearPeriodExpenses = 0;
    for (let i = 5; i >= 0; i--) {
      const month = currentMonth - i;
      const year = month < 0 ? currentYear - 1 : currentYear;
      const adjustedMonth = month < 0 ? month + 12 : month;
      
      const monthTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate.getMonth() === adjustedMonth && txDate.getFullYear() === year;
      });
      
      const monthIncome = monthTransactions
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
        
      const monthExpenses = monthTransactions
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
        
      totalCurrentYearPeriodExpenses += monthExpenses; // Sum expenses for YoY comparison
        
      monthlyDataCurrentYear.push({
        month: adjustedMonth,
        year,
        income: monthIncome,
        expenses: monthExpenses,
        balance: monthIncome - monthExpenses
      });
    }
    
    // Calcula comparação mensal (últimos 6 meses) - ANO ANTERIOR
    let totalPreviousYearPeriodExpenses = 0;
    for (let i = 5; i >= 0; i--) {
        const month = currentMonth - i;
        // Ensure we are always looking at the previous year relative to the loop's target month/year
        const targetYearForPrevious = month < 0 ? previousYear -1 : previousYear;
        const adjustedMonth = month < 0 ? month + 12 : month;

        const monthTransactionsPreviousYear = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate.getMonth() === adjustedMonth && txDate.getFullYear() === targetYearForPrevious;
        });

        const monthExpensesPreviousYear = monthTransactionsPreviousYear
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

        totalPreviousYearPeriodExpenses += monthExpensesPreviousYear;
    }
    
    // Calcula variação percentual Ano vs Ano Anterior para despesas
    let yoyChange = null;
    if (totalPreviousYearPeriodExpenses > 0) {
        yoyChange = ((totalCurrentYearPeriodExpenses - totalPreviousYearPeriodExpenses) / totalPreviousYearPeriodExpenses) * 100;
    } else if (totalCurrentYearPeriodExpenses > 0) {
        yoyChange = Infinity; // Indicate increase from zero
    }

    // Calcula tendência mensal (comparação com mês anterior) - Usando dados do ano atual
    let trend = 'stable';
    if (monthlyDataCurrentYear.length >= 2) {
      const current = monthlyDataCurrentYear[monthlyDataCurrentYear.length - 1];
      const previous = monthlyDataCurrentYear[monthlyDataCurrentYear.length - 2];
      
      if (current.expenses > previous.expenses * 1.1) {
        trend = 'up';
      } else if (current.expenses < previous.expenses * 0.9) {
        trend = 'down';
      }
    }

    // Atualiza todos os estados
    setBalance(currentBalance);
    setIncome(currentMonthTotalIncome);
    setExpenses(currentMonthTotalExpenses);
    setExpensesByCategory(sortedCategories);
    setBiggestExpense(maxExpense.amount > 0 ? maxExpense : null);
    setMonthlyTrend(trend);
    setFrequentEstablishments(sortedEstablishments);
    setMonthlyComparison(monthlyDataCurrentYear); // Use current year data for chart
    setYearOverYearExpenseChange(yoyChange); // Set YoY change
  };

  // Funções auxiliares para obter nomes
  const getCategoryName = (categoryId, categoriesList) => {
    const category = categoriesList.find(c => c.id === categoryId);
    return category ? category.description : 'Outros';
  };

  const getEstablishmentName = (establishmentId, establishmentsList) => {
    const establishment = establishmentsList.find(e => e.id === establishmentId);
    return establishment ? establishment.name : 'Estabelecimento desconhecido';
  };

  // Formata valores monetários
  const formatCurrency = (value) => {
    return `R$ ${value.toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')}`;
  };

  // Formata nomes de meses
  const formatMonth = (month) => {
    const months = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    return months[month];
  };

  // Renderiza gráfico de pizza para categorias de gastos
  const renderPieChart = () => {
    if (expensesByCategory.length === 0) return null;
    
    // Mapeia nome da categoria para ID para navegação
    const categoryNameToIdMap = categories.reduce((map, cat) => {
      map[cat.description] = cat.id;
      return map;
    }, {});
    
    // Pega as Top 10 categorias
    const topCategoriesData = expensesByCategory.slice(0, 10).map((item, index) => {
      const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', 
        '#FF9F40', '#4CAF50', '#E91E63', '#673AB7', '#00BCD4'
      ];
      const categoryId = categoryNameToIdMap[item.name];
      return {
        name: item.name,
        amount: item.amount,
        color: colors[index % colors.length],
        id: categoryId,
      };
    });

    const handleLegendItemClick = (categoryName, categoryId) => {
      if (categoryId) {
        console.log(`Clicou na legenda: ${categoryName}, ID: ${categoryId}`);
        navigation.navigate('CategoryDetail', { 
          categoryId: categoryId,
          categoryName: categoryName,
          transactions: transactions.filter(tx => 
            tx.categoryId === categoryId && 
            new Date(tx.date).getMonth() === new Date().getMonth() && 
            new Date(tx.date).getFullYear() === new Date().getFullYear()
          ),
          establishments: establishments
        });
      } else {
        console.warn(`ID da categoria não encontrado para: ${categoryName}`);
      }
    };
    
    const chartHeight = 140; 
    // Increase chart width prop slightly for more flex space
    const chartRenderWidth = Dimensions.get('window').width * 0.55; 

    return (
      <View style={styles.distributionContainer}> 
        <Text style={styles.sectionTitle}>Top 10 Gastos (Mês)</Text>
        <View style={styles.chartAndLegendWrapper}> 
          
          {/* Legend ScrollView (Left) - Further Reduced flex */}
          <ScrollView 
            style={[styles.customLegendContainer, { maxHeight: chartHeight }]} 
            showsVerticalScrollIndicator={false}
          >
             {topCategoriesData.map((item, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.legendItemClickable}
                onPress={() => handleLegendItemClick(item.name, item.id)}
              >
                <View style={[styles.legendColorBox, { backgroundColor: item.color }]} />
                <View style={styles.legendTextContainer}> 
                  <Text style={styles.legendTextClickableName} numberOfLines={1} ellipsizeMode='tail'>{item.name}</Text>
                  <Text style={styles.legendTextClickableAmount}>{formatCurrency(item.amount)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Pie Chart View (Right) - Further Increased flex */}
          <View style={styles.pieChartWrapper}> 
            <PieChart
              data={topCategoriesData}
              width={chartRenderWidth} // Use adjusted width
              height={chartHeight}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`, 
                decimalPlaces: 0,
              }}
              accessor="amount"
              backgroundColor="transparent"
              absolute 
              hasLegend={false} 
              paddingLeft={5} 
            />
          </View>

        </View>
      </View>
    );
  };

  // Renderiza gráfico de barras para comparação mensal
  const renderBarChart = () => {
    if (monthlyComparison.length === 0) return null;
    
    // Use new padding value (16)
    const screenPadding = 16; // Padding of the root view
    const cardPadding = 15;   // Padding of the chartCard
    const totalChartPadding = (screenPadding + cardPadding) * 2;
    const barChartWidth = Dimensions.get('window').width - totalChartPadding;
    
    const labels = monthlyComparison.map(item => 
      `${formatMonth(item.month)}/${item.year.toString().slice(2)}`
    );
    
    const incomeData = monthlyComparison.map(item => item.income);
    const expensesData = monthlyComparison.map(item => item.expenses);
    const incomeColor = 'rgba(46, 204, 113, 1)'; // Verde
    const expenseColor = 'rgba(231, 76, 60, 1)'; // Vermelho

    return (
      <View style={styles.chartCard}>
        <Text style={styles.sectionTitle}>Histórico Mensal (Últimos 6 Meses)</Text>
        <BarChart
          data={{
            labels,
            datasets: [
              {
                data: incomeData,
                color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,
              },
              {
                data: expensesData,
                color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
              },
            ],
             legend: ["Receitas", "Despesas"]
          }}
          width={barChartWidth} // Use recalculated width
          height={220}
          yAxisLabel="R$ "
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0, 
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`, 
            labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`, 
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: "6",
              strokeWidth: "2",
              stroke: "#ffa726"
            },
            propsForBackgroundLines: {
              strokeDasharray: "", 
              stroke: "#e3e3e3",
            },
            barPercentage: 0.7, 
            fillShadowGradientFrom: 'rgba(46, 204, 113, 1)',
            fillShadowGradientFromOpacity: 1,
            fillShadowGradientTo: 'rgba(231, 76, 60, 1)',
            fillShadowGradientToOpacity: 1,
             barColors: ['rgba(46, 204, 113, 1)', 'rgba(231, 76, 60, 1)'],

          }}
          verticalLabelRotation={30} 
          style={styles.chartStyle}
          showBarTops={false}
          withInnerLines={true}
        />
        {/* Custom Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColorBox, { backgroundColor: incomeColor }]} />
            <Text style={styles.legendText}>Receitas</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColorBox, { backgroundColor: expenseColor }]} />
            <Text style={styles.legendText}>Despesas</Text>
          </View>
        </View>
      </View>
    );
  };

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

  const resetForm = (type = 'income') => {
    setForm({
      type: type,
      frequency: 'variable',
      categoryId: '',
      groupId: '',
      subgroupId: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      establishmentId: null
    });
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
      
      // Notifica outras telas sobre a atualização
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

  // Salvar transação
  const handleSubmit = async () => {
    if (!form.amount || !form.categoryId) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios');
      return;
    }

    setProcessing(true);
    
    try {
      const key = `transactions_${userEmail}`;
      
      const newTransaction = {
        id: Date.now().toString(),
        ...form,
        amount: parseFloat(form.amount),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const updatedTransactions = [newTransaction, ...transactions];
      
      await AsyncStorage.setItem(key, JSON.stringify(updatedTransactions));
      setTransactions(updatedTransactions);
      
      // Recalcular indicadores
      calculateIndicators(updatedTransactions, categories, establishments);
      
      // Notifica outras telas sobre a atualização
      dataUpdateEvents.notify();
      
      Alert.alert('Sucesso', 'Transação registrada com sucesso!');
      setTransactionModalVisible(false);
      resetForm();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar transação');
    } finally {
      setProcessing(false);
    }
  };

  const [calendarVisible, setCalendarVisible] = useState(false); // Estado para o calendário customizado

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

  // Componente de calendário customizado
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
                  new Date(currentYear, currentMonth, day).toISOString().split('T')[0] === form.date;
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
    <PaperProvider> 
      {/* Increase horizontal padding slightly */}
      <View style={{ flex: 1, backgroundColor: '#f5f5f5', paddingHorizontal: 16 }}> 
        <ScrollView 
          style={styles.container} 
          contentContainerStyle={{ paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        >
            <View style={styles.header}>
                <Text style={styles.welcomeText}>Olá {userName},</Text>
                <Text style={styles.title}>Resumo Financeiro</Text>
            </View>
            
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Saldo Atual</Text>
                <Text style={[styles.cardValue, { color: balance >= 0 ? '#4CAF50' : '#F44336' }]}>
                {formatCurrency(balance)}
                </Text>
                <View style={styles.incomeExpenseContainer}>
                <View style={styles.incomeExpenseItem}>
                    <Icon name="trending-up" size={20} color="#4CAF50" />
                    <Text style={styles.incomeExpenseText}>{formatCurrency(income)}</Text>
                </View>
                <View style={styles.incomeExpenseItem}>
                    <Icon name="trending-down" size={20} color="#F44336" />
                    <Text style={styles.incomeExpenseText}>{formatCurrency(expenses)}</Text>
                </View>
                </View>
            </View>
            
            {renderBarChart()}

            {yearOverYearExpenseChange !== null && (
                <View style={styles.indicatorCard}> 
                    <View style={styles.indicatorHeader}>
                        <Icon name="compare-arrows" size={24} color="#673AB7" />
                        <Text style={styles.indicatorTitle}>Despesas (vs Ano Anterior)</Text>
                    </View>
                    <Text 
                        style={[
                        styles.indicatorValue,
                        yearOverYearExpenseChange > 0 ? styles.expenseText : styles.incomeText,
                        ]}
                    >
                        {yearOverYearExpenseChange === Infinity ? 'Aumento (de R$ 0)' :
                        `${yearOverYearExpenseChange > 0 ? '+' : ''}${yearOverYearExpenseChange.toFixed(1)}%`
                        }
                    </Text>
                    <Text style={styles.indicatorDescription}>
                        Comparação das despesas totais dos últimos 6 meses com o mesmo período do ano anterior.
                    </Text>
                </View>
            )}

            {renderPieChart()}
            
            <View style={styles.indicatorsContainer}>
                <Text style={styles.sectionTitle}>Análise Detalhada</Text>
            
                {biggestExpense && (
                <View style={styles.indicatorCard}>
                    <View style={styles.indicatorHeader}>
                        <Icon name="warning" size={24} color="#FF9800" />
                        <Text style={styles.indicatorTitle}>Maior Despesa do Mês</Text>
                    </View>
                    <Text style={styles.indicatorValue}>{formatCurrency(biggestExpense.amount)}</Text>
                    <Text style={styles.indicatorDescription}>
                        {biggestExpense.description || 'Sem descrição'} em {getCategoryName(biggestExpense.categoryId, categories)}
                    </Text>
                    {biggestExpense.establishmentId && (
                        <Text style={styles.indicatorDescription}>
                        <Icon name="store" size={14} color="#666" /> {getEstablishmentName(biggestExpense.establishmentId, establishments)}
                        </Text>
                    )}
                    <Text style={styles.indicatorDate}>
                        {new Date(biggestExpense.date).toLocaleDateString('pt-BR')}
                    </Text>
                </View>
                )}
                
                <View style={styles.indicatorCard}>
                    <View style={styles.indicatorHeader}>
                        <Icon 
                        name={monthlyTrend === 'up' ? 'arrow-upward' : monthlyTrend === 'down' ? 'arrow-downward' : 'remove'} 
                        size={24} 
                        color={monthlyTrend === 'up' ? '#F44336' : monthlyTrend === 'down' ? '#4CAF50' : '#FF9800'} 
                        />
                        <Text style={styles.indicatorTitle}>Tendência de Gastos</Text>
                    </View>
                    <Text style={styles.indicatorValue}>
                        {monthlyTrend === 'up' ? 'Aumentando' : monthlyTrend === 'down' ? 'Diminuindo' : 'Estável'}
                    </Text>
                    <Text style={styles.indicatorDescription}>
                        {monthlyTrend === 'up' ? 
                        'Seus gastos estão aumentando em relação ao mês anterior' :
                        monthlyTrend === 'down' ?
                        'Seus gastos estão diminuindo em relação ao mês anterior' :
                        'Seus gastos estão estáveis em relação ao mês anterior'}
                    </Text>
                </View>
                
                {expensesByCategory.length > 0 && (
                <View style={styles.indicatorCard}>
                    <View style={styles.indicatorHeader}>
                        <Icon name="category" size={24} color="#3F51B5" />
                        <Text style={styles.indicatorTitle}>Principais Categorias</Text>
                    </View>
                    {expensesByCategory.slice(0, 3).map((cat, index) => (
                        <View key={index} style={styles.categoryItem}>
                            <Text style={styles.categoryName}>{cat.name}</Text>
                            <Text style={styles.categoryAmount}>{formatCurrency(cat.amount)}</Text>
                        </View>
                    ))}
                </View>
                )}
                
                {frequentEstablishments.length > 0 && (
                <View style={styles.indicatorCard}>
                    <View style={styles.indicatorHeader}>
                        <Icon name="store" size={24} color="#9C27B0" />
                        <Text style={styles.indicatorTitle}>Locais Frequentes</Text>
                    </View>
                    {frequentEstablishments.map((est, index) => (
                        <View key={index} style={styles.establishmentItem}>
                            <Text style={styles.establishmentName}>{est.name}</Text>
                            <Text style={styles.establishmentCount}>{est.count} {est.count === 1 ? 'compra' : 'compras'}</Text>
                        </View>
                    ))}
                </View>
                )}
            </View>

        </ScrollView>

        {/* Portal for FAB, placed after ScrollView */}
        <Portal>
          <FAB.Group
            open={fabOpen}
            visible
            icon={fabOpen ? 'close' : 'plus'}
            actions={[
                {
                  icon: 'arrow-down-bold-circle', 
                  label: 'Nova Despesa',
                  color: '#F44336',
                  style: { backgroundColor: 'white' },
                  labelStyle: { color: '#F44336' },
                  onPress: () => {
                    resetForm('expense');
                    setTransactionModalVisible(true);
                  },
                  small: false,
                },
                {
                  icon: 'arrow-up-bold-circle', 
                  label: 'Nova Receita',
                  color: '#4CAF50',
                  style: { backgroundColor: 'white' },
                  labelStyle: { color: '#4CAF50' },
                  onPress: () => {
                    resetForm('income');
                    setTransactionModalVisible(true);
                  },
                  small: false,
                },
            ]}
            onStateChange={({ open }) => setFabOpen(open)}
            onPress={() => {
              if (fabOpen) {
                // Optional: Action when main FAB is pressed while open
              }
            }}
            // Optional: Add FAB style for positioning if needed
            // style={styles.fab}
          />
        </Portal>

        {/* Transaction Modal - Keep outside Portal */}
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
                          {form.type === 'income' ? 'Nova Receita' : 'Nova Despesa'}
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
                          initial={form.type === 'income' ? 0 : 1}
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
                          initial={form.frequency === 'fixed' ? 0 : 1}
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
                          <Text style={styles.saveButtonText}>Salvar</Text>
                      )}
                  </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </Modal>

        {/* Establishment Modal - Keep outside Portal */}
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
          
          {/* Calendar Modal - New Calendar Component */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={calendarVisible}
            onRequestClose={() => {
                setCalendarVisible(false);
            }}
          >
            <Calendar 
              selectedDate={form.date}
              onSelect={(date) => handleChange('date', date)}
              onClose={() => setCalendarVisible(false)}
            />
          </Modal>
      </View>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor is now on the root View
    // Remove paddingHorizontal if it existed here
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#3a7ca5',
    marginBottom: 5,
  },
  title: {
    fontSize: 18,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  incomeExpenseContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  incomeExpenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  incomeExpenseText: {
    marginLeft: 8,
    fontSize: 16,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  indicatorsContainer: {
    marginBottom: 20,
  },
  indicatorCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  indicatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  indicatorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#333',
  },
  indicatorValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  indicatorDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  indicatorDate: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryName: {
    fontSize: 14,
    color: '#333',
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  establishmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  establishmentName: {
    fontSize: 14,
    color: '#333',
    flex: 2,
  },
  establishmentCount: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalContent: {
    padding: 20,
    paddingBottom: 40,
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
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  chartStyle: {
    marginVertical: 8,
    borderRadius: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  legendColorBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#555',
  },
  incomeText: {
    color: '#4CAF50',
  },
  expenseText: {
    color: '#F44336',
  },
  distributionContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15, 
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartAndLegendWrapper: {
    flexDirection: 'row',
    alignItems: 'center', 
    width: '100%', 
    marginTop: 5,
  },
  customLegendContainer: {
    flex: 0.8, // Legend takes less space
    flexDirection: 'column',
    paddingLeft: 0, 
    paddingRight: 5, 
    // maxHeight is set inline
  },
  pieChartWrapper: {
    flex: 1.7, // Chart takes more space
    
    paddingLeft: 5, 
  },
  legendItemClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7, 
    paddingVertical: 2,
  },
  legendTextContainer: {
    flexDirection: 'column',
    flexShrink: 1, 
  },
  legendTextClickableName: {
    fontSize: 9,
    color: '#444',
    fontWeight: '300',
    marginBottom: 1,
  },
  legendTextClickableAmount: {
    fontSize: 9,
    color: '#000',
    fontWeight: '600', 
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

export default HomeScreen;