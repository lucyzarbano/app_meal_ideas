import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, HelperText, Icon, Surface, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { palette } from '../theme/theme';
import { getErrorMessage } from '../lib/errors';

export function FamilyOnboardingScreen() {
  const { createFamily, displayName, signOut } = useAuth();
  const [familyName, setFamilyName] = useState('Famiglia');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!familyName.trim()) return setError('Scegli un nome per la famiglia.');
    setBusy(true);
    setError('');
    try {
      await createFamily(familyName);
    } catch (caught) {
      setError(getErrorMessage(caught, 'Non è stato possibile creare la famiglia.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.mark}><Icon source="account-group-outline" size={32} color="#FFFFFF" /></View>
        <Text variant="headlineLarge" style={styles.title}>Ciao {displayName || '!'}</Text>
        <Text variant="bodyLarge" style={styles.subtitle}>Creiamo lo spazio privato in cui raccogliere persone, preferenze e menu.</Text>
        <Surface mode="flat" style={styles.panel}>
          <Text variant="labelLarge" style={styles.label}>NOME DELLA FAMIGLIA</Text>
          <TextInput mode="outlined" label="Ad esempio: Famiglia Rossi" value={familyName} onChangeText={setFamilyName} autoCapitalize="words" style={styles.input} />
          {error ? <HelperText type="error" visible>{error}</HelperText> : null}
          <Button mode="contained" onPress={submit} loading={busy} disabled={busy} contentStyle={styles.button}>Continua</Button>
        </Surface>
        <Button mode="text" onPress={signOut} disabled={busy} textColor={palette.muted}>Esci dall’account</Button>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.paper }, content: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', justifyContent: 'center', padding: 24 }, mark: { width: 58, height: 58, borderRadius: 6, backgroundColor: palette.terracotta, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }, title: { color: palette.forest, fontWeight: '800', letterSpacing: -0.8 }, subtitle: { color: palette.muted, lineHeight: 25, marginTop: 10, marginBottom: 28 }, panel: { padding: 18, backgroundColor: palette.cream, borderWidth: 1, borderColor: palette.line, borderRadius: 8, marginBottom: 10 }, label: { color: palette.terracotta, letterSpacing: 1, fontSize: 11, fontWeight: '800', marginBottom: 10 }, input: { backgroundColor: palette.paper }, button: { minHeight: 52 },
});
