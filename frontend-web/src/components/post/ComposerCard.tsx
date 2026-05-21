'use client';

import { GlobeHemisphereWest, ImageSquare, Smiley, UserPlus, VideoCamera, X, DotsThree } from '@phosphor-icons/react';
import { useState, useRef, useEffect } from 'react';
import { createPost, uploadPostMedia, API_URL } from '@/lib/api';
import { searchUsers } from '@/lib/auth';
import type { AuthUser, SearchUser } from '@/lib/auth';
import { ThemedText } from '@/components/ui/ThemedText';
import { compressToWebP } from '@/lib/image';

const FEELINGS = [
    { label: 'Vui vẻ', emoji: '😊' },
    { label: 'Hạnh phúc', emoji: '🥰' },
    { label: 'Buồn bã', emoji: '😢' },
    { label: 'Tức giận', emoji: '😡' },
    { label: 'Hào hứng', emoji: '🤩' },
    { label: 'Mệt mỏi', emoji: '😴' },
    { label: 'Ngạc nhiên', emoji: '😮' },
    { label: 'Hài lòng', emoji: '😌' },
];

export function ComposerCard({ onPostCreated, currentUser }: { onPostCreated?: () => void; currentUser?: AuthUser | null }) {
    const [text, setText] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
    const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
    
    // Feelings and tagging state
    const [feeling, setFeeling] = useState<string | null>(null);
    const [taggedUsers, setTaggedUsers] = useState<SearchUser[]>([]);
    
    const [showFeelingSelector, setShowFeelingSelector] = useState(false);
    const [showTagSelector, setShowTagSelector] = useState(false);
    const [tagSearchQuery, setTagSearchQuery] = useState('');
    const [tagSearchResults, setTagSearchResults] = useState<SearchUser[]>([]);
    const [searchingTags, setSearchingTags] = useState(false);

    const [isFocused, setIsFocused] = useState(false);
    const [isPosting, setIsPosting] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Focus textarea and lock scroll when modal opens
    useEffect(() => {
        if (isFocused) {
            document.body.style.overflow = 'hidden';
            setTimeout(() => textareaRef.current?.focus(), 100);
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isFocused]);

    // Tag friend search debounce logic
    useEffect(() => {
        if (!tagSearchQuery.trim()) {
            setTagSearchResults([]);
            return;
        }
        const delayDebounce = setTimeout(async () => {
            setSearchingTags(true);
            try {
                const res = await searchUsers(tagSearchQuery);
                // Exclude current user from search
                const filtered = res.items.filter(u => u.id !== currentUser?.id);
                setTagSearchResults(filtered);
            } catch (err) {
                console.error(err);
            } finally {
                setSearchingTags(false);
            }
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [tagSearchQuery, currentUser]);

    const handlePickMedia = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type.startsWith('video/')) {
                setSelectedVideoFile(file);
                setSelectedVideo(URL.createObjectURL(file));
                setSelectedImage(null);
                setSelectedFile(null);
            } else {
                setSelectedFile(file);
                setSelectedImage(URL.createObjectURL(file));
                setSelectedVideo(null);
                setSelectedVideoFile(null);
            }
            setIsFocused(true);
        }
    };

    const handlePost = async () => {
        if (isPosting) return;
        setIsPosting(true);
        try {
            let mediaUrls: string[] = [];
            if (selectedFile) {
                const compressed = await compressToWebP(selectedFile);
                const uploadRes = await uploadPostMedia(compressed);
                mediaUrls = uploadRes.data;
            } else if (selectedVideoFile) {
                // Direct video upload bypasses image compression
                const uploadRes = await uploadPostMedia(selectedVideoFile);
                mediaUrls = uploadRes.data;
            }

            await createPost(
                text, 
                mediaUrls, 
                feeling, 
                taggedUsers.length > 0 ? taggedUsers : null
            );

            setText('');
            setSelectedImage(null);
            setSelectedFile(null);
            setSelectedVideo(null);
            setSelectedVideoFile(null);
            setFeeling(null);
            setTaggedUsers([]);
            setIsFocused(false);
            setShowFeelingSelector(false);
            setShowTagSelector(false);

            onPostCreated?.();
        } catch (error: unknown) {
            console.error('Failed to post:', error);
            const message = error instanceof Error ? error.message : 'Không thể đăng bài viết';
            alert(message);
        } finally {
            setIsPosting(false);
        }
    };

    const canPost = text.trim().length > 0 || selectedImage || selectedVideo;
    const initials = currentUser
        ? `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`.toUpperCase()
        : 'LC';

    const avatarUrl = currentUser?.avatar_url
        ? (currentUser.avatar_url.startsWith('http') ? currentUser.avatar_url : `${API_URL}${currentUser.avatar_url}`)
        : null;

    const renderAvatar = (size = "h-14 w-14") => (
        avatarUrl ? (
            <img src={avatarUrl} className={`${size} rounded-[22px] object-cover`} alt="Avatar" />
        ) : (
            <div className={`flex ${size} shrink-0 items-center justify-center rounded-[22px] bg-[#D9ECF8]`}>
                <ThemedText as="span" className="text-base font-semibold text-slate-900">{initials}</ThemedText>
            </div>
        )
    );

    const [showMoreOptions, setShowMoreOptions] = useState(false);

    return (
        <>
            {/* The Trigger Card (Always visible) */}
            <section
                className="rounded-[32px] border border-slate-200/60 bg-white p-6 cursor-text hover:border-slate-300 hover:shadow-sm transition-all duration-300 group"
                onClick={() => setIsFocused(true)}
            >
                <div className="flex items-center gap-5">
                    {renderAvatar("h-11 w-11")}
                    <div className="flex-1 rounded-[18px] bg-slate-50 px-5 py-3.5 text-slate-400 font-medium group-hover:bg-slate-100/80 transition-colors">
                        Chia sẻ suy nghĩ của bạn!
                    </div>
                    <div className="flex gap-2">
                        <button className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-slate-50 text-[#41A36D] hover:bg-[#EAFBF0] hover:text-[#2E7D51] transition-all active:scale-90">
                            <ImageSquare size={22} weight="regular" />
                        </button>
                    </div>
                </div>
            </section>

            {/* The Expanded Modal/Popup */}
            {isFocused && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Blurred Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-950/20 backdrop-blur-md transition-opacity"
                        onClick={() => {
                            if (!canPost || confirm('Hủy bài viết đang soạn?')) {
                                setIsFocused(false);
                            }
                        }}
                    />

                    {/* Modal Content */}
                    <div className="relative w-full max-w-[620px] animate-in fade-in zoom-in duration-300 rounded-[32px] border border-slate-200/60 bg-white shadow-[0_24px_48px_-12px_rgba(0,0,0,0.15)] overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-white/90 backdrop-blur-md">
                            <ThemedText as="h2" className="text-[19px] font-bold text-slate-950 tracking-tight">Tạo bài viết mới</ThemedText>
                            <button
                                onClick={() => setIsFocused(false)}
                                className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200"
                            >
                                <X size={20} weight="bold" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-7 max-h-[70vh] overflow-y-auto scrollbar-hide">
                            <div className="flex items-start gap-4 mb-4">
                                {renderAvatar("h-12 w-12")}
                                <div className="flex flex-col gap-0.5">
                                    <ThemedText as="span" className="font-bold text-[16px] text-slate-950 tracking-tight">
                                        {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Người dùng'}
                                        {feeling && (
                                            <span className="font-normal text-slate-500 text-sm">
                                                {' '}đang cảm thấy <span className="font-bold text-slate-800">{feeling}</span>
                                            </span>
                                        )}
                                    </ThemedText>
                                    <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider self-start">
                                        <GlobeHemisphereWest size={13} weight="regular" />
                                        Công khai
                                    </div>
                                </div>
                            </div>

                            {/* Tagged Friends Preview */}
                            {taggedUsers.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-4 items-center pl-1 bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100">
                                    <span className="text-xs font-bold text-slate-400 mr-1 pl-1">Cùng với:</span>
                                    {taggedUsers.map((user) => (
                                        <div key={user.id} className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 transition-colors pl-2.5 pr-1.5 py-1 rounded-xl text-xs font-bold text-slate-700 border border-slate-100 shadow-sm">
                                            <span>{user.first_name} {user.last_name}</span>
                                            <button
                                                onClick={() => setTaggedUsers(prev => prev.filter(u => u.id !== user.id))}
                                                className="p-0.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition-colors"
                                            >
                                                <X size={12} weight="bold" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <textarea
                                ref={textareaRef}
                                className="w-full text-lg text-slate-900 outline-none placeholder:text-slate-400 resize-none"
                                placeholder="Bạn đang nghĩ gì?"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                rows={4}
                            />

                            {selectedImage && (
                                <div className="relative mt-4 overflow-hidden rounded-[24px] border border-[#E4E8EE]">
                                    <img
                                        src={selectedImage}
                                        className="h-auto max-h-[400px] w-full object-contain bg-slate-50"
                                        alt="Preview"
                                    />
                                    <button
                                        onClick={() => { setSelectedImage(null); setSelectedFile(null); }}
                                        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                                    >
                                        <X size={18} weight="bold" />
                                    </button>
                                </div>
                            )}

                            {selectedVideo && (
                                <div className="relative mt-4 overflow-hidden rounded-[24px] border border-[#E4E8EE] bg-black">
                                    <video
                                        src={selectedVideo}
                                        controls
                                        className="h-auto max-h-[400px] w-full object-contain"
                                    />
                                    <button
                                        onClick={() => { setSelectedVideo(null); setSelectedVideoFile(null); }}
                                        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                                    >
                                        <X size={18} weight="bold" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Footer / Actions */}
                        <div className="p-6 pt-0">
                            <div className="rounded-2xl border border-[#E4E8EE] bg-[#FDFDFF] p-3 mb-4">
                                <div className="flex items-center justify-between">
                                    <ThemedText as="span" className="text-sm font-bold text-slate-600 pl-1">Thêm vào bài viết</ThemedText>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*,video/*"
                                            onChange={handleFileChange}
                                        />
                                        
                                        <button
                                            onClick={handlePickMedia}
                                            className="flex h-10 px-3 items-center gap-2 rounded-xl hover:bg-slate-100 text-[#41A36D] transition-colors"
                                        >
                                            <ImageSquare size={22} weight="regular" />
                                            <ThemedText as="span" className="text-[13px] font-bold text-slate-700">Ảnh / Video</ThemedText>
                                        </button>
                                        
                                        <button
                                            onClick={() => setShowMoreOptions(!showMoreOptions)}
                                            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${showMoreOptions ? 'bg-slate-200 text-slate-900' : 'hover:bg-slate-100 text-slate-500'}`}
                                        >
                                            <DotsThree size={20} weight="bold" />
                                        </button>
                                    </div>
                                </div>

                                {showMoreOptions && (
                                    <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 animate-in slide-in-from-top-2 duration-200">
                                        <button 
                                            onClick={() => {
                                                setShowFeelingSelector(!showFeelingSelector);
                                                setShowTagSelector(false);
                                            }}
                                            className={`flex items-center gap-2 rounded-xl p-2 hover:bg-slate-100 transition-colors ${showFeelingSelector ? 'bg-slate-100' : ''}`}
                                        >
                                            <Smiley className="text-[#F9A825]" size={20} weight="fill" />
                                            <ThemedText as="span" className="text-[13px] font-bold text-slate-700">Cảm xúc</ThemedText>
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setShowTagSelector(!showTagSelector);
                                                setShowFeelingSelector(false);
                                            }}
                                            className={`flex items-center gap-2 rounded-xl p-2 hover:bg-slate-100 transition-colors ${showTagSelector ? 'bg-slate-100' : ''}`}
                                        >
                                            <UserPlus className="text-[#4A9FD8]" size={20} weight="regular" />
                                            <ThemedText as="span" className="text-[13px] font-bold text-slate-700">Gắn thẻ</ThemedText>
                                        </button>
                                    </div>
                                )}

                                {/* Feeling Selector panel */}
                                {showFeelingSelector && (
                                    <div className="mt-2.5 p-3 rounded-2xl border border-slate-100 bg-slate-50 animate-in slide-in-from-top-2 duration-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-1">Bạn đang cảm thấy thế nào?</span>
                                            <button onClick={() => setShowFeelingSelector(false)} className="text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-200">
                                                <X size={14} weight="bold" />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {FEELINGS.map((feel) => (
                                                <button
                                                    key={feel.label}
                                                    onClick={() => {
                                                        setFeeling(`${feel.emoji} ${feel.label}`);
                                                        setShowFeelingSelector(false);
                                                    }}
                                                    className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-100 text-xs font-bold text-slate-700 transition-all hover:scale-[1.02] shadow-sm active:scale-95"
                                                >
                                                    <span>{feel.emoji}</span>
                                                    <span>{feel.label}</span>
                                                </button>
                                            ))}
                                            {feeling && (
                                                <button
                                                    onClick={() => {
                                                        setFeeling(null);
                                                        setShowFeelingSelector(false);
                                                    }}
                                                    className="col-span-4 flex items-center justify-center gap-1.5 p-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-100 text-xs font-bold text-red-600 transition-colors mt-1"
                                                >
                                                    <X size={14} weight="bold" />
                                                    <span>Xóa cảm xúc</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Tag selector panel */}
                                {showTagSelector && (
                                    <div className="mt-2.5 p-3 rounded-2xl border border-slate-100 bg-slate-50 animate-in slide-in-from-top-2 duration-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-1">Gắn thẻ bạn bè</span>
                                            <button onClick={() => setShowTagSelector(false)} className="text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-200">
                                                <X size={14} weight="bold" />
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Nhập tên tìm kiếm..."
                                            value={tagSearchQuery}
                                            onChange={(e) => setTagSearchQuery(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#4A9FD8] mb-2.5 font-medium transition-colors shadow-inner"
                                        />
                                        {searchingTags && (
                                            <div className="text-[11px] font-bold text-[#4A9FD8] text-center py-2 animate-pulse">
                                                Đang tìm kiếm...
                                            </div>
                                        )}
                                        <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1 scrollbar-hide">
                                            {tagSearchResults.length === 0 && tagSearchQuery.trim() !== '' && !searchingTags && (
                                                <div className="text-xs text-slate-400 text-center py-2 font-medium">Không tìm thấy kết quả nào</div>
                                            )}
                                            {tagSearchResults.map((user) => {
                                                const isTagged = taggedUsers.some(u => u.id === user.id);
                                                const userInitials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
                                                return (
                                                    <button
                                                        key={user.id}
                                                        onClick={() => {
                                                            if (isTagged) {
                                                                setTaggedUsers(prev => prev.filter(u => u.id !== user.id));
                                                            } else {
                                                                setTaggedUsers(prev => [...prev, user]);
                                                            }
                                                        }}
                                                        className={`w-full flex items-center justify-between p-2 rounded-xl transition-all border ${isTagged ? 'bg-[#EAF4FB] border-[#4A9FD8]/30 hover:bg-[#DDEFFC]' : 'bg-white hover:bg-slate-100 border-slate-100 shadow-sm'}`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {user.avatar_url ? (
                                                                <img
                                                                    src={user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}`}
                                                                    className="h-8 w-8 rounded-[12px] object-cover"
                                                                    alt={user.full_name}
                                                                />
                                                            ) : (
                                                                <div className="flex h-8 w-8 items-center justify-center rounded-[12px] bg-[#D9ECF8] text-[11px] font-bold text-slate-900">
                                                                    {userInitials}
                                                                </div>
                                                            )}
                                                            <span className="text-xs font-bold text-slate-800">{user.full_name}</span>
                                                        </div>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${isTagged ? 'bg-[#4A9FD8] text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                            {isTagged ? 'Đã gắn thẻ' : 'Gắn thẻ'}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handlePost}
                                disabled={!canPost || isPosting}
                                className={`w-full flex items-center justify-center gap-2 rounded-2xl bg-[#0A0A0A] py-4 text-white font-bold transition-all ${(!canPost || isPosting) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800'}`}
                            >
                                {isPosting ? (
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                    "Đăng bài"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
