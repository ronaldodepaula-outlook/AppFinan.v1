import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const CategoryDetailScreen = ({ route, navigation }) => {
  const { categoryId, categoryName, transactions, establishments } = route.params;

  // Função para obter nome do estabelecimento (similar à HomeScreen)
  const getEstablishmentName = (establishmentId, establishmentsList) => {
    const establishment = establishmentsList.find(e => e.id === establishmentId);
    return establishment ? establishment.name : 'N/A';
  };

  // Formatar data para exibição
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  // Formata valores monetários
  const formatCurrency = (value) => {
    return `R$ ${parseFloat(value).toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')}`;
  };

  const renderTransactionItem = ({ item }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionInfo}>
        <View style={styles.transactionHeader}>
          <Text style={styles.transactionAmount}> 
            - {formatCurrency(item.amount)}
          </Text>
          <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
        </View>
        
        {item.establishmentId && (
          <Text style={styles.transactionEstablishment}>
            <Icon name="store" size={14} color="#666" /> {getEstablishmentName(item.establishmentId, establishments)}
          </Text>
        )}
        
        {item.description && (
          <Text style={styles.transactionDescription}>{item.description}</Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {transactions.length > 0 ? (
        <FlatList
          data={transactions.sort((a, b) => new Date(b.date) - new Date(a.date))} // Ordena por data decrescente
          keyExtractor={(item) => item.id}
          renderItem={renderTransactionItem}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="receipt-long" size={50} color="#ccc" />
          <Text style={styles.emptyText}>Nenhuma despesa encontrada para esta categoria no mês atual.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  listContent: {
    padding: 15,
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
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
    marginBottom: 8,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e74c3c', // Expense color
  },
  transactionDate: {
    fontSize: 14,
    color: '#999',
  },
  transactionEstablishment: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
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
});

export default CategoryDetailScreen; 