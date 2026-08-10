import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DeliveryBannerStack } from '../components/DeliveryBannerStack';
import { SoundGuardProvider } from '../hooks/SoundGuardContext';
import { AlertHistoryScreen } from '../screens/AlertHistoryScreen';
import { EmergencyAlertScreen } from '../screens/EmergencyAlertScreen';
import { GuardianAlertScreen } from '../screens/GuardianAlertScreen';
import { MyQrCodeScreen } from '../screens/MyQrCodeScreen';
import { PairGuardianScreen } from '../screens/PairGuardianScreen';
import { RootTabs } from './RootTabs';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <SoundGuardProvider>
      <View style={{ flex: 1 }}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={RootTabs} />
          <Stack.Screen
            name="EmergencyAlert"
            component={EmergencyAlertScreen}
            options={{ animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen
            name="GuardianAlert"
            component={GuardianAlertScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="AlertHistory"
            component={AlertHistoryScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="MyQrCode"
            component={MyQrCodeScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="PairGuardian"
            component={PairGuardianScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </Stack.Navigator>
        <DeliveryBannerStack />
      </View>
    </SoundGuardProvider>
  );
}
