import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet } from "react-native";

export function Screen({ children }: PropsWithChildren) {
  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">{children}</ScrollView>;
}
const styles = StyleSheet.create({ content: { paddingHorizontal: 20, paddingBottom: 120, backgroundColor: "#FFFFFF" } });
