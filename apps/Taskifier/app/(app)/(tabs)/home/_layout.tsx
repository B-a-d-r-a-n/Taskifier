import DrawerLayout from "@/components/DrawerLayout";

export default function HomeLayout() {
    return (
        <DrawerLayout
            initialRouteName="my-tasks"
            screens={[
                { name: "my-tasks", title: "My Tasks", icon: "✅" },
                { name: "my-teams", title: "My Teams", icon: "👥" },
            ]}
        />
    );
}
