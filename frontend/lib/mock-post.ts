/**
 * mock-post.ts
 * Lớp dữ liệu mock cho UI bài viết, bình luận và bảng tin (issue #35).
 * Giúp khóa thiết kế UI hoàn chỉnh trước khi tích hợp API thật.
 * Khi cần chạy chế độ mock, chỉ cần đổi import trong index.tsx và [id].tsx.
 */

import type { Post, Comment, PaginatedPosts, LikeStatus } from '@/lib/types';

// ─── Dữ liệu Mock Posts ───────────────────────────────────────────────────────
let _mockPosts: Post[] = [
  {
    id: 1,
    author_id: 101,
    content: 'Mới thiết kế xong giao diện tối giản (minimalist UI) cho ứng dụng Northfeed. Hệ thống font chữ Inter kết hợp màu nền dịu mắt giúp trải nghiệm đọc bài thoải mái hơn rất nhiều. Mọi người cho mình xin nhận xét nhé! 🎨✨',
    visibility: 'public',
    reported_count: 0,
    is_deleted: false,
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 phút trước
    updated_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    media: [
      {
        id: 1,
        post_id: 1,
        file_url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
        type: 'image',
        display_order: 1
      }
    ],
    author: {
      id: 101,
      first_name: 'Minh',
      last_name: 'Hoàng',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    },
    like_count: 42,
    comment_count: 3,
    is_liked: false,
  },
  {
    id: 2,
    author_id: 102,
    content: 'Một buổi sáng trong lành tại Ba Vì. Rời xa khói bụi thành phố để tập trung code module offline first. Thật sự hiệu suất tăng gấp đôi! 🍃💻',
    visibility: 'public',
    reported_count: 0,
    is_deleted: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 giờ trước
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    media: [
      {
        id: 2,
        post_id: 2,
        file_url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80',
        type: 'image',
        display_order: 1
      },
      {
        id: 3,
        post_id: 2,
        file_url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80',
        type: 'image',
        display_order: 2
      }
    ],
    author: {
      id: 102,
      first_name: 'Thanh',
      last_name: 'Trúc',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    },
    like_count: 128,
    comment_count: 5,
    is_liked: true,
  },
  {
    id: 3,
    author_id: 103,
    content: 'Northfeed Studio đang thử nghiệm tính năng chia sẻ Note siêu nhanh cho các designer team. Hỗ trợ Markdown và kéo thả ảnh cực mượt. Sắp ra mắt bản Beta rồi nha anh em! 🚀',
    visibility: 'public',
    reported_count: 0,
    is_deleted: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(), // Yesterday
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(),
    media: [],
    author: {
      id: 103,
      first_name: 'Quân',
      last_name: 'Anh',
      avatar_url: null,
    },
    like_count: 89,
    comment_count: 0,
    is_liked: false,
  }
];

// ─── Dữ liệu Mock Comments ────────────────────────────────────────────────────
let _mockComments: Record<string, Comment[]> = {
  '1': [
    {
      id: 1001,
      post_id: 1,
      author_id: 102,
      content: 'Giao diện nhìn mướt mát quá bạn ơi! Tone màu xanh dịu mắt thích cực.',
      is_deleted: false,
      created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      author: {
        id: 102,
        first_name: 'Thanh',
        last_name: 'Trúc',
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      },
      like_count: 4,
      is_liked: false,
      replies: [
        {
          id: 1002,
          post_id: 1,
          author_id: 101,
          content: 'Cảm ơn Trúc nhé! Mình có dùng scale HSL để màu đồng bộ hơn á.',
          is_deleted: false,
          created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
          author: {
            id: 101,
            first_name: 'Minh',
            last_name: 'Hoàng',
            avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
          },
          like_count: 1,
          is_liked: true,
        }
      ]
    },
    {
      id: 1003,
      post_id: 1,
      author_id: 103,
      content: 'Sử dụng font chữ gì vậy chủ thớt? Nhìn hiển thị tiếng Việt rất tròn trịa và không bị lỗi chân.',
      is_deleted: false,
      created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      author: {
        id: 103,
        first_name: 'Quân',
        last_name: 'Anh',
        avatar_url: null,
      },
      like_count: 2,
      is_liked: false,
    }
  ],
  '2': [
    {
      id: 2001,
      post_id: 2,
      author_id: 101,
      content: 'Thích ghê! Chúc Trúc có buổi làm việc hiệu quả và tràn đầy ý tưởng mới nhé.',
      is_deleted: false,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      author: {
        id: 101,
        first_name: 'Minh',
        last_name: 'Hoàng',
        avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      },
      like_count: 5,
      is_liked: true,
    }
  ]
};

