import { CommonActions, NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { enableScreens } from "react-native-screens";
import { AuthProvider, useAuth } from "./app/context/auth";
import AdminDashboardScreen from "./app/admin/dashboard";
import { AppHeader } from "./app/_layout";
import HomeScreen from "./app/index";
import LoginScreen from "./app/auth/login";
import RegisterScreen from "./app/auth/register";
import { ThemeProvider, useTheme } from "./app/theme";
import { UserTabsNavigator } from "./app/user/_layout";
import Icon from 'react-native-vector-icons/MaterialIcons';

// Ensure vector icon fonts are loaded (fixes missing icons on some platforms)
Icon.loadFont && Icon.loadFont();

enableScreens();

export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  AdminDashboard: undefined;
  UserTabs: undefined;
};

const navigationRef = createNavigationContainerRef<RootStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { colors } = useTheme();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [routeName, setRouteName] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    if (isLoading || !navigationRef.isReady() || !routeName) {
      return;
    }

    const isProtectedRoute = routeName === "AdminDashboard" || routeName === "UserTabs";

    if (isAuthenticated) {
      if (routeName === "Home" || routeName === "Login" || routeName === "Register") {
        navigationRef.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: user?.is_admin ? "AdminDashboard" : "UserTabs" }],
          }),
        );
      }
      return;
    }

    if (isProtectedRoute) {
      navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Login" }],
        }),
      );
    }
  }, [isAuthenticated, isLoading, routeName, user]);

  const screenOptions = useMemo(
    () => ({
      headerShown: true,
      header: () => <AppHeader />,
      contentStyle: { backgroundColor: colors.bg },
    }),
    [colors.bg],
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.bg }]}> 
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        setRouteName(navigationRef.getCurrentRoute()?.name as keyof RootStackParamList | null);
      }}
      onStateChange={() => {
        setRouteName(navigationRef.getCurrentRoute()?.name as keyof RootStackParamList | null);
      }}
    >
      <RootStack.Navigator screenOptions={screenOptions} initialRouteName="Home">
        <RootStack.Screen name="Home" component={HomeScreen} options={{ title: "Home" }} />
        <RootStack.Screen name="Login" component={LoginScreen} options={{ title: "Log In" }} />
        <RootStack.Screen name="Register" component={RegisterScreen} options={{ title: "Register" }} />
        <RootStack.Screen
          name="AdminDashboard"
          component={AdminDashboardScreen}
          options={{ title: "Admin Dashboard" }}
        />
        <RootStack.Screen
          name="UserTabs"
          component={UserTabsNavigator}
          options={{ title: "Dashboard" }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});