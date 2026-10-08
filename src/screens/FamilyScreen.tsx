import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Avatar, Button, Card, Dialog, Divider, HelperText, Icon, IconButton, Portal, SegmentedButtons, Switch, Text, TextInput } from "react-native-paper";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { DietaryInput, useTavola } from "../context/TavolaContext";
import { useAuth } from "../context/AuthContext";
import { palette } from "../theme/theme";

export function FamilyScreen() {
  const { displayName, family: authFamily, user, signOut } = useAuth();
  const { family, familyLoading, familyError, addFamilyMember, reloadFamily } = useTavola();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [kind, setKind] = useState<DietaryInput["kind"]>("dislike");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const save = async () => {
    if (!name.trim()) return;
    setSaving(true); setSaveError("");
    try {
      await addFamilyMember(name, notes.trim() ? { kind, label: notes } : undefined);
      setName(""); setNotes(""); setKind("dislike"); setDialogOpen(false);
    } catch (error) {
      setSaveError(error && typeof error === "object" && "message" in error ? String(error.message) : "Impossibile aggiungere il familiare.");
    } finally { setSaving(false); }
  };

  return (
    <Screen>
      <Text variant="bodyMedium" style={styles.helper}>Preferenze e intolleranze guidano ogni suggerimento.</Text>
      <Card mode="contained" style={styles.account}><Card.Content style={styles.row}><View style={styles.accountIcon}><Icon source="account-circle-outline" size={28} color={palette.forest} /></View><View style={styles.flex}><Text variant="labelSmall" style={styles.accountLabel}>{authFamily?.name?.toUpperCase() || "ACCOUNT FAMIGLIA"}</Text><Text variant="titleSmall" style={styles.accountName}>{displayName} · {user?.email}</Text></View><View style={styles.active}><Text style={styles.activeText}>Attivo</Text></View></Card.Content></Card>
      <Card mode="outlined" style={styles.familyCard}>
        {familyLoading ? <View style={styles.loading}><ActivityIndicator color={palette.terracotta} /><Text style={styles.loadingText}>Carico i componenti…</Text></View> : null}
        {!familyLoading && familyError ? <View style={styles.loading}><Text style={styles.error}>{familyError}</Text><Button onPress={reloadFamily}>Riprova</Button></View> : null}
        {!familyLoading && !familyError && family.length === 0 ? <View style={styles.loading}><Text style={styles.role}>Nessun componente ancora inserito.</Text></View> : null}
        {family.map((person, index) => <View key={person.id}><Card.Content style={styles.person}><Avatar.Text size={50} label={person.avatar} style={{ backgroundColor: person.color }} /><View style={styles.personCopy}><Text variant="titleMedium" style={styles.personName}>{person.name}</Text><Text variant="labelSmall" style={styles.role}>{person.role}</Text><View style={styles.note}><Text style={styles.noteText}>{person.notes}</Text></View></View><IconButton icon="pencil-outline" iconColor="#75847E" /></Card.Content>{index < family.length - 1 ? <Divider /> : null}</View>)}
      </Card>
      <Button mode="contained" icon="account-plus-outline" contentStyle={styles.button} onPress={() => setDialogOpen(true)}>Aggiungi un familiare</Button>
      <View style={styles.rules}><SectionHeader title="Regole di casa" /></View>
      <Card mode="outlined" style={styles.settings}>
        <Card.Content style={styles.settingRow}><View style={styles.settingIcon}><Icon source="shield-check-outline" size={21} color={palette.forest} /></View><View style={styles.flex}><Text variant="titleSmall" style={styles.personName}>Protezione allergie</Text><Text variant="bodySmall" style={styles.role}>Esclude sempre gli ingredienti non sicuri</Text></View><Switch value /></Card.Content>
        <Divider />
        <Card.Content style={styles.settingRow}><View style={styles.settingIcon}><Icon source="clock-outline" size={21} color={palette.forest} /></View><View style={styles.flex}><Text variant="titleSmall" style={styles.personName}>Ricette nei feriali</Text><Text variant="bodySmall" style={styles.role}>Massimo 35 minuti</Text></View></Card.Content>
      </Card>
      <Button mode="outlined" icon="logout" textColor={palette.muted} style={styles.logout} onPress={signOut}>Esci dall’account</Button>
      <Portal><Dialog visible={dialogOpen} onDismiss={() => !saving && setDialogOpen(false)} style={styles.dialog}><Dialog.Title>Nuovo familiare</Dialog.Title><Dialog.Content><Text variant="bodyMedium" style={styles.dialogText}>Aggiungi il nome e, se vuoi, una prima indicazione alimentare.</Text><TextInput mode="outlined" label="Nome" value={name} onChangeText={setName} style={styles.field} /><SegmentedButtons value={kind} onValueChange={(value) => setKind(value as DietaryInput["kind"])} buttons={[{ value: "dislike", label: "Non piace" }, { value: "intolerance", label: "Intolleranza" }, { value: "allergy", label: "Allergia" }]} style={styles.field} /><TextInput mode="outlined" label={kind === "dislike" ? "Alimento non gradito" : kind === "allergy" ? "Allergene" : "Alimento non tollerato"} value={notes} onChangeText={setNotes} /><HelperText type="error" visible={Boolean(saveError)}>{saveError}</HelperText></Dialog.Content><Dialog.Actions><Button onPress={() => setDialogOpen(false)} disabled={saving}>Annulla</Button><Button mode="contained" disabled={!name.trim() || saving} loading={saving} onPress={save}>Salva</Button></Dialog.Actions></Dialog></Portal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  helper: { color: palette.muted, lineHeight: 22, marginBottom: 18 }, row: { flexDirection: "row", alignItems: "center" }, flex: { flex: 1 }, account: { backgroundColor: "#E5F5F5", borderRadius: 6, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: palette.terracotta }, accountIcon: { width: 43, height: 43, borderRadius: 5, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", marginRight: 11 }, accountLabel: { color: palette.terracotta, fontWeight: "800", letterSpacing: 1 }, accountName: { color: palette.forest, fontWeight: "800", marginTop: 3 }, active: { backgroundColor: "#FFFFFF", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 3 }, activeText: { color: palette.forest, fontSize: 10, fontWeight: "800" },
  familyCard: { borderRadius: 6, borderColor: palette.line, backgroundColor: palette.paper, marginBottom: 15, overflow: "hidden" }, loading: { alignItems: "center", justifyContent: "center", minHeight: 110, padding: 18 }, loadingText: { color: palette.muted, marginTop: 10 }, error: { color: "#B42318", textAlign: "center", marginBottom: 8 }, person: { flexDirection: "row", alignItems: "center", paddingVertical: 15 }, personCopy: { flex: 1, marginLeft: 13 }, personName: { color: palette.ink, fontWeight: "800" }, role: { color: palette.muted, marginTop: 2 }, note: { alignSelf: "flex-start", backgroundColor: "#F1F3F5", borderRadius: 3, paddingHorizontal: 8, paddingVertical: 4, marginTop: 7 }, noteText: { color: palette.muted, fontSize: 10, fontWeight: "700" }, button: { height: 50 }, rules: { marginTop: 26 }, settings: { borderRadius: 6, borderColor: palette.line, backgroundColor: palette.paper }, settingRow: { minHeight: 75, flexDirection: "row", alignItems: "center" }, settingIcon: { width: 39, height: 39, borderRadius: 5, backgroundColor: "#E5F5F5", alignItems: "center", justifyContent: "center", marginRight: 11 }, logout: { marginTop: 22, borderColor: palette.line }, dialog: { backgroundColor: palette.cream, borderRadius: 8 }, dialogText: { color: palette.muted, marginBottom: 16 }, field: { marginBottom: 14 },
});
