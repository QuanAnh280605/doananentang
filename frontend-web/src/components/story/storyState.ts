export type StoryItem = {
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  avatarUrl: string | null;
  mediaUrl: string;
  text: string;
  timeLabel: string;
  ringClass: string;
  viewCount?: number;
  isViewed?: boolean;
};

export type StoryGroup = {
  authorId: string;
  latestStory: StoryItem;
  stories: StoryItem[];
};

type CreateLocalStoryInput = {
  authorId: string;
  authorName: string;
  authorInitials: string;
  avatarUrl: string | null;
  mediaUrl: string;
  text: string;
};

const STORY_RING_CLASS = 'ring-[var(--accent)]';
const DEFAULT_API_URL = 'http://localhost:8000';

type ApiStoryLike = {
  id: string | number;
  file_url: string;
  caption: string | null;
  view_count: number;
  is_viewed: boolean;
  author: {
    id: string | number;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
};

function resolveStoryUrl(url: string | null | undefined, apiUrl = DEFAULT_API_URL): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }

  return `${apiUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function getDefaultStories(): StoryItem[] {
  return [
    {
      id: 'story-mai-linh',
      authorId: 'default-mai-linh',
      authorName: 'Mai Linh',
      authorInitials: 'ML',
      avatarUrl: 'https://picsum.photos/seed/story-mai-linh-avatar/96/96',
      mediaUrl: 'https://picsum.photos/seed/story-mai-linh/720/1280',
      text: 'Một buổi sáng chậm, đủ cà phê và đủ ánh nắng.',
      timeLabel: '8 phút trước',
      ringClass: STORY_RING_CLASS,
    },
    {
      id: 'story-bao-an',
      authorId: 'default-bao-an',
      authorName: 'Bảo An',
      authorInitials: 'BA',
      avatarUrl: 'https://picsum.photos/seed/story-bao-an-avatar/96/96',
      mediaUrl: 'https://picsum.photos/seed/story-bao-an/720/1280',
      text: 'Một góc phố sáng đèn sau cơn mưa.',
      timeLabel: '21 phút trước',
      ringClass: STORY_RING_CLASS,
    },
    {
      id: 'story-khanh-vy',
      authorId: 'default-khanh-vy',
      authorName: 'Khánh Vy',
      authorInitials: 'KV',
      avatarUrl: 'https://picsum.photos/seed/story-khanh-vy-avatar/96/96',
      mediaUrl: 'https://picsum.photos/seed/story-khanh-vy/720/1280',
      text: 'Chợ hoa mở sớm hơn mọi ngày.',
      timeLabel: '42 phút trước',
      ringClass: STORY_RING_CLASS,
    },
    {
      id: 'story-minh-duy',
      authorId: 'default-minh-duy',
      authorName: 'Minh Duy',
      authorInitials: 'MD',
      avatarUrl: 'https://picsum.photos/seed/story-minh-duy-avatar/96/96',
      mediaUrl: 'https://picsum.photos/seed/story-minh-duy/720/1280',
      text: 'Đường trống, nhạc vừa đủ lớn.',
      timeLabel: '1 giờ trước',
      ringClass: STORY_RING_CLASS,
    },
  ];
}

export function createLocalStory(stories: StoryItem[], input: CreateLocalStoryInput): StoryItem[] {
  const localStory: StoryItem = {
    id: `story-local-${Date.now()}`,
    authorId: input.authorId,
    authorName: input.authorName,
    authorInitials: input.authorInitials,
    avatarUrl: input.avatarUrl,
    mediaUrl: input.mediaUrl,
    text: input.text,
    timeLabel: 'Vừa xong',
    ringClass: STORY_RING_CLASS,
  };

  return [localStory, ...stories];
}

export function mapApiStoryToStoryItem(story: ApiStoryLike, apiUrl = DEFAULT_API_URL): StoryItem {
  const authorName = `${story.author.first_name} ${story.author.last_name}`.trim() || 'Người dùng';
  const authorInitials = `${story.author.first_name?.[0] || ''}${story.author.last_name?.[0] || ''}`.toUpperCase() || 'US';

  return {
    id: String(story.id),
    authorId: String(story.author.id),
    authorName,
    authorInitials,
    avatarUrl: resolveStoryUrl(story.author.avatar_url, apiUrl),
    mediaUrl: resolveStoryUrl(story.file_url, apiUrl) ?? story.file_url,
    text: story.caption?.trim() || 'Tin mới vừa được chia sẻ.',
    timeLabel: story.is_viewed ? 'Đã xem' : 'Mới cập nhật',
    ringClass: STORY_RING_CLASS,
    viewCount: story.view_count,
    isViewed: story.is_viewed,
  };
}

export function groupStoriesByAuthor(stories: StoryItem[]): StoryGroup[] {
  const groupsByAuthor = new Map<string, StoryGroup>();

  stories.forEach((story) => {
    const existingGroup = groupsByAuthor.get(story.authorId);

    if (existingGroup) {
      existingGroup.stories.push(story);
      return;
    }

    groupsByAuthor.set(story.authorId, {
      authorId: story.authorId,
      latestStory: story,
      stories: [story],
    });
  });

  return Array.from(groupsByAuthor.values());
}

export function getNextStoryId(stories: StoryItem[], currentStoryId: string): string | null {
  if (stories.length === 0) return null;

  const currentIndex = stories.findIndex((story) => story.id === currentStoryId);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % stories.length;

  return stories[nextIndex]?.id ?? null;
}

export function getPreviousStoryId(stories: StoryItem[], currentStoryId: string): string | null {
  if (stories.length === 0) return null;

  const currentIndex = stories.findIndex((story) => story.id === currentStoryId);
  const previousIndex = currentIndex === -1
    ? 0
    : (currentIndex - 1 + stories.length) % stories.length;

  return stories[previousIndex]?.id ?? null;
}
