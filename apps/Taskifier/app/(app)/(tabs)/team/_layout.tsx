import DrawerLayout from "@/components/DrawerLayout";

export default function TeamLayout() {
    return (
        <DrawerLayout
            initialRouteName="members"
            screens={[
                { name: "members", title: "Members", icon: "👥" },
                { name: "team-tasks", title: "Team Tasks", icon: "📋" },
            ]}
        />
    );
}
