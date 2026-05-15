import { Tabs } from "expo-router";
import { Text } from "react-native";
import { Colors } from "@/constants/theme";
import { useColors } from "@/hooks/useColors";

function TabIcon({ name, color }: { name: string; color: string }) {
    const icons: Record<string, string> = {
        home: "🏠",
        team: "👥",
        calendar: "📅",
        settings: "⚙️",
    };
    return <Text style={{ color, fontSize: 20 }}>{icons[name] ?? "•"}</Text>;
}

export default function TabLayout() {
    const { colors: c, isDark } = useColors();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: c.primary,
                tabBarInactiveTintColor: c.icon,
                headerShown: false,
                tabBarStyle: { backgroundColor: isDark ? Colors.dark.background : "#fff", borderTopColor: c.border },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
                }}
            />
            <Tabs.Screen
                name="team"
                options={{
                    title: "Team",
                    tabBarIcon: ({ color }) => <TabIcon name="team" color={color} />,
                }}
            />
            <Tabs.Screen
                name="calendar"
                options={{
                    title: "Calendar",
                    tabBarIcon: ({ color }) => <TabIcon name="calendar" color={color} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: "Settings",
                    tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} />,
                }}
            />
        </Tabs>
    );
}
