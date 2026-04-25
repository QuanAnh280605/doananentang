import { Stack } from 'expo-router';

export default function PostLayout() {
    return (
        <Stack>
            <Stack.Screen
                name="[id]"
                options={{
                    title: 'Bài viết',
                    headerStyle: { backgroundColor: '#EDF1F5' },
                    headerShadowVisible: false,
                    headerTintColor: '#0A0A0A',
                }}
            />
        </Stack>
    );
}
