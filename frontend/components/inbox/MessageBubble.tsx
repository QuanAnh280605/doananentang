import { useState, useRef } from 'react';
import { View, Pressable, Modal, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { API_URL } from '@/lib/api';
import { ThemedText } from '@/components/themed-text';
import { SharedPostPreview } from './SharedPostPreview';

export type MessageBubbleData = {
  id: string;
  body: string | null;
  time: string;
  incoming?: boolean;
  senderName?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  is_deleted?: boolean;
};

type MessageOptionsProps = {
  onDelete: () => void;
};

function MessageOptions({ onDelete }: MessageOptionsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const buttonRef = useRef<View>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const handleOpenMenu = () => {
    buttonRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setMenuPosition({
        x: pageX - (110 - width) / 2,
        y: pageY - 48,
      });
      setShowMenu(true);
    });
  };

  return (
    <>
      <View ref={buttonRef} collapsable={false}>
        <Pressable
          onPress={handleOpenMenu}
          className="h-7 w-7 items-center justify-center rounded-full bg-slate-100 border border-slate-200 active:bg-slate-200 active:scale-95"
        >
          <MaterialIcons name="more-horiz" size={16} color="#475569" />
        </Pressable>
      </View>

      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setShowMenu(false)}
        >
          <View
            style={[
              styles.menuContainer,
              {
                left: menuPosition.x,
                top: menuPosition.y,
              },
            ]}
          >
            <Pressable
              onPress={() => {
                setShowMenu(false);
                onDelete();
              }}
              style={styles.menuItem}
              className="active:bg-rose-50"
            >
              <MaterialIcons name="delete-outline" size={14} color="#EF4444" />
              <ThemedText className="text-xs font-bold text-rose-600 ml-1.5">Thu hồi</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  menuContainer: {
    position: 'absolute',
    width: 110,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});

function MessageVideoCard({ url, width, height }: { url: string; width: number; height: number }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <VideoView
        player={player}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        nativeControls={true}
      />
    </View>
  );
}

export function MessageBubble({ item, isGroup, onDelete }: { item: MessageBubbleData; isGroup?: boolean; onDelete?: () => void }) {
  const getAbsoluteUrl = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const api = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${api}${path}`;
  };

  let sharedPostId: string | null = null;
  let displayText = item.is_deleted ? 'Tin nhắn đã bị thu hồi' : item.body;

  if (!item.is_deleted && item.body) {
    const postMatch = item.body.match(/\/post\/(\d+)/);
    if (postMatch) {
      sharedPostId = postMatch[1];
      displayText = item.body.replace(/\[Bài viết\].*?\/post\/\d+/, '').trim();
    }
  }

  const hasMedia = !item.is_deleted && Boolean(item.mediaUrl);
  const isVideo = hasMedia && (
    item.mediaType?.toLowerCase().includes('video') ||
    item.mediaUrl?.toLowerCase().endsWith('.mp4') ||
    item.mediaUrl?.toLowerCase().endsWith('.webm') ||
    item.mediaUrl?.toLowerCase().endsWith('.mov') ||
    item.mediaUrl?.toLowerCase().endsWith('.avi') ||
    item.mediaUrl?.toLowerCase().endsWith('.mkv')
  );

  const handleLongPress = () => {
    if (!item.incoming && !item.is_deleted && onDelete) {
      onDelete();
    }
  };

  const bubbleBgClass = item.is_deleted
    ? 'bg-slate-100 border border-slate-200'
    : item.incoming
      ? 'bg-[#F1F5F9]'
      : 'bg-[#4A9FD8]';

  const textClass = item.is_deleted
    ? 'text-slate-400 italic font-normal'
    : item.incoming
      ? 'text-slate-800'
      : 'text-white';

  return (
    <View className={`max-w-[90%] ${item.incoming ? 'self-start' : 'self-end'}`}>
      {/* Sender name for group chat incoming messages */}
      {isGroup && item.incoming && item.senderName ? (
        <ThemedText className="text-xs font-semibold text-[#4A9FD8] mb-1 ml-3">
          {item.senderName}
        </ThemedText>
      ) : null}

      <View className={`flex-row items-center gap-2 ${item.incoming ? '' : 'flex-row-reverse'}`}>
        <Pressable delayLongPress={500} onLongPress={handleLongPress}>
          <View className={`rounded-[24px] overflow-hidden ${bubbleBgClass}`}>
            {hasMedia && item.mediaUrl ? (
              isVideo ? (
                <MessageVideoCard
                  url={getAbsoluteUrl(item.mediaUrl)}
                  width={260}
                  height={195}
                />
              ) : (
                <Image
                  source={{ uri: getAbsoluteUrl(item.mediaUrl) }}
                  style={{ width: 260, height: 195 }}
                  contentFit="cover"
                />
              )
            ) : null}
            
            {displayText ? (
              <View className="px-4 py-3">
                <ThemedText className={`text-[15px] leading-6 font-medium ${textClass}`}>
                  {displayText}
                </ThemedText>
              </View>
            ) : null}

            {!item.is_deleted && sharedPostId && (
              <View className={`px-2 pb-2 pt-1 ${!displayText ? 'pt-2' : ''}`}>
                <SharedPostPreview postId={sharedPostId} />
              </View>
            )}
          </View>
        </Pressable>

        {/* Nút 3 chấm tùy chọn (chỉ tin nhắn gửi đi của bản thân, chưa bị xóa và có callback onDelete) */}
        {!item.incoming && !item.is_deleted && onDelete && (
          <MessageOptions onDelete={onDelete} />
        )}
      </View>

      <ThemedText className={`mt-1.5 text-[10px] font-bold text-slate-400 px-1 ${item.incoming ? 'text-left' : 'text-right'}`}>
        {item.time}
      </ThemedText>
    </View>
  );
}

