import { ProfileView } from '@/components/profile/ProfileView';

type ProfileDetailPageProps = {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{
    name?: string;
    initials?: string;
    preview?: string;
    bio?: string;
  }>;
};

export default async function ProfileDetailPage({ params, searchParams }: ProfileDetailPageProps) {
  const [{ userId }, snapshot] = await Promise.all([params, searchParams]);

  return (
    <ProfileView
      selectedUser={{
        id: userId,
        name: snapshot.name ?? 'Guest profile',
        initials: snapshot.initials ?? 'GP',
        preview: snapshot.preview ?? 'Opened from search results.',
        bio: snapshot.bio ?? snapshot.preview ?? 'Opened from search results.',
      }}
    />
  );
}
