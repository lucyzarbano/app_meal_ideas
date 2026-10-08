import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Icon, Surface, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { palette } from '../theme/theme';
import { getErrorMessage } from '../lib/errors';

function authMessage(error: unknown) {
  const message = getErrorMessage(error);
  if (message.toLowerCase().includes('invalid login')) return 'Email o password non corrette.';
  if (message.toLowerCase().includes('already registered')) return 'Questa email è già registrata.';
  return message;
}

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [registering, setRegistering] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async () => {
    setError('');
    setNotice('');
    if (registering && !name.trim()) return setError('Inserisci il tuo nome.');
    if (!email.includes('@')) return setError('Inserisci un indirizzo email valido.');
    if (password.length < 6) return setError('La password deve contenere almeno 6 caratteri.');

    setBusy(true);
    try {
      if (registering) {
        const confirmationRequired = await signUp(name, email, password);
        if (confirmationRequired) setNotice('Controlla la tua email e conferma la registrazione, poi torna qui per accedere.');
      } else {
        await signIn(email, password);
      }
    } catch (caught) {
      setError(authMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const changeMode = () => {
    setRegistering((value) => !value);
    setError('');
    setNotice('');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.mark}><Icon source="silverware-fork-knife" size={28} color="#FFFFFF" /></View>
            <Text style={styles.brandName}>TAVOLA</Text>
          </View>
          <Text variant="displaySmall" style={styles.title}>{registering ? 'Inizia dalla tua famiglia' : 'Bentornata a tavola'}</Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            {registering ? 'Menu più semplici, personali e bilanciati per tutta la famiglia.' : 'Accedi per ritrovare menu, preferenze e ricette.'}
          </Text>

          <Surface mode="flat" style={styles.panel}>
            {registering ? <TextInput mode="outlined" label="Il tuo nome" value={name} onChangeText={setName} autoCapitalize="words" style={styles.field} /> : null}
            <TextInput mode="outlined" label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" style={styles.field} />
            <TextInput mode="outlined" label="Password" value={password} onChangeText={setPassword} secureTextEntry={secure} autoComplete={registering ? 'new-password' : 'current-password'} right={<TextInput.Icon icon={secure ? 'eye-outline' : 'eye-off-outline'} onPress={() => setSecure((value) => !value)} />} />
            {error ? <HelperText type="error" visible>{error}</HelperText> : null}
            {notice ? <View style={styles.notice}><Icon source="email-check-outline" size={22} color={palette.terracotta} /><Text style={styles.noticeText}>{notice}</Text></View> : null}
            <Button mode="contained" onPress={submit} loading={busy} disabled={busy} contentStyle={styles.primaryButton} style={styles.button}>
              {registering ? 'Crea il mio account' : 'Accedi'}
            </Button>
            <Button mode="text" onPress={changeMode} disabled={busy} textColor={palette.terracotta}>
              {registering ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
            </Button>
          </Surface>
          <Text style={styles.privacy}>I dati della tua famiglia sono privati e protetti dalle regole di accesso del database.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.paper }, flex: { flex: 1 }, content: { flexGrow: 1, width: '100%', maxWidth: 520, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 36 },
  brand: { flexDirection: 'row', alignItems: 'center', marginBottom: 34 }, mark: { width: 48, height: 48, backgroundColor: palette.terracotta, alignItems: 'center', justifyContent: 'center', borderRadius: 6 }, brandName: { color: palette.forest, fontSize: 15, fontWeight: '900', letterSpacing: 2, marginLeft: 12 },
  title: { color: palette.forest, fontWeight: '800', letterSpacing: -1.2, lineHeight: 43 }, subtitle: { color: palette.muted, lineHeight: 25, marginTop: 12, marginBottom: 28 }, panel: { backgroundColor: palette.cream, borderWidth: 1, borderColor: palette.line, borderRadius: 8, padding: 18 }, field: { marginBottom: 14, backgroundColor: palette.paper }, button: { borderRadius: 4, marginTop: 18 }, primaryButton: { minHeight: 52 }, notice: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: palette.sage, padding: 12, borderRadius: 4, marginTop: 14 }, noticeText: { flex: 1, color: palette.forest, marginLeft: 9, lineHeight: 20 }, privacy: { color: palette.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 22, paddingHorizontal: 12 },
});
