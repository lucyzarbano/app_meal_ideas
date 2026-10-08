import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { palette } from "../theme/theme";

export function SectionHeader({ title, meta }: { title: string; meta?: string }) {
  return <View style={styles.row}><Text variant="titleLarge" style={styles.title}>{title}</Text>{meta ? <Text variant="labelSmall" style={styles.meta}>{meta}</Text> : null}</View>;
}
const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }, title: { color: palette.forest, fontWeight: "800", letterSpacing: -0.4 }, meta: { color: palette.terracotta, fontWeight: "800", letterSpacing: 1 } });
