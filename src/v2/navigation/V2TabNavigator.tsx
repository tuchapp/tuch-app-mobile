/**
 * V2 bottom tab navigator — 5 tabs: Home, Goals, Reflect, Coach, You.
 * Wrap in DatabaseProvider + AgentProvider before rendering.
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import GoalsScreen from '../screens/GoalsScreen';
import ReflectScreen from '../screens/ReflectScreen';
import CoachScreen from '../screens/CoachScreen';
import YouScreen from '../screens/YouScreen';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, string> = {
  Home: '🏠',
  Goals: '🎯',
  Reflect: '🌿',
  Coach: '💬',
  You: '👤',
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }} accessibilityElementsHidden>
      {ICONS[name]}
    </Text>
  );
}

export function V2TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#5BA8C4',
        tabBarInactiveTintColor: '#AAA',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#F0F0F0',
          paddingBottom: 4,
          height: 60,
        },
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Goals" component={GoalsScreen} />
      <Tab.Screen name="Reflect" component={ReflectScreen} />
      <Tab.Screen name="Coach" component={CoachScreen} />
      <Tab.Screen name="You" component={YouScreen} />
    </Tab.Navigator>
  );
}