// ─── Mock API Helpers ────────────────────────────────────────────────────────
export function getMockFeedPosts(page = 1, pageSize = 10): Promise<PaginatedPosts> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedItems = _mockPosts.slice(start, end);
      resolve({
        items: paginatedItems,
        total: _mockPosts.length,
        page: page,
        page_size: pageSize,
        total_pages: Math.ceil(_mockPosts.length / pageSize) || 1,
      });
    }, 300);
  });
}

export function getMockPostDetail(postId: string): Promise<Post> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const post = _mockPosts.find((p) => String(p.id) === postId);
      if (post) {
        resolve({ ...post });
      } else {
        reject(new Error('Không tìm thấy bài viết'));
      }
    }, 200);
  });
}

export function getMockComments(postId: string): Promise<Comment[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(_mockComments[postId] || []);
    }, 200);
  });
}

export function createMockPost(content: string, mediaUrls: string[] = []): Promise<Post> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newPost: Post = {
        id: Date.now(),
        author_id: 103, // Mock tác giả hiện tại
        content: content,
        visibility: 'public',
        reported_count: 0,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        media: mediaUrls.map((url, index) => ({
          id: Date.now() + index,
          post_id: Date.now(),
          file_url: url,
          type: 'image',
          display_order: index + 1,
        })),
        author: {
          id: 103,
          first_name: 'Quân',
          last_name: 'Anh',
          avatar_url: null,
        },
        like_count: 0,
        comment_count: 0,
        is_liked: false,
      };

      _mockPosts = [newPost, ..._mockPosts];
      resolve(newPost);
    }, 400);
  });
}

export function likeMockPost(postId: string): Promise<LikeStatus> {
  return new Promise((resolve) => {
    setTimeout(() => {
      _mockPosts = _mockPosts.map((p) => {
        if (String(p.id) === postId) {
          const newLiked = !p.is_liked;
          return {
            ...p,
            is_liked: newLiked,
            like_count: newLiked ? p.like_count + 1 : p.like_count - 1,
          };
        }
        return p;
      });

      const updated = _mockPosts.find((p) => String(p.id) === postId);
      resolve({
        post_id: Number(postId),
        liked: updated?.is_liked ?? false,
        like_count: updated?.like_count ?? 0,
      });
    }, 150);
  });
}

export function createMockComment(postId: string, content: string, parentCommentId?: number): Promise<Comment> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newComment: Comment = {
        id: Date.now(),
        post_id: Number(postId),
        author_id: 103,
        content: content,
        is_deleted: false,
        created_at: new Date().toISOString(),
        author: {
          id: 103,
          first_name: 'Quân',
          last_name: 'Anh',
          avatar_url: null,
        },
        like_count: 0,
        is_liked: false,
      };

      if (parentCommentId) {
        // Thêm reply vào comment cha
        const comments = _mockComments[postId] || [];
        _mockComments[postId] = comments.map((c) => {
          if (c.id === parentCommentId) {
            return {
              ...c,
              replies: [...(c.replies || []), newComment],
            };
          }
          return c;
        });
      } else {
        // Thêm comment cấp 1
        _mockComments[postId] = [...(_mockComments[postId] || []), newComment];
      }

      // Cập nhật số lượng bình luận của post tương ứng
      _mockPosts = _mockPosts.map((p) => {
        if (String(p.id) === postId) {
          return {
            ...p,
            comment_count: p.comment_count + 1,
          };
        }
        return p;
      });

      resolve(newComment);
    }, 300);
  });
}
