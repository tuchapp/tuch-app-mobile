import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

// Tab screens
import { DashboardScreen } from "../screens/DashboardScreen";
import { GoalsScreen } from "../screens/GoalsScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { JournalScreen } from "../screens/JournalScreen";
import { MoreScreen } from "../screens/MoreScreen";

// Goals stack screens
import { GoalDetailScreen } from "../screens/GoalDetailScreen";
import { GoalEditScreen } from "../screens/GoalEditScreen";
import { GoalUpdateScreen } from "../screens/GoalUpdateScreen";
import { CheckInHistoryScreen } from "../screens/CheckInHistoryScreen";

// More stack screens
import { MoodsScreen } from "../screens/MoodsScreen";
import { HabitsScreen } from "../screens/HabitsScreen";
import { ExercisesScreen } from "../screens/ExercisesScreen";
import { ReflectionsScreen } from "../screens/ReflectionsScreen";
import { ReviewsScreen } from "../screens/ReviewsScreen";
import { MemoryScreen } from "../screens/MemoryScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { PricingScreen } from "../screens/PricingScreen";
import { PrivacyScreen } from "../screens/PrivacyScreen";
import { HelpScreen } from "../screens/HelpScreen";
import { TermsScreen } from "../screens/TermsScreen";
import { SuccessScreen } from "../screens/SuccessScreen";
import { AccountDeletedScreen } from "../screens/AccountDeletedScreen";

// ---------- Param lists ----------

export type GoalsStackParamList = {
  GoalsList: undefined;
  GoalDetail: { goalId: string };
  GoalEdit: { goalId: string };
  GoalUpdate: { goalId: string };
  CheckInHistory: undefined;
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Moods: undefined;
  Habits: undefined;
  Exercises: undefined;
  Reflections: undefined;
  Reviews: undefined;
  Memory: undefined;
  Profile: undefined;
  Settings: undefined;
  Notifications: undefined;
  Pricing: undefined;
  Privacy: undefined;
  Help: undefined;
  Terms: undefined;
  Success: undefined;
  AccountDeleted: undefined;
};

export type MainTabsParamList = {
  DashboardTab: undefined;
  GoalsTab: undefined;
  ChatTab: undefined;
  JournalTab: undefined;
  MoreTab: undefined;
};

// ---------- Goals Stack ----------

const GoalsStack = createNativeStackNavigator<GoalsStackParamList>();

function GoalsStackNavigator() {
  return (
    <GoalsStack.Navigator>
      <GoalsStack.Screen
        name="GoalsList"
        component={GoalsScreen}
        options={{ title: "Goals" }}
      />
      <GoalsStack.Screen
        name="GoalDetail"
        component={GoalDetailScreen}
        options={{ title: "Goal" }}
      />
      <GoalsStack.Screen
        name="GoalEdit"
        component={GoalEditScreen}
        options={{ title: "Edit Goal" }}
      />
      <GoalsStack.Screen
        name="GoalUpdate"
        component={GoalUpdateScreen}
        options={{ title: "Update Progress" }}
      />
      <GoalsStack.Screen
        name="CheckInHistory"
        component={CheckInHistoryScreen}
        options={{ title: "Check-in History" }}
      />
    </GoalsStack.Navigator>
  );
}

// ---------- More Stack ----------

const MoreStack = createNativeStackNavigator<MoreStackParamList>();

function MoreStackNavigator() {
  return (
    <MoreStack.Navigator>
      <MoreStack.Screen
        name="MoreMenu"
        component={MoreScreen}
        options={{ title: "More" }}
      />
      <MoreStack.Screen name="Moods" component={MoodsScreen} />
      <MoreStack.Screen name="Habits" component={HabitsScreen} />
      <MoreStack.Screen name="Exercises" component={ExercisesScreen} />
      <MoreStack.Screen name="Reflections" component={ReflectionsScreen} />
      <MoreStack.Screen name="Reviews" component={ReviewsScreen} />
      <MoreStack.Screen name="Memory" component={MemoryScreen} />
      <MoreStack.Screen name="Profile" component={ProfileScreen} />
      <MoreStack.Screen name="Settings" component={SettingsScreen} />
      <MoreStack.Screen name="Notifications" component={NotificationsScreen} />
      <MoreStack.Screen name="Pricing" component={PricingScreen} />
      <MoreStack.Screen name="Privacy" component={PrivacyScreen} />
      <MoreStack.Screen name="Help" component={HelpScreen} />
      <MoreStack.Screen name="Terms" component={TermsScreen} />
      <MoreStack.Screen name="Success" component={SuccessScreen} />
      <MoreStack.Screen
        name="AccountDeleted"
        component={AccountDeletedScreen}
        options={{ title: "Account Deleted" }}
      />
    </MoreStack.Navigator>
  );
}

// ---------- Main Tabs ----------

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#7e22ce",
        tabBarInactiveTintColor: "#9ca3af",
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="GoalsTab"
        component={GoalsStackNavigator}
        options={{
          title: "Goals",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "flag" : "flag-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatScreen}
        options={{
          title: "Coach",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "chatbubble" : "chatbubble-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="JournalTab"
        component={JournalScreen}
        options={{
          title: "Journal",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "book" : "book-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreStackNavigator}
        options={{
          title: "More",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "ellipsis-horizontal-circle" : "ellipsis-horizontal"} size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
