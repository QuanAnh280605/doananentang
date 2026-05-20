export type ModerationStatus = 'pending' | 'resolved' | 'dismissed';
export type ModerationType = 'post' | 'user';

export interface Reporter {
  id: number;
  name: string;
  avatarUrl: string | null;
}

export interface ModerationTarget {
  id: number;
  content?: string; // for post
  name?: string; // for user
  avatarUrl?: string | null;
}

export interface ModerationItemData {
  id: number;
  type: ModerationType;
  status: ModerationStatus;
  reason: string;
  createdAt: string;
  reporter: Reporter;
  target: ModerationTarget;
}

// Giữ state mock tĩnh trong bộ nhớ để giả lập hành vi mutate
const inMemoryMockData: ModerationItemData[] = [
  {
    id: 1,
    type: 'post',
    status: 'pending',
    reason: 'Nội dung phản cảm, spam link rác',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    reporter: {
      id: 101,
      name: 'Nguyễn Văn A',
      avatarUrl: null,
    },
    target: {
      id: 201,
      content: 'Hãy click vào link này để nhận 1000 coin miễn phí ngay hôm nay http://spam-link.local',
    },
  },
  {
    id: 2,
    type: 'user',
    status: 'pending',
    reason: 'Tài khoản giả mạo người nổi tiếng',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    reporter: {
      id: 102,
      name: 'Trần Thị B',
      avatarUrl: null,
    },
    target: {
      id: 301,
      name: 'Ngôi Sao Fe',
      avatarUrl: null,
    },
  },
  {
    id: 3,
    type: 'post',
    status: 'resolved',
    reason: 'Đăng tải hình ảnh bản quyền trái phép',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    reporter: {
      id: 103,
      name: 'Lê Văn C',
      avatarUrl: null,
    },
    target: {
      id: 202,
      content: '[Bức ảnh bị báo cáo do vi phạm bản quyền từ tác giả X]',
    },
  },
  {
    id: 4,
    type: 'user',
    status: 'dismissed',
    reason: 'Báo cáo sai sự thật, không có bằng chứng',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    reporter: {
      id: 104,
      name: 'Hoàng D',
      avatarUrl: null,
    },
    target: {
      id: 302,
      name: 'User 302',
      avatarUrl: null,
    },
  },
];

export async function fetchMockModerationItems(status: ModerationStatus): Promise<ModerationItemData[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(inMemoryMockData.filter((item) => item.status === status).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, 600);
  });
}

export async function updateMockModerationStatus(id: number, status: ModerationStatus): Promise<ModerationItemData> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = inMemoryMockData.findIndex(item => item.id === id);
      if (index === -1) {
        return reject(new Error('Item not found'));
      }
      
      inMemoryMockData[index] = { ...inMemoryMockData[index], status };
      resolve(inMemoryMockData[index]);
    }, 400);
  });
}
