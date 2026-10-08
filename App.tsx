import { StatusBar } from "expo-status-bar";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { AppGate } from "./src/navigation/AppGate";
import { tavolaTheme } from "./src/theme/theme";

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={tavolaTheme}>
        <AuthProvider>
          <StatusBar style="dark" />
          <AppGate />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
