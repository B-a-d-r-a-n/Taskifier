import { Drawer } from "expo-router/drawer";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { useTasksStore } from "@/store/tasks";
import { Colors } from "@/constants/theme";
import { useColors } from "@/hooks/useColors";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";

interface ScreenConfig {
    name: string;
    title: string;
    icon: string;
}

interface DrawerLayoutProps {
    initialRouteName: string;
    screens: ScreenConfig[];
}

// Custom drawer sidebar showing the app title, navigation items, and the currently active team name
function DrawerContent({
    navigation,
    screens,
}: DrawerContentComponentProps & { screens: ScreenConfig[] }) {
    const currentTeamId = useTasksStore((s) => s.currentTeamId);
    const teams = useTasksStore((s) => s.teams);
    const { colors: c, isDark } = useColors();

    return (
        <View style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : "#f9fafb" }]}>
            <View style={[styles.header, { borderBottomColor: c.border }]}>
                <Text style={[styles.headerTitle, { color: c.text }]}>Taskifier</Text>
            </View>
            <View style={styles.navSection}>
                {screens.map((screen) => (
                    <Pressable
                        key={screen.name}
                        style={({ pressed }) => [
                            styles.navButton,
                            { backgroundColor: pressed ? c.subtleBg : "transparent" },
                        ]}
                        onPress={() => navigation.navigate(screen.name as never)}
                    >
                        <Text style={styles.navIcon}>{screen.icon}</Text>
                        <Text style={[styles.navLabel, { color: c.text }]}>{screen.title}</Text>
                    </Pressable>
                ))}
            </View>
            <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: c.icon }]}>CURRENT TEAM</Text>
                <Text style={[styles.teamName, { color: c.text }]}>
                    {teams.find((t) => t.id === currentTeamId)?.name ?? "No team selected"}
                </Text>
            </View>
        </View>
    );
}

export default function DrawerLayout({ initialRouteName, screens }: DrawerLayoutProps) {
    const { colors: c, isDark } = useColors();

    return (
        <Drawer
            initialRouteName={initialRouteName}
            drawerContent={(props) => <DrawerContent {...props} screens={screens} />}
            screenOptions={{
                headerShown: true,
                headerStyle: { backgroundColor: isDark ? Colors.dark.background : "#fff" },
                headerTintColor: c.text,
                headerTitleStyle: { color: c.text },
                drawerActiveTintColor: c.primary,
                drawerInactiveTintColor: c.icon,
                drawerLabelStyle: { marginLeft: -20, fontSize: 15 },
                drawerStyle: { backgroundColor: isDark ? Colors.dark.background : "#fff" },
            }}
        >
            {screens.map((screen) => (
                <Drawer.Screen
                    key={screen.name}
                    name={screen.name}
                    options={{
                        title: screen.title,
                        drawerIcon: ({ color }: { color: string }) => (
                            <Text style={{ color, fontSize: 18 }}>{screen.icon}</Text>
                        ),
                    }}
                />
            ))}
        </Drawer>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 40, paddingHorizontal: 16 },
    header: { paddingBottom: 20, borderBottomWidth: 1 },
    headerTitle: { fontSize: 22, fontWeight: "700" },
    navSection: { marginTop: 12 },
    navButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginBottom: 4,
    },
    navIcon: { fontSize: 18, marginRight: 12 },
    navLabel: { fontSize: 15, fontWeight: "500" },
    section: { marginTop: 24 },
    sectionLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
    teamName: { fontSize: 15, marginTop: 4 },
});
