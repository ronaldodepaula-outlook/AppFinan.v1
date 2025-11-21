import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { dataUpdateEvents } from './TransactionScreen'; // Import event bus
import RNFS from 'react-native-fs'; // Ensure this package is installed
import { Button, Provider as PaperProvider } from 'react-native-paper';

const SettingsScreen = () => {
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getUserEmail = async () => {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserEmail(user.email);
      }
    };
    getUserEmail();
  }, []);

  const getStorageKeys = () => {
    if (!userEmail) return [];
    return [
      `transactions_${userEmail}`,
      `categories_${userEmail}`,
      `groups_${userEmail}`,
      `subgroups_${userEmail}`,
      `establishments_${userEmail}`,
      // Adicione outras chaves relevantes aqui, se houver
    ];
  };

  const backupData = async () => {
    if (!userEmail) {
      Alert.alert('Erro', 'Não foi possível identificar o usuário para o backup.');
      return;
    }
    setLoading(true);
    try {
      const keys = getStorageKeys();
      const dataToBackup = {};
      const storageData = await AsyncStorage.multiGet(keys);

      storageData.forEach(([key, value]) => {
        if (value) {
          dataToBackup[key] = JSON.parse(value);
        }
      });

      const backupFileName = `financas_backup_${userEmail}_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = FileSystem.documentDirectory + backupFileName;

      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(dataToBackup, null, 2));

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Backup Criado', `Arquivo salvo em: ${fileUri}. Por favor, compartilhe manualmente.`);
        return;
      }

      await Sharing.shareAsync(fileUri);
      Alert.alert('Backup Concluído', 'O arquivo de backup foi criado e compartilhado com sucesso.');

    } catch (error) {
      console.error('Erro ao fazer backup:', error);
      Alert.alert('Erro', 'Falha ao criar o arquivo de backup.');
    } finally {
      setLoading(false);
    }
  };

  const restoreData = async () => {
    setLoading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });

      if (result.canceled) {
          setLoading(false);
          return;
      }
      
      // Check if 'uri' exists before accessing it
      if (!result.assets || !result.assets[0] || !result.assets[0].uri) {
        throw new Error('URI do arquivo não encontrada.');
      }
      
      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const dataToRestore = JSON.parse(fileContent);

      const restorePromises = Object.entries(dataToRestore).map(([key, value]) => {
        // Basic validation: Check if the key belongs to the current user if possible
        // This is a simple check, consider more robust validation if needed
        if (userEmail && !key.includes(userEmail)) {
          console.warn(`Chave ${key} não pertence ao usuário atual (${userEmail}), pulando restauração.`);
          return Promise.resolve(); // Skip this key
        }
        return AsyncStorage.setItem(key, JSON.stringify(value));
      });

      await Promise.all(restorePromises);
      
      // Notify other screens about the data update
      dataUpdateEvents.notify();
      
      Alert.alert('Restauração Concluída', 'Os dados foram restaurados com sucesso.');

    } catch (error) {
      console.error('Erro ao restaurar dados:', error);
      Alert.alert('Erro', 'Falha ao restaurar os dados do backup.');
    } finally {
      setLoading(false);
    }
  };

  const resetData = async () => {
    if (!userEmail) {
      Alert.alert('Erro', 'Não foi possível identificar o usuário para resetar os dados.');
      return;
    }

    Alert.alert(
      'Confirmar Reset',
      'TEM CERTEZA que deseja apagar TODOS os seus dados? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetar Tudo',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const keys = getStorageKeys();
              await AsyncStorage.multiRemove(keys);
              
              // Notify other screens about the data update
              dataUpdateEvents.notify();
              
              Alert.alert('Reset Concluído', 'Todos os dados foram apagados.');
            } catch (error) {
              console.error('Erro ao resetar dados:', error);
              Alert.alert('Erro', 'Falha ao apagar os dados.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const exportToCsv = async () => {
    if (!userEmail) {
      Alert.alert('Erro', 'Não foi possível identificar o usuário para exportar.');
      return;
    }
    setLoading(true);
    try {
      const transactionsKey = `transactions_${userEmail}`;
      const categoriesKey = `categories_${userEmail}`;
      const establishmentsKey = `establishments_${userEmail}`;

      const [transactionsData, categoriesData, establishmentsData] = await AsyncStorage.multiGet([
        transactionsKey,
        categoriesKey,
        establishmentsKey,
      ]);

      const transactions = transactionsData && transactionsData[1] ? JSON.parse(transactionsData[1]) : [];
      const categories = categoriesData && categoriesData[1] ? JSON.parse(categoriesData[1]) : [];
      const establishments = establishmentsData && establishmentsData[1] ? JSON.parse(establishmentsData[1]) : [];

      if (transactions.length === 0) {
        Alert.alert('Info', 'Não há transações para exportar.');
        setLoading(false);
        return;
      }

      // Create maps for quick lookups
      const categoryMap = categories.reduce((map, cat) => {
        map[cat.id] = cat.description;
        return map;
      }, {});
      const establishmentMap = establishments.reduce((map, est) => {
        map[est.id] = est.name;
        return map;
      }, {});

      // Header row
      let csvContent = 'Data,Tipo,Frequencia,Valor,Categoria,Estabelecimento,Descricao\n';

      // Data rows
      transactions.forEach(tx => {
        const date = new Date(tx.date).toLocaleDateString('pt-BR');
        const type = tx.type === 'income' ? 'Receita' : 'Despesa';
        const frequency = tx.frequency === 'fixed' ? 'Fixa' : 'Variável';
        const amount = tx.amount.toFixed(2).replace('.', ','); // Format as BRL currency
        const categoryName = categoryMap[tx.categoryId] || 'N/A';
        const establishmentName = establishmentMap[tx.establishmentId] || 'N/A';
        const description = tx.description ? `"${tx.description.replace(/"/g, '""')}"` : ''; // Handle quotes

        csvContent += `${date},${type},${frequency},${amount},${categoryName},${establishmentName},${description}\n`;
      });

      const csvFileName = `transacoes_export_${userEmail}_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + csvFileName;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Exportação Criada', `Arquivo CSV salvo em: ${fileUri}. Por favor, compartilhe manualmente.`);
        return;
      }

      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Exportar Transações' });
      Alert.alert('Exportação Concluída', 'O arquivo CSV foi criado e compartilhado com sucesso.');

    } catch (error) {
      console.error('Erro ao exportar para CSV:', error);
      Alert.alert('Erro', 'Falha ao exportar os dados para CSV.');
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      // Placeholder for data fetching logic
      const data = {
        categories: [], // Fetch categories data
        groups: [], // Fetch groups data
        subgroups: [], // Fetch subgroups data
        establishments: [], // Fetch establishments data
        users: [], // Fetch users data
        transactions: [], // Fetch transactions data
      };

      // Convert data to JSON string
      const jsonData = JSON.stringify(data, null, 2);

      // Define file path
      const path = RNFS.DocumentDirectoryPath + '/exported_data.json';

      // Write file
      await RNFS.writeFile(path, jsonData, 'utf8');

      Alert.alert('Success', 'Data exported successfully to ' + path);
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Error', 'Failed to export data.');
    }
  };

  return (
    <PaperProvider>
      <View style={styles.container}>
        <Text style={styles.title}>Configurações de Dados</Text>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#3a7ca5" />
          </View>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={backupData}
          disabled={loading}
        >
          <Icon name="backup" size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Fazer Backup</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={restoreData}
          disabled={loading}
        >
          <Icon name="restore" size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Restaurar Backup</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.exportButton]}
          onPress={exportToCsv}
          disabled={loading}
        >
          <Icon name="description" size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Exportar para CSV</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.resetButton]}
          onPress={resetData}
          disabled={loading}
        >
          <Icon name="delete-forever" size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Resetar Dados</Text>
        </TouchableOpacity>

        <Button mode="contained" onPress={exportData} style={styles.button}>
          Export Data
        </Button>
      </View>
    </PaperProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a7ca5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    justifyContent: 'center',
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  exportButton: {
    backgroundColor: '#4CAF50',
  },
  resetButton: {
    backgroundColor: '#F44336',
    marginTop: 30, // Add some space before the reset button
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});

export default SettingsScreen;