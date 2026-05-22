/**
 * mock-profile.ts
 * Lớp dữ liệu mock cho UI hồ sơ (issue #32).
 * Thay thế tạm thời cho fetchCurrentUser / updateUserProfile / fetchPosts / changePassword.
 * Khi nối backend thật, chỉ cần đổi import trong profile.tsx và edit-profile.tsx.
 */

import type { AuthUser, GenderValue, UserUpdatePayload } from '@/lib/auth';
import type { Post, PaginatedPosts } from '@/lib/types';

// ─── Mock user ────────────────────────────────────────────────────────────────

let _mockUser: AuthUser = {
  id: 1,
  email: 'quananh@example.com',
  phone: '0912345678',
  first_name: 'Quân',
  last_name: 'Anh',
  birth_date: '2005-06-28',
  gender: 'male' as GenderValue,
  bio: 'Sinh viên CNTT — thích xây dựng sản phẩm nhỏ gọn, giao diện rõ ràng và hệ thống đáng tin cậy.',
  city: 'Hà Nội, Việt Nam',
  avatar_url: null,
  created_at: '2024-01-15T08:00:00Z',
  updated_at: '2024-05-20T10:30:00Z',
};

// ─── Mock posts ───────────────────────────────────────────────────────────────

const _mockPosts: Post[] = [
  {
    id: 'mock-post-1',
    author_id: '1',
    content:
      'Vừa hoàn thành module hồ sơ cá nhân với mock data — cảm giác UX mượt hơn nhiều khi tách lớp dữ liệu sớm. Bước tiếp theo là nối backend thật. 🚀',
    visibility: 'public',
    reported_count: 0,
    is_deleted: false,
    created_at: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    media: [],
    author: {
      id: '1',
      first_name: 'Quân',
      last_name: 'Anh',
      avatar_url: null,
    },
    like_count: 24,
    comment_count: 5,
    is_liked: false,
  },
  {
    id: 'mock-post-2',
    author_id: '1',
    content:
      'Có ai dùng Expo Router kết hợp mock layer trước khi nối API không? Cách này giúp team frontend chạy song song với backend khá hiệu quả.',
    visibility: 'public',
    reported_count: 0,
    is_deleted: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    media: [],
    author: {
      id: '1',
      first_name: 'Quân',
      last_name: 'Anh',
      avatar_url: null,
    },
    like_count: 41,
    comment_count: 12,
    is_liked: true,
  },
  {
    id: 'mock-post-3',
    author_id: '1',
    content:
      'Design system rules quan trọng hơn tôi nghĩ — khi cả team cùng dùng một bộ token màu, spacing, radius thì code review nhanh hơn rất nhiều.',
    visibility: 'public',
    reported_count: 0,
    is_deleted: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    media: [],
    author: {
      id: '1',
      first_name: 'Quân',
      last_name: 'Anh',
      avatar_url: null,
    },
    like_count: 89,
    comment_count: 18,
    is_liked: false,
  },
];

// ─── Async helpers (simulate network latency nhẹ) ─────────────────────────────

/** Lấy mock user hiện tại */
export function getMockUser(): Promise<AuthUser> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ ..._mockUser }), 150);
  });
}

/** Cập nhật mock user (mutate in-memory) */
export function updateMockUser(payload: UserUpdatePayload): Promise<AuthUser> {
  return new Promise((resolve) => {
    setTimeout(() => {
      _mockUser = {
        ..._mockUser,
        ...(payload.first_name !== undefined && { first_name: payload.first_name }),
        ...(payload.last_name !== undefined && { last_name: payload.last_name }),
        ...(payload.bio !== undefined && { bio: payload.bio }),
        ...(payload.phone !== undefined && { phone: payload.phone }),
        ...(payload.city !== undefined && { city: payload.city }),
        ...(payload.gender !== undefined && { gender: payload.gender }),
        updated_at: new Date().toISOString(),
      };
      resolve({ ..._mockUser });
    }, 400);
  });
}

/** Đổi mật khẩu mock — validate đơn giản */
export function changeMockPassword(
  currentPassword: string,
  _newPassword: string,
): Promise<{ message: string }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (currentPassword !== 'mock123') {
        reject(new Error('Mật khẩu hiện tại không đúng (mock: dùng "mock123")'));
        return;
      }
      resolve({ message: 'Đổi mật khẩu thành công' });
    }, 500);
  });
}

/** Lấy danh sách mock posts của user */
export function getMockPosts(): Promise<PaginatedPosts> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        items: _mockPosts,
        total: _mockPosts.length,
        page: 1,
        page_size: 20,
        total_pages: 1,
      });
    }, 200);
  });
}

/** Upload mock avatar — chỉ lưu URI local */
export function uploadMockAvatar(_uri: string): Promise<{ message: string; avatar_url: string }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ message: 'Cập nhật ảnh đại diện thành công', avatar_url: _uri });
    }, 300);
  });
}
