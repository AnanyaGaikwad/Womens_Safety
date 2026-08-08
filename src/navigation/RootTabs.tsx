import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GuardiansScreen } from '../screens/GuardiansScreen';
import { SoundGuardScreen } from '../screens/SoundGuardScreen';
import { colors } from '../theme/colors';

export type RootTabParamList = {
  SoundGuard: undefined;
  Guardians: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

/** Content height above the home-indicator inset. */
const TAB_BAR_CONTENT_HEIGHT = 56;

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
          height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
          paddingTop: 10,
          paddingBottom: bottomInset,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.inkDim,
        tabBarIcon: () => null,
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
