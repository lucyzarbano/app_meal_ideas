import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { palette } from '../theme/theme';
import { TavolaProvider } from '../context/TavolaContext';
import { AuthScreen } from '../screens/AuthScreen';
import { FamilyOnboardingScreen } from '../screens/FamilyOnboardingScreen';
import { AppShell } from './AppShell';

export function AppGate() {
  const { session, family, loading, familyLoading } = useAuth();

  if (loading || (session && familyLoading)) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={palette.terracotta} /><Text style={styles.loadingText}>Prepariamo la tua tavola…</Text></View>;
  }
  if (!session) return <AuthScreen />;
  if (!family) return <FamilyOnboardingScreen />;

  return <TavolaProvider><AppShell /></TavolaProvider>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.paper }, loadingText: { color: palette.muted, marginTop: 14 },
});
