import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import CategoriesScreen from './screens/CategoriesScreen';
import GroupScreen from './screens/GroupScreen';
import SubgroupScreen from './screens/SubgroupScreen';
import TransactionScreen from './screens/TransactionScreen';
import EstablishmentScreen from './screens/EstablishmentScreen';
import SettingsScreen from './screens/SettingsScreen';
import CategoryDetailScreen from './screens/CategoryDetailScreen';
import ProfileScreen from './screens/ProfileScreen';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// Componente do menu hamburguer personalizado
const CustomHeader = ({ navigation }) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.menuButton}
        onPress={() => navigation.openDrawer()}
        activeOpacity={0.7}
      >
        <MaterialIcons name="menu" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

// Componente para logout
const LogoutScreen = ({ navigation }) => {
  React.useEffect(() => {
    const performLogout = async () => {
      try {
        // Clear the active session flag
        await AsyncStorage.removeItem('sessionActive'); 
        console.log('Session state cleared.');
      } catch (e) {
        console.error("Failed to clear session state during logout:", e);
      } finally {
        // Always navigate to Login, even if clearing fails
        navigation.replace('Login');
      }
    };

    performLogout();
  }, [navigation]);

  return null;
};

// Componente do Drawer Navigator
const DrawerNavigator = () => {
  return (
    <Drawer.Navigator
      screenOptions={{
        drawerActiveTintColor: '#3a7ca5',
        drawerInactiveTintColor: '#333',
        drawerLabelStyle: { 
          marginLeft: 10,
          fontSize: 14,
        },
      }}
    >
      <Drawer.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Minhas Finanças',
          header: ({ navigation }) => <CustomHeader navigation={navigation} />,
          drawerIcon: ({ color }) => (
            <MaterialIcons name="home" size={22} color={color} />
          ),
        }}
      />
      
      <Drawer.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{
          title: 'Categorias',
          header: ({ navigation }) => <CustomHeader navigation={navigation} />,
          drawerIcon: ({ color }) => (
            <MaterialIcons name="category" size={22} color={color} />
          ),
        }}
      />
      
      <Drawer.Screen
        name="Groups"
        component={GroupScreen}
        options={{
          title: 'Grupos',
          header: ({ navigation }) => <CustomHeader navigation={navigation} />,
          drawerIcon: ({ color }) => (
            <MaterialIcons name="group" size={22} color={color} />
          ),
        }}
      />
      
      <Drawer.Screen
        name="SubGrupo"
        component={SubgroupScreen}
        options={{
          title: 'SubGrupo',
          header: ({ navigation }) => <CustomHeader navigation={navigation} />,
          drawerIcon: ({ color }) => (
            <MaterialIcons name="group" size={22} color={color} />
          ),
        }}
      />
      
      <Drawer.Screen
        name="Estabelecimento"
        component={EstablishmentScreen}
        options={{
          title: 'Estabelecimentos',
          header: ({ navigation }) => <CustomHeader navigation={navigation} />,
          drawerIcon: ({ color }) => (
            <MaterialIcons name="store" size={22} color={color} />
          ),
        }}
      />      
      
      <Drawer.Screen
        name="Movimentacoes"
        component={TransactionScreen}
        options={{
          title: 'Movimentações',
          header: ({ navigation }) => <CustomHeader navigation={navigation} />,
          drawerIcon: ({ color }) => (
            <MaterialIcons name="swap-horiz" size={22} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          title: 'Perfil',
          header: ({ navigation }) => <CustomHeader navigation={navigation} />,
          drawerIcon: ({ color }) => (
            <MaterialIcons name="person" size={22} color={color} />
          ),
        }}
      />
      
      <Drawer.Screen
        name="Configurações"
        component={SettingsScreen}
        options={{
          title: 'Configurações',
          header: ({ navigation }) => <CustomHeader navigation={navigation} />,
          drawerIcon: ({ color }) => (
            <MaterialIcons name="settings" size={22} color={color} />
          ),
        }}
      />
      
      <Drawer.Screen
        name="Sair"
        component={LogoutScreen}
        options={{
          title: 'Sair',
          drawerIcon: ({ color }) => (
            <MaterialIcons name="exit-to-app" size={22} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Splash" screenOptions={{
          headerStyle: {
            backgroundColor: '#3a7ca5',
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerBackTitleVisible: false,
        }}>
          <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Cadastro' }} />
          <Stack.Screen
            name="Main"
            component={DrawerNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="CategoryDetail"
            component={CategoryDetailScreen}
            options={({ route }) => ({ 
              title: route.params?.categoryName || 'Detalhes da Categoria'
            })}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  header: { 
    height: Platform.OS === 'ios' ? 90 : 80,
    backgroundColor: '#3a7ca5',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'ios' ? 35 : 25,
    paddingBottom: 12,
    borderBottomWidth: Platform.OS === 'android' ? 0 : 1, 
    borderBottomColor: 'rgba(0, 0, 0, 0.1)', 
    shadowColor: "#000",
    shadowOffset: {
        width: 0,
        height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    elevation: 5,
  },
  menuButton: {
    padding: 8,
    marginLeft: -8,
    borderRadius: 8,
  },
});