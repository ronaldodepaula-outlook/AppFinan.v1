import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { dataUpdateEvents } from './TransactionScreen'; // Import event bus

const SettingsScreen = () => {
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [databasesToExport, setDatabasesToExport] = useState({
    transactions: true,
    categories: true,
    groups: true,
    subgroups: true,
    establishments: true,
    users: true,
    userData: true
  });

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
      `users_${userEmail}`,
      'userData',
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

      const backupFileName = `financas_backup_completo_${userEmail}_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = FileSystem.documentDirectory + backupFileName;

      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(dataToBackup, null, 2));

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Backup Criado', `Arquivo salvo em: ${fileUri}. Por favor, compartilhe manualmente.`);
        return;
      }

      await Sharing.shareAsync(fileUri);
      Alert.alert('Backup Completo Concluído', 'Todos os dados do aplicativo foram salvos com sucesso.\n\nInclusos:\n- Movimentações\n- Categorias\n- Grupos\n- Subgrupos\n- Estabelecimentos\n- Usuários\n- Dados de Autenticação');

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
      // Buscar TODOS os dados do aplicativo
      const keys = [
        `transactions_${userEmail}`,
        `categories_${userEmail}`,
        `groups_${userEmail}`,
        `subgroups_${userEmail}`,
        `establishments_${userEmail}`,
        `users_${userEmail}`,
        'userData'
      ];

      const storageData = await AsyncStorage.multiGet(keys);

      const transactions = storageData[0][1] ? JSON.parse(storageData[0][1]) : [];
      const categories = storageData[1][1] ? JSON.parse(storageData[1][1]) : [];
      const groups = storageData[2][1] ? JSON.parse(storageData[2][1]) : [];
      const subgroups = storageData[3][1] ? JSON.parse(storageData[3][1]) : [];
      const establishments = storageData[4][1] ? JSON.parse(storageData[4][1]) : [];
      const users = storageData[5][1] ? JSON.parse(storageData[5][1]) : [];
      const userData = storageData[6][1] ? JSON.parse(storageData[6][1]) : {};

      // Criar maps para lookups
      const categoryMap = categories.reduce((map, cat) => {
        map[cat.id] = cat.description || cat.name;
        return map;
      }, {});
      const groupMap = groups.reduce((map, grp) => {
        map[grp.id] = grp.name;
        return map;
      }, {});
      const subgroupMap = subgroups.reduce((map, subgrp) => {
        map[subgrp.id] = subgrp.name;
        return map;
      }, {});
      const establishmentMap = establishments.reduce((map, est) => {
        map[est.id] = est.name;
        return map;
      }, {});

      // Preparar diretório de exportação
      const exportDate = new Date().toISOString().split('T')[0];
      const exportDir = FileSystem.documentDirectory + `appfinan_export_completo_${exportDate}/`;
      
      try {
        const dirInfo = await FileSystem.getInfoAsync(exportDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(exportDir, { intermediates: true });
        }
      } catch (error) {
        console.warn('Erro ao criar diretório:', error);
      }

      const filesToCreate = [];

      // 1. Exportar Movimentações/Transações
      if (transactions && transactions.length > 0) {
        let csvContent = 'Data,Tipo,Frequencia,Valor,Categoria,Grupo,Subgrupo,Estabelecimento,Descricao\n';
        transactions.forEach(tx => {
          const date = new Date(tx.date).toLocaleDateString('pt-BR');
          const type = tx.type === 'income' ? 'Receita' : 'Despesa';
          const frequency = tx.frequency === 'fixed' ? 'Fixa' : 'Variável';
          const amount = tx.amount.toFixed(2).replace('.', ',');
          const categoryName = categoryMap[tx.categoryId] || 'N/A';
          const groupName = groupMap[tx.groupId] || 'N/A';
          const subgroupName = subgroupMap[tx.subgroupId] || 'N/A';
          const establishmentName = establishmentMap[tx.establishmentId] || 'N/A';
          const description = tx.description ? `"${tx.description.replace(/"/g, '""')}"` : '';
          csvContent += `${date},${type},${frequency},${amount},${categoryName},${groupName},${subgroupName},${establishmentName},${description}\n`;
        });
        filesToCreate.push({ name: '01_Movimentacoes.csv', content: csvContent });
      }

      // 2. Exportar Categorias
      if (categories && categories.length > 0) {
        let csvContent = 'ID,Nome,Descrição,Data Criação,Data Atualização\n';
        categories.forEach(cat => {
          const name = cat.name ? `"${cat.name.replace(/"/g, '""')}"` : '';
          const description = cat.description ? `"${cat.description.replace(/"/g, '""')}"` : '';
          const createdAt = cat.createdAt ? new Date(cat.createdAt).toLocaleDateString('pt-BR') : '';
          const updatedAt = cat.updatedAt ? new Date(cat.updatedAt).toLocaleDateString('pt-BR') : '';
          csvContent += `${cat.id},${name},${description},${createdAt},${updatedAt}\n`;
        });
        filesToCreate.push({ name: '02_Categorias.csv', content: csvContent });
      }

      // 3. Exportar Grupos
      if (groups && groups.length > 0) {
        let csvContent = 'ID,Nome,Descrição,Categoria,Data Criação,Data Atualização\n';
        groups.forEach(grp => {
          const name = grp.name ? `"${grp.name.replace(/"/g, '""')}"` : '';
          const description = grp.description ? `"${grp.description.replace(/"/g, '""')}"` : '';
          const categoryName = categoryMap[grp.categoryId] || 'N/A';
          const createdAt = grp.createdAt ? new Date(grp.createdAt).toLocaleDateString('pt-BR') : '';
          const updatedAt = grp.updatedAt ? new Date(grp.updatedAt).toLocaleDateString('pt-BR') : '';
          csvContent += `${grp.id},${name},${description},${categoryName},${createdAt},${updatedAt}\n`;
        });
        filesToCreate.push({ name: '03_Grupos.csv', content: csvContent });
      }

      // 4. Exportar Subgrupos
      if (subgroups && subgroups.length > 0) {
        let csvContent = 'ID,Nome,Descrição,Grupo,Data Criação,Data Atualização\n';
        subgroups.forEach(subgrp => {
          const name = subgrp.name ? `"${subgrp.name.replace(/"/g, '""')}"` : '';
          const description = subgrp.description ? `"${subgrp.description.replace(/"/g, '""')}"` : '';
          const groupName = groupMap[subgrp.groupId] || 'N/A';
          const createdAt = subgrp.createdAt ? new Date(subgrp.createdAt).toLocaleDateString('pt-BR') : '';
          const updatedAt = subgrp.updatedAt ? new Date(subgrp.updatedAt).toLocaleDateString('pt-BR') : '';
          csvContent += `${subgrp.id},${name},${description},${groupName},${createdAt},${updatedAt}\n`;
        });
        filesToCreate.push({ name: '04_Subgrupos.csv', content: csvContent });
      }

      // 5. Exportar Estabelecimentos
      if (establishments && establishments.length > 0) {
        let csvContent = 'ID,Nome,Tipo,Descrição,Data Criação,Data Atualização\n';
        establishments.forEach(est => {
          const name = est.name ? `"${est.name.replace(/"/g, '""')}"` : '';
          const type = est.type || '';
          const description = est.description ? `"${est.description.replace(/"/g, '""')}"` : '';
          const createdAt = est.createdAt ? new Date(est.createdAt).toLocaleDateString('pt-BR') : '';
          const updatedAt = est.updatedAt ? new Date(est.updatedAt).toLocaleDateString('pt-BR') : '';
          csvContent += `${est.id},${name},${type},${description},${createdAt},${updatedAt}\n`;
        });
        filesToCreate.push({ name: '05_Estabelecimentos.csv', content: csvContent });
      }

      // 6. Exportar Usuários
      if (users && users.length > 0) {
        let csvContent = 'ID,Email,Nome,Data Criação\n';
        users.forEach(user => {
          const name = user.name ? `"${user.name.replace(/"/g, '""')}"` : '';
          const email = user.email ? `"${user.email.replace(/"/g, '""')}"` : '';
          const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : '';
          csvContent += `${user.id},${email},${name},${createdAt}\n`;
        });
        filesToCreate.push({ name: '06_Usuarios.csv', content: csvContent });
      }

      // 7. Exportar Dados de Autenticação
      if (userData && Object.keys(userData).length > 0) {
        let jsonContent = JSON.stringify(userData, null, 2);
        filesToCreate.push({ name: '07_Autenticacao.json', content: jsonContent });
      }

      // Criar todos os arquivos
      const filePromises = filesToCreate.map(async (file) => {
        const filePath = exportDir + file.name;
        await FileSystem.writeAsStringAsync(filePath, file.content, { encoding: FileSystem.EncodingType.UTF8 });
        return filePath;
      });

      const filePaths = await Promise.all(filePromises);

      // Criar arquivo README
      const readmeContent = `EXPORTAÇÃO COMPLETA - APPFINAN\n` +
        `==============================\n\n` +
        `Data da Exportação: ${exportDate}\n` +
        `Usuário: ${userEmail}\n\n` +
        `ARQUIVOS EXPORTADOS:\n` +
        `01_Movimentacoes.csv - Todas as transações/movimentações\n` +
        `02_Categorias.csv - Todas as categorias\n` +
        `03_Grupos.csv - Todos os grupos\n` +
        `04_Subgrupos.csv - Todos os subgrupos\n` +
        `05_Estabelecimentos.csv - Todos os estabelecimentos\n` +
        `06_Usuarios.csv - Todos os usuários cadastrados\n` +
        `07_Autenticacao.json - Dados de autenticação/login\n\n` +
        `Estes arquivos podem ser abertos em Excel, Google Sheets ou outro programa de planilhas.`;

      await FileSystem.writeAsStringAsync(exportDir + 'LEIA-ME.txt', readmeContent, { encoding: FileSystem.EncodingType.UTF8 });

      Alert.alert(
        'Exportação Completa Concluída',
        `Todos os dados foram exportados com sucesso!\n\n` +
        `Localização: ${exportDir}\n\n` +
        `Arquivos gerados:\n` +
        `- Movimentações\n` +
        `- Categorias\n` +
        `- Grupos\n` +
        `- Subgrupos\n` +
        `- Estabelecimentos\n` +
        `- Usuários\n` +
        `- Dados de Autenticação`
      );

      // Compartilhar o primeiro arquivo
      if (filePaths.length > 0) {
        await Sharing.shareAsync(filePaths[0], { 
          mimeType: 'text/csv', 
          dialogTitle: 'Exportação Completa AppFinan' 
        });
      }

    } catch (error) {
      console.error('Erro ao exportar para CSV:', error);
      Alert.alert('Erro', 'Falha ao exportar os dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDatabase = (database) => {
    setDatabasesToExport(prev => ({
      ...prev,
      [database]: !prev[database]
    }));
  };

  const openExportModal = () => {
    setExportModalVisible(true);
  };

  const handleExportSelectedDatabases = async () => {
    setExportModalVisible(false);
    
    // Verificar se pelo menos uma base foi selecionada
    const anyDatabaseSelected = Object.values(databasesToExport).some(value => value);
    if (!anyDatabaseSelected) {
      Alert.alert('Aviso', 'Você precisa selecionar pelo menos uma base de dados para exportar.');
      return;
    }
    
    // Iniciar exportação
    await exportSelectedData();
  };

  const exportSelectedData = async () => {
    if (!userEmail) {
      Alert.alert('Erro', 'Não foi possível identificar o usuário para exportar.');
      return;
    }
    
    setLoading(true);
    
    try {
      // Determinar quais bases devem ser exportadas
      const selectedKeys = [];
      if (databasesToExport.transactions) selectedKeys.push(`transactions_${userEmail}`);
      if (databasesToExport.categories) selectedKeys.push(`categories_${userEmail}`);
      if (databasesToExport.groups) selectedKeys.push(`groups_${userEmail}`);
      if (databasesToExport.subgroups) selectedKeys.push(`subgroups_${userEmail}`);
      if (databasesToExport.establishments) selectedKeys.push(`establishments_${userEmail}`);
      if (databasesToExport.users) selectedKeys.push(`users_${userEmail}`);
      if (databasesToExport.userData) selectedKeys.push('userData');
      
      // Obter dados das bases selecionadas
      const storageData = await AsyncStorage.multiGet(selectedKeys);
      
      // Preparar cada conjunto de dados para exportação
      const exportData = {};
      
      // Processar dados de cada tabela
      storageData.forEach(([key, value]) => {
        if (value) {
          const tableName = key.split('_')[0]; // Extrair nome da tabela (transactions, categories, etc.)
          const items = JSON.parse(value);
          
          if (items && items.length > 0) {
            // Obter cabeçalhos das colunas com base no primeiro item
            const headers = Object.keys(items[0]);
            
            // Criar conteúdo CSV
            let csvContent = headers.join(',') + '\n';
            
            // Adicionar linhas de dados
            items.forEach(item => {
              const row = headers.map(header => {
                const cellValue = item[header];
                
                // Formatar valor conforme o tipo de dado
                if (cellValue === null || cellValue === undefined) {
                  return '';
                } else if (typeof cellValue === 'string') {
                  return `"${cellValue.replace(/"/g, '""')}"`; // Escape quotes
                } else if (typeof cellValue === 'object') {
                  return `"${JSON.stringify(cellValue).replace(/"/g, '""')}"`;
                } else {
                  return cellValue;
                }
              }).join(',');
              
              csvContent += row + '\n';
            });
            
            exportData[tableName] = csvContent;
          }
        }
      });
      
      // Verificar se há dados para exportar
      if (Object.keys(exportData).length === 0) {
        Alert.alert('Info', 'Não há dados para exportar nas bases selecionadas.');
        return;
      }
      
      // Criar um arquivo ZIP ou pastas para cada tabela
      const exportDate = new Date().toISOString().split('T')[0];
      const exportDir = FileSystem.documentDirectory + `appfinan_export_${exportDate}/`;
      
      // Criar diretório se não existir
      try {
        const dirInfo = await FileSystem.getInfoAsync(exportDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(exportDir, { intermediates: true });
        }
      } catch (error) {
        console.warn('Erro ao criar diretório:', error);
        // Tentar continuar mesmo com erro
      }
      
      // Criar um arquivo CSV para cada tabela
      const filePromises = Object.entries(exportData).map(async ([tableName, csvContent]) => {
        const filePath = exportDir + `${tableName}.csv`;
        await FileSystem.writeAsStringAsync(filePath, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
        return filePath;
      });
      
      // Esperar a criação de todos os arquivos
      const filePaths = await Promise.all(filePromises);
      
      // Criar um arquivo de índice para facilitar o acesso
      const indexContent = filePaths.map(path => {
        const fileName = path.split('/').pop();
        return `${fileName}`;
      }).join('\n');
      
      await FileSystem.writeAsStringAsync(exportDir + 'README.txt', 
        'Exportação de dados AppFinan\n' +
        `Data: ${exportDate}\n` +
        `Usuário: ${userEmail}\n\n` +
        'Arquivos exportados:\n' + indexContent, 
        { encoding: FileSystem.EncodingType.UTF8 }
      );
      
      // Compartilhar diretório
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Exportação Criada', `Arquivos salvos em: ${exportDir}. Por favor, compartilhe manualmente.`);
        return;
      }
      
      // Como não podemos compartilhar diretamente um diretório, vamos criar um arquivo zip 
      // ou compartilhar o primeiro arquivo e instruir o usuário
      Alert.alert(
        'Exportação Concluída', 
        `Todos os dados foram exportados para ${exportDir}.\n` +
        'Os arquivos estão no formato CSV e podem ser abertos no Excel ou outro programa de planilhas.'
      );
      
      // Compartilhar o primeiro arquivo (geralmente transactions)
      if (filePaths.length > 0) {
        await Sharing.shareAsync(filePaths[0], { 
          mimeType: 'text/csv', 
          dialogTitle: `Exportação - ${filePaths[0].split('/').pop()}` 
        });
      }
      
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      Alert.alert('Erro', 'Falha ao exportar os dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportAllData = async () => {
    // Marcar todas as bases para exportação
    const allDataToExport = {
      transactions: true,
      categories: true,
      groups: true,
      subgroups: true,
      establishments: true,
      users: true,
      userData: true
    };
    setDatabasesToExport(allDataToExport);
    
    // Iniciar exportação diretamente com todos os dados selecionados
    setExportModalVisible(false);
    
    // Usar a função de exportação com todos os dados
    setLoading(true);
    try {
      // Buscar TODOS os dados
      const keys = [
        `transactions_${userEmail}`,
        `categories_${userEmail}`,
        `groups_${userEmail}`,
        `subgroups_${userEmail}`,
        `establishments_${userEmail}`,
        `users_${userEmail}`,
        'userData'
      ];

      const storageData = await AsyncStorage.multiGet(keys);

      const transactions = storageData[0][1] ? JSON.parse(storageData[0][1]) : [];
      const categories = storageData[1][1] ? JSON.parse(storageData[1][1]) : [];
      const groups = storageData[2][1] ? JSON.parse(storageData[2][1]) : [];
      const subgroups = storageData[3][1] ? JSON.parse(storageData[3][1]) : [];
      const establishments = storageData[4][1] ? JSON.parse(storageData[4][1]) : [];
      const users = storageData[5][1] ? JSON.parse(storageData[5][1]) : [];
      const userData = storageData[6][1] ? JSON.parse(storageData[6][1]) : {};

      // Usar a mesma lógica de exportação robusta
      await exportToCsv();
    } catch (error) {
      console.error('Erro ao exportar todos os dados:', error);
      Alert.alert('Erro', 'Falha ao exportar os dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Renderiza o modal de seleção de bases de dados
  const renderExportModal = () => {
    const databaseLabels = {
      transactions: 'Movimentações',
      categories: 'Categorias',
      groups: 'Grupos',
      subgroups: 'Subgrupos',
      establishments: 'Estabelecimentos',
      users: 'Usuários',
      userData: 'Dados de Login/Autenticação'
    };
    
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={exportModalVisible}
        onRequestClose={() => setExportModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecione as bases para exportar</Text>
            
            <ScrollView style={styles.databaseList}>
              {Object.keys(databasesToExport).map(database => (
                <View key={database} style={styles.databaseItem}>
                  <Text style={styles.databaseName}>{databaseLabels[database]}</Text>
                  <Switch
                    value={databasesToExport[database]}
                    onValueChange={() => handleToggleDatabase(database)}
                    trackColor={{ false: '#d3d3d3', true: '#81b0ff' }}
                    thumbColor={databasesToExport[database] ? '#4CAF50' : '#f4f3f4'}
                  />
                </View>
              ))}
            </ScrollView>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setExportModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleExportSelectedDatabases}
              >
                <Text style={styles.modalButtonText}>Exportar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configurações de Dados</Text>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3a7ca5" />
        </View>
      )}

      {renderExportModal()}

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
        style={[styles.button, styles.exportButton, {backgroundColor: '#70a1ff'}]}
        onPress={exportToCsv}
        disabled={loading}
      >
        <Icon name="description" size={20} color="#fff" style={styles.buttonIcon} />
        <Text style={styles.buttonText}>Exportar TODOS os Dados (CSV)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.exportButton]}
        onPress={openExportModal}
        disabled={loading}
      >
        <Icon name="library-books" size={20} color="#fff" style={styles.buttonIcon} />
        <Text style={styles.buttonText}>Exportar Bases Selecionadas</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.resetButton]}
        onPress={resetData}
        disabled={loading}
      >
        <Icon name="delete-forever" size={20} color="#fff" style={styles.buttonIcon} />
        <Text style={styles.buttonText}>Resetar Dados</Text>
      </TouchableOpacity>
    </View>
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
  // Estilos do modal
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  databaseList: {
    width: '100%',
    maxHeight: 300,
  },
  databaseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    width: '100%',
  },
  databaseName: {
    fontSize: 16,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SettingsScreen;