import { StatusBar } from "expo-status-bar";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

export default function App() {
  const cards = [
    { label: "Open Incidents", value: "14" },
    { label: "Critical Findings", value: "9" },
    { label: "Active Scans", value: "6" },
  ];

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>CosmicSec Mobile Companion</Text>
        <Text style={styles.subtitle}>Fast SOC posture and scan triage on the go.</Text>
        <View style={styles.cardRow}>
          {cards.map((card) => (
            <View key={card.label} style={styles.card}>
              <Text style={styles.cardValue}>{card.value}</Text>
              <Text style={styles.cardLabel}>{card.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Recent Activity</Text>
          <Text style={styles.panelItem}>- scan-2192 completed for api.example.com</Text>
          <Text style={styles.panelItem}>- Critical SQLi finding assigned for triage</Text>
          <Text style={styles.panelItem}>- CI security gate passed on main</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#020617",
  },
  content: {
    padding: 16,
    gap: 14,
  },
  title: {
    color: "#e2e8f0",
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 14,
  },
  cardRow: {
    flexDirection: "row",
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  cardValue: {
    color: "#22d3ee",
    fontSize: 20,
    fontWeight: "700",
  },
  cardLabel: {
    color: "#cbd5e1",
    fontSize: 12,
    marginTop: 4,
  },
  panel: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  panelTitle: {
    color: "#e2e8f0",
    fontSize: 15,
    fontWeight: "600",
  },
  panelItem: {
    color: "#94a3b8",
    fontSize: 13,
  },
});
