import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GuardiansScreen } from '../screens/GuardiansScreen';
import { SoundGuardScreen } from '../screens/SoundGuardScreen';
import { colors } from '../theme/colors';
import { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

function TabLabel({
  label,
  focused,
}: {
  label: string;
  focused: boolean;
}) {
  return (
    <Text
      style={{
        color: focused ? colors.brand : colors.inkDim,
        fontFamily: focused ? 'DMSans_600SemiBold' : 'DMSans_500Medium',
        fontSize: 12,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        marginBottom: 2,
      }}
    >
      {label}
    </Text>
  );
}

export function RootTabs() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          height: 52 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.inkDim,
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
        tabBarLabelPosition: 'below-icon',
      }}
    >
      <Tab.Screen
        name="SoundGuard"
        component={SoundGuardScreen}
        options={{
          title: 'Guard',
          tabBarLabel: ({ focused }) => <TabLabel label="Guard" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Guardians"
        component={GuardiansScreen}
        options={{
          title: 'Guardians',
          tabBarLabel: ({ focused }) => (
            <TabLabel label="Guardians" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
