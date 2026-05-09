import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, Text, View } from "react-native";
import DashboardScreen from "./dashboard";
import LogScreen from "./log";
import LeaderboardScreen from "./leaderboard";
import ProfileScreen from "./profile";
import { useTheme } from "../theme";
import Icon from 'react-native-vector-icons/MaterialIcons';

export type UserTabParamList = {
  Dashboard: undefined;
  Log: undefined;
  Leaderboard: undefined;
  Profile: undefined;
};

const Tabs = createBottomTabNavigator<UserTabParamList>();

export function UserTabsNavigator() {
  const { colors } = useTheme();
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 16,
          paddingTop: 8,
          marginBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="insert-chart" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="Log"
        component={LogScreen}
        options={{
          title: "Log",
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="edit" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          title: "Leaderboard",
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="emoji-events" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <TabIcon icon="person" color={color} size={size} />
          ),
        }}
      />
    </Tabs.Navigator>
  );
}

function TabIcon({ icon, color, size = 22 }: { icon: string; color: string; size?: number }) {
  return (
    <View style={styles.iconContainer}>
      <Icon name={icon} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 22,
  },
});
