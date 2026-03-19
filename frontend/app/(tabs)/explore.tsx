import { Image } from 'expo-image';
import { View } from 'react-native';

import { Collapsible } from '@/components/ui/collapsible';
import { ExternalLink } from '@/components/external-link';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ExploreScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor="#DBEAFE"
      contentClassName="bg-slate-50"
      headerImage={
        <IconSymbol
          size={310}
          color="#1E293B"
          name="chevron.left.forwardslash.chevron.right"
          style={{
            bottom: -90,
            left: -35,
            position: 'absolute',
          }}
        />
      }>
      <View className="gap-4">
        <View className="gap-3">
          <ThemedText type="eyebrow">Architecture</ThemedText>
          <ThemedText type="title">Explore setup</ThemedText>
          <ThemedText className="text-slate-600">
            Man nay tong hop cach frontend duoc to chuc sau khi chuyen qua NativeWind.
          </ThemedText>
        </View>

        <Collapsible title="Routing voi Expo Router">
          <ThemedText className="text-slate-600">
            Moi file trong <ThemedText type="defaultSemiBold">app/</ThemedText> la mot route.
            Home nam o <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> va
            tab layout nam o <ThemedText type="defaultSemiBold">app/(tabs)/_layout.tsx</ThemedText>.
          </ThemedText>
          <ExternalLink href="https://docs.expo.dev/router/introduction/">
            <ThemedText type="link">Xem tai lieu Expo Router</ThemedText>
          </ExternalLink>
        </Collapsible>

        <Collapsible title="Styling voi NativeWind">
          <ThemedText className="text-slate-600">
            UI hien tai uu tien <ThemedText type="defaultSemiBold">className</ThemedText> utility-first
            thay vi bo token mau light/dark cu. Nhung phan animation va transform van de bang style object khi can.
          </ThemedText>
          <View className="rounded-2xl bg-slate-100 p-3">
            <ThemedText className="font-mono text-sm text-slate-700">
              {'<View className="rounded-3xl bg-white p-4" />'}
            </ThemedText>
          </View>
        </Collapsible>

        <Collapsible title="Shared components">
          <ThemedText className="text-slate-600">
            Cac wrapper nhu <ThemedText type="defaultSemiBold">ThemedText</ThemedText> va{' '}
            <ThemedText type="defaultSemiBold">ThemedView</ThemedText> gio chi dong vai tro helper
            nhe de gom variant text va nhan <ThemedText type="defaultSemiBold">className</ThemedText>.
          </ThemedText>
        </Collapsible>

        <Collapsible title="Assets va media">
          <ThemedText className="text-slate-600">
            Anh tinh van dung <ThemedText type="defaultSemiBold">expo-image</ThemedText>. Viec canh
            kich thuoc, absolute positioning, hay animation cho media co the ket hop giua NativeWind va style object.
          </ThemedText>
          <Image
            source={require('@/assets/images/react-logo.png')}
            style={{ alignSelf: 'center', height: 84, width: 84 }}
          />
        </Collapsible>
      </View>
    </ParallaxScrollView>
  );
}
