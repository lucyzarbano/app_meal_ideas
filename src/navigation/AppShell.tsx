import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Appbar, Avatar, BottomNavigation, Icon } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { FamilyScreen } from "../screens/FamilyScreen";
import { useAuth } from "../context/AuthContext";
import { HomeScreen } from "../screens/HomeScreen";
import { IdeasScreen } from "../screens/IdeasScreen";
import { WeekScreen } from "../screens/WeekScreen";
import { palette } from "../theme/theme";
import { TabKey } from "../types";

const routes = [
  { key: "oggi" as TabKey, title: "Oggi", icon: "home" },
  { key: "settimana" as TabKey, title: "Settimana", icon: "calendar-month" },
  { key: "idee" as TabKey, title: "Idee", icon: "creation" },
  { key: "famiglia" as TabKey, title: "Famiglia", icon: "account-group" },
];

const titles: Record<TabKey, { overline: string; title: string }> = {
  oggi: { overline: "IL MENU DI OGGI", title: "Ciao" },
  settimana: { overline: "TAVOLA", title: "La settimana" },
  idee: { overline: "TAVOLA", title: "Cosa cuciniamo?" },
  famiglia: { overline: "TAVOLA", title: "La tua famiglia" },
};

export function AppShell() {
  const { displayName } = useAuth();
  const [index, setIndex] = useState(0);
  const active = routes[index]!;
  const tab = active.key;
  const heading = titles[tab];
  const title = tab === "oggi" ? `Ciao, ${displayName || "a tavola"}` : heading.title;
  const avatarLabel = (displayName || "T").charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.app}>
        <Appbar.Header style={styles.header} elevated={false}>
          <Appbar.Content title={title} titleStyle={styles.title} subtitle={heading.overline} subtitleStyle={styles.overline} />
          <Avatar.Text size={44} label={avatarLabel} style={styles.avatar} labelStyle={styles.avatarLabel} onTouchEnd={() => setIndex(3)} />
        </Appbar.Header>
        <View style={styles.body}>
          {tab === "oggi" && <HomeScreen onOpenWeek={() => setIndex(1)} onOpenIdeas={() => setIndex(2)} />}
          {tab === "settimana" && <WeekScreen onOpenIdeas={() => setIndex(2)} />}
          {tab === "idee" && <IdeasScreen />}
          {tab === "famiglia" && <FamilyScreen />}
        </View>
        <BottomNavigation.Bar
          navigationState={{ index, routes }}
          onTabPress={({ route }) => setIndex(routes.findIndex((item) => item.key === route.key))}
          renderIcon={({ route, color }) => <Icon source={route.icon} color={color} size={22} />}
          getLabelText={({ route }) => route.title}
          activeColor="#FFFFFF"
          inactiveColor="#BFE8E8"
          activeIndicatorStyle={styles.indicator}
          style={styles.nav}
          safeAreaInsets={{ bottom: 8 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.paper }, app: { flex: 1, width: "100%", maxWidth: 640, alignSelf: "center", backgroundColor: palette.paper }, body: { flex: 1 },
  header: { height: 84, backgroundColor: palette.paper, paddingHorizontal: 10 }, overline: { color: palette.terracotta, fontSize: 10, fontWeight: "700", letterSpacing: 1.2, marginBottom: 2 },
  title: { color: palette.forest, fontSize: 27, fontWeight: "700", letterSpacing: -0.6 }, avatar: { backgroundColor: palette.forest, marginRight: 10 }, avatarLabel: { fontSize: 16, fontWeight: "700" },
  nav: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: palette.terracotta, borderTopWidth: 0 }, indicator: { backgroundColor: "#007575" },
});
