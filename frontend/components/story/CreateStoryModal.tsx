import React, { useState } from 'react';
import { View, Modal, Pressable, Image, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { ThemedText } from '@/components/themed-text';
import { uploadStoryMedia, createStory } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

type CreateStoryModalProps = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const { width, height } = Dimensions.get('window');

export function CreateStoryModal({ visible, onClose, onSuccess }: CreateStoryModalProps) {
  const toast = useToast();
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resizeImageToStory = async (uri: string): Promise<string> => {
    const { width: origW, height: origH } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject);
    });

    // Aspect ratio 9:16
    const targetRatio = 9 / 16;
    const actualRatio = origW / origH;

    let newW: number;
    let newH: number;

    if (actualRatio > targetRatio) {
      // Ảnh quá rộng — crop chiều rộng
      newH = origH;
      newW = Math.round(origH * targetRatio);
    } else {
      // Ảnh quá cao — crop chiều cao
      newW = origW;
      newH = Math.round(origW / targetRatio);
    }

    const cropX = Math.round((origW - newW) / 2);
    const cropY = Math.round((origH - newH) / 2);

    const result = await manipulateAsync(
      uri,
      [{ crop: { originX: cropX, originY: cropY, width: newW, height: newH } }],
      { compress: 0.8, format: SaveFormat.JPEG },
    );
    return result.uri;
  };

  const handlePickMedia = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      toast.error('Bạn cần cho phép truy cập thư viện để đăng story.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const isVideo = asset.type === 'video';
      setMediaType(isVideo ? 'video' : 'image');

      // Gửi media trực tiếp, không resize/crop để giữ nguyên tỉ lệ gốc của người dùng
      setMediaUri(asset.uri);
    }
  };

  const handleSubmit = async () => {
    if (!mediaUri) {
      toast.error('Vui lòng chọn ảnh hoặc video cho story của bạn.');
      return;
    }

    try {
      setIsSubmitting(true);

      const uploadRes = await uploadStoryMedia(mediaUri);

      await createStory({
        file_url: uploadRes.file_url,
        caption: caption.trim() || null,
        type: mediaType,
        visibility: 'public',
      });

      onSuccess();
      handleClose();
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra khi tạo story.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setMediaUri(null);
    setMediaType('image');
    setCaption('');
    setIsSubmitting(false);
    onClose();
  };

  const videoPlayer = useVideoPlayer(mediaUri ?? '', (player) => {
    player.loop = true;
    if (mediaUri) player.play();
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#000' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-row items-center justify-between px-4 pt-12 pb-4 bg-black">
          <Pressable onPress={handleClose} disabled={isSubmitting} className="h-10 w-10 items-center justify-center rounded-full bg-slate-800">
            <MaterialIcons name="close" size={24} color="#FFF" />
          </Pressable>
          <ThemedText className="text-[18px] font-bold text-white">Tạo tin mới</ThemedText>
          <Pressable
            onPress={handleSubmit}
            disabled={!mediaUri || isSubmitting}
            className={`px-4 py-2 rounded-[20px] ${(!mediaUri || isSubmitting) ? 'bg-slate-700' : 'bg-[#4A9FD8]'}`}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <ThemedText className="text-[14px] font-bold text-white">Đăng</ThemedText>
            )}
          </Pressable>
        </View>

        <View className="flex-1 items-center justify-center">
          {mediaUri ? (
            <View className="w-full h-full relative">
              {mediaType === 'image' ? (
                <Image source={{ uri: mediaUri }} className="w-full h-full" resizeMode="contain" />
              ) : (
                <VideoView
                  player={videoPlayer}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                  nativeControls={false}
                />
              )}
              <Pressable
                onPress={handlePickMedia}
                className="absolute top-4 right-4 bg-black/50 p-2 rounded-full"
              >
                <MaterialIcons name="edit" size={20} color="#FFF" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handlePickMedia}
              className="items-center justify-center bg-slate-900 rounded-[24px] border border-slate-700 border-dashed"
              style={{ width: width * 0.8, height: height * 0.6 }}
            >
              <MaterialIcons name="add-photo-alternate" size={64} color="#4A9FD8" />
              <ThemedText className="text-slate-400 mt-4 text-base font-medium">Chạm để chọn ảnh hoặc video</ThemedText>
            </Pressable>
          )}
        </View>

        <View className="p-4 bg-black border-t border-slate-800">
          <TextInput
            placeholder="Thêm chú thích..."
            placeholderTextColor="#94A3B8"
            value={caption}
            onChangeText={setCaption}
            className="text-white text-base bg-slate-900 px-4 py-3 rounded-[24px]"
            maxLength={100}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
