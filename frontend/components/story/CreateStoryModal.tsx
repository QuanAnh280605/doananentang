import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { createStory, uploadStoryMedia } from '@/lib/api';
import type { Story, VisibilityLevel } from '@/lib/types';

type CreateStoryModalProps = {
  imageUri: string;
  visible: boolean;
  onClose: () => void;
  onStoryCreated: (story: Story) => void;
};

export function CreateStoryModal({ imageUri, visible, onClose, onStoryCreated }: CreateStoryModalProps) {
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<VisibilityLevel>('public');
  const [loading, setLoading] = useState(false);

  const handlePublish = async () => {
    if (loading) return;
    setLoading(true);

    try {
      // 1. Tải ảnh lên Backend
      const uploadRes = await uploadStoryMedia(imageUri);
      if (!uploadRes || !uploadRes.file_url) {
        throw new Error('Không nhận được liên kết ảnh từ máy chủ.');
      }

      // 2. Tạo Story mới
      const newStory = await createStory({
        file_url: uploadRes.file_url,
        caption: caption.trim() || null,
        type: 'image',
        visibility: visibility,
      });

      Alert.alert('Thành công', 'Tin của bạn đã được đăng tải thành công!');
      onStoryCreated(newStory);
      setCaption('');
      setVisibility('public');
      onClose();
    } catch (error: any) {
      console.error(error);
      Alert.alert('Lỗi đăng tin', error.message || 'Đã xảy ra lỗi trong quá trình tải tin lên.');
    } finally {
      setLoading(false);
    }
  };

  const visibilityOptions: { key: VisibilityLevel; label: string; icon: string }[] = [
    { key: 'public', label: 'Công khai', icon: 'public' },
    { key: 'followersonly', label: 'Người theo dõi', icon: 'people' },
    { key: 'onlyme', label: 'Chỉ mình tôi', icon: 'lock' },
  ];

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <View style={styles.header}>
          <Pressable style={styles.closeBtn} onPress={onClose} disabled={loading}>
            <ThemedText style={styles.closeBtnText}>Hủy</ThemedText>
          </Pressable>
          <ThemedText style={styles.headerTitle}>Tin mới</ThemedText>
          <Pressable
            style={[styles.publishBtn, loading && styles.publishBtnDisabled]}
            onPress={handlePublish}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.publishBtnText}>Chia sẻ</ThemedText>
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.previewContainer}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          </View>

          <View style={styles.formContainer}>
            <ThemedText style={styles.label}>Nội dung mô tả</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Nhập cảm nghĩ về khoảnh khắc này..."
              placeholderTextColor="#94A3B8"
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={150}
              editable={!loading}
            />
            <ThemedText style={styles.charCount}>{caption.length}/150</ThemedText>

            <ThemedText style={styles.label}>Ai có thể xem tin này?</ThemedText>
            <View style={styles.visibilityContainer}>
              {visibilityOptions.map((opt) => {
                const isSelected = visibility === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    style={[styles.visibilityChip, isSelected && styles.visibilityChipSelected]}
                    onPress={() => !loading && setVisibility(opt.key)}
                  >
                    <ThemedText
                      style={[styles.visibilityText, isSelected && styles.visibilityTextSelected]}
                    >
                      {opt.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#E4E8EE',
  },
  closeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  publishBtn: {
    backgroundColor: '#4A9FD8',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  publishBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  previewContainer: {
    aspectRatio: 9 / 16,
    width: '100%',
    maxHeight: 450,
    borderRadius: 24,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
    alignSelf: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 4,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  formContainer: {
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E4E8EE',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  visibilityContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  visibilityChip: {
    borderWidth: 1,
    borderColor: '#E4E8EE',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  visibilityChipSelected: {
    backgroundColor: '#4A9FD8',
    borderColor: '#4A9FD8',
  },
  visibilityText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  visibilityTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
