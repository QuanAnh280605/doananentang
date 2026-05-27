import React, { useState } from 'react';
import { View, Modal, Pressable, Image, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Dimensions } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      toast.error('Bạn cần cho phép truy cập thư viện ảnh để đăng story.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!imageUri) {
      toast.error('Vui lòng chọn một ảnh cho story của bạn.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Upload ảnh
      const uploadRes = await uploadStoryMedia(imageUri);
      
      // Tạo story
      await createStory({
        file_url: uploadRes.file_url,
        caption: caption.trim() || null,
        type: 'image',
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
    setImageUri(null);
    setCaption('');
    setIsSubmitting(false);
    onClose();
  };

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
            disabled={!imageUri || isSubmitting}
            className={`px-4 py-2 rounded-[20px] ${(!imageUri || isSubmitting) ? 'bg-slate-700' : 'bg-[#4A9FD8]'}`}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <ThemedText className="text-[14px] font-bold text-white">Đăng</ThemedText>
            )}
          </Pressable>
        </View>

        <View className="flex-1 items-center justify-center">
          {imageUri ? (
            <View className="w-full h-full relative">
              <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="cover" />
              <Pressable 
                onPress={handlePickImage}
                className="absolute top-4 right-4 bg-black/50 p-2 rounded-full"
              >
                <MaterialIcons name="edit" size={20} color="#FFF" />
              </Pressable>
            </View>
          ) : (
            <Pressable 
              onPress={handlePickImage}
              className="items-center justify-center bg-slate-900 rounded-[24px] border border-slate-700 border-dashed"
              style={{ width: width * 0.8, height: height * 0.6 }}
            >
              <MaterialIcons name="add-photo-alternate" size={64} color="#4A9FD8" />
              <ThemedText className="text-slate-400 mt-4 text-base font-medium">Chạm để chọn ảnh</ThemedText>
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
