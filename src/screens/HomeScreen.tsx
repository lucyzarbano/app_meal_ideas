import { Alert, Image, StyleSheet, View } from "react-native";
import { Button, Card, Icon, IconButton, Surface, Switch, Text, TouchableRipple } from "react-native-paper";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { useTavola } from "../context/TavolaContext";
import { palette } from "../theme/theme";

export function HomeScreen({ onOpenWeek, onOpenIdeas }: { onOpenWeek: () => void; onOpenIdeas: () => void }) {
  const { family, reminder, updateReminder } = useTavola();
  return (
    <Screen>
      <View style={styles.weekStrip}>
        {[{ l: "L", n: "12" }, { l: "M", n: "13" }, { l: "M", n: "14" }, { l: "G", n: "15" }, { l: "V", n: "16" }, { l: "S", n: "17" }, { l: "D", n: "18" }].map((day, index) => (
          <View key={`${day.l}-${day.n}`} style={[styles.weekDay, index === 0 && styles.weekDayActive]}><Text style={[styles.weekLabel, index === 0 && styles.weekLabelActive]}>{day.l}</Text><Text style={[styles.weekNumber, index === 0 && styles.weekNumberActive]}>{day.n}</Text></View>
        ))}
      </View>
      <Card mode="outlined" style={styles.hero}>
        <View style={styles.heroVisual}>
          <Image source={require("../../assets/meals/pasta-pesto.png")} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.pill}><Text style={styles.pillText}>CENA · 20:00</Text></View>
          <IconButton icon="dots-horizontal" size={21} iconColor={palette.forest} style={styles.more} />
        </View>
        <Card.Content style={styles.heroContent}>
          <Text variant="headlineSmall" style={styles.heroTitle}>Pasta al pesto</Text><Text variant="bodyMedium" style={styles.muted}>25 min  ·  Facile</Text>
          <View style={styles.familyRow}>{family.slice(0, 3).map((person) => <View key={person.id} style={[styles.miniAvatar, { backgroundColor: person.color }]}><Text style={styles.miniText}>{person.avatar}</Text></View>)}<Text style={styles.safeText}>  Adatta a tutti</Text></View>
          <Button mode="contained" buttonColor={palette.terracotta} icon="silverware-fork-knife" contentStyle={styles.buttonHeight} style={styles.heroButton} onPress={() => Alert.alert("Buon appetito!", "La ricetta è pronta per essere seguita.")}>Apri la ricetta</Button>
        </Card.Content>
      </Card>
      <View style={styles.sectionRow}><SectionHeader title="Domani" /><Button compact onPress={onOpenWeek} textColor={palette.terracotta}>Vedi settimana</Button></View>
      <Card mode="outlined" style={styles.card}><Card.Content style={styles.row}><Image source={require("../../assets/meals/pollo-verdure.png")} style={styles.mealImage} /><View style={styles.flex}><Text variant="titleSmall" style={styles.bold}>Pollo e verdure al forno</Text><Text variant="bodySmall" style={styles.muted}>Ricordati di scongelare il pollo</Text></View><Icon source="check-circle" color={palette.forest} size={26} /></Card.Content></Card>
      <Surface style={styles.reminder} elevation={0}><View style={styles.reminderIcon}><Icon source="bell" size={20} color={palette.terracotta} /></View><View style={styles.flex}><Text variant="titleSmall" style={styles.reminderTitle}>Promemoria della sera</Text><Text variant="bodySmall" style={styles.reminderText}>Alle 20:30 ti ricordo cosa preparare per domani.</Text></View><Switch value={reminder} onValueChange={updateReminder} color={palette.terracotta} /></Surface>
      <TouchableRipple onPress={onOpenIdeas} style={styles.idea} borderless><View style={styles.ideaRow}><View style={styles.ideaIcon}><Icon source="creation" size={22} color="#FFF" /></View><View style={styles.flex}><Text style={styles.ideaOverline}>HAI INGREDIENTI DA USARE?</Text><Text variant="titleMedium" style={styles.ideaTitle}>Troviamo una ricetta insieme</Text></View><Icon source="chevron-right" size={22} color={palette.muted} /></View></TouchableRipple>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, weekStrip: { flexDirection: "row", justifyContent: "space-between", borderWidth: 1, borderColor: palette.line, borderRadius: 7, padding: 7, marginBottom: 14, backgroundColor: palette.paper }, weekDay: { width: 38, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 5 }, weekDayActive: { backgroundColor: palette.terracotta }, weekLabel: { color: palette.muted, fontSize: 10, fontWeight: "700" }, weekLabelActive: { color: "#FFFFFF" }, weekNumber: { color: palette.forest, fontSize: 13, fontWeight: "700", marginTop: 3 }, weekNumberActive: { color: "#FFFFFF" },
  hero: { backgroundColor: palette.paper, borderRadius: 8, marginBottom: 24, borderColor: palette.line, overflow: "hidden" }, heroVisual: { height: 190, backgroundColor: "#EAF7F7" }, heroImage: { width: "100%", height: "100%" }, heroContent: { paddingTop: 16 }, pill: { position: "absolute", left: 14, top: 14, backgroundColor: palette.terracotta, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 3 }, pillText: { color: "#FFF", fontSize: 10, fontWeight: "800", letterSpacing: 1 }, more: { position: "absolute", right: 5, top: 3, backgroundColor: "rgba(255,255,255,0.88)" },
  heroTitle: { color: palette.forest, fontWeight: "700" }, muted: { color: palette.muted, marginTop: 3 }, heroButton: { marginTop: 16 },
  familyRow: { flexDirection: "row", alignItems: "center", marginTop: 12 }, miniAvatar: { width: 23, height: 23, borderRadius: 5, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#EAF7F7", marginRight: -5 }, miniText: { color: "#FFF", fontSize: 9, fontWeight: "800" }, safeText: { color: palette.forest, fontSize: 12, fontWeight: "700" }, buttonHeight: { height: 50 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }, card: { borderColor: palette.line, borderRadius: 6, backgroundColor: palette.paper, marginBottom: 12 }, row: { flexDirection: "row", alignItems: "center" }, mealImage: { width: 58, height: 58, borderRadius: 5, marginRight: 13 }, bold: { fontWeight: "800", color: palette.ink },
  reminder: { flexDirection: "row", alignItems: "center", borderRadius: 6, backgroundColor: palette.apricot, padding: 14, marginBottom: 22 }, reminderIcon: { width: 39, height: 39, borderRadius: 6, backgroundColor: "#CDEBEC", alignItems: "center", justifyContent: "center", marginRight: 11 }, reminderTitle: { color: palette.forest, fontWeight: "800" }, reminderText: { color: palette.muted, paddingRight: 8, marginTop: 2 },
  idea: { backgroundColor: palette.paper, borderRadius: 6, borderWidth: 1, borderColor: palette.line }, ideaRow: { minHeight: 88, padding: 15, flexDirection: "row", gap: 13, alignItems: "center" }, ideaOverline: { color: palette.terracotta, fontSize: 10, fontWeight: "800", letterSpacing: 1 }, ideaTitle: { color: palette.forest, fontWeight: "700", marginTop: 5 }, ideaIcon: { width: 44, height: 44, borderRadius: 6, backgroundColor: palette.terracotta, alignItems: "center", justifyContent: "center" },
});
