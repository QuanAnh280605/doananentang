'use client';

import { useState, useRef, useEffect } from 'react';
import { createPost, uploadPostMedia, API_URL } from '@/lib/api';
import type { AuthUser } from '@/lib/auth';
import { ThemedText } from '@/components/ui/ThemedText';
import { compressToWebP } from '@/lib/image';

export function ComposerCard({ onPostCreated, currentUser }: { onPostCreated?: () => void; currentUser?: AuthUser | null }) {
    const [text, setText] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

    const handlePickPhoto = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setSelectedImage(URL.createObjectURL(file));
            // Automatically open expanded view if not already
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
            }

            await createPost(text, mediaUrls);

            setText('');
            setSelectedImage(null);
            setSelectedFile(null);
            setIsFocused(false);

            onPostCreated?.();
        } catch (error: unknown) {
            console.error('Failed to post:', error);
            const message = error instanceof Error ? error.message : 'Không thể đăng bài viết';
            alert(message);
        } finally {
            setIsPosting(false);
        }
    };

    const canPost = text.trim().length > 0 || selectedImage;
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
                            <span className="material-icons text-[22px]">image</span>
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
                                <span className="material-icons text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-7 max-h-[70vh] overflow-y-auto scrollbar-hide">
                            <div className="flex items-start gap-4 mb-6">
                                {renderAvatar("h-12 w-12")}
                                <div className="flex flex-col gap-0.5">
                                    <ThemedText as="span" className="font-bold text-[16px] text-slate-950 tracking-tight">
                                        {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Người dùng'}
                                    </ThemedText>
                                    <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <span className="material-icons text-[13px]">public</span>
                                        Công khai
                                    </div>
                                </div>
                            </div>

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
                                        <span className="material-icons text-[18px]">close</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Footer / Actions */}
                        <div className="p-6 pt-0">
                            <div className="rounded-2xl border border-[#E4E8EE] bg-[#FDFDFF] p-3 mb-4">
                                <div className="flex items-center justify-between">
                                    <ThemedText as="span" className="text-sm font-bold text-slate-600 pl-1">Thêm vào bài viết</ThemedText>
                                    <div className="flex items-center">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                        />
                                        <button
                                            onClick={handlePickPhoto}
                                            className="flex h-10 px-3 items-center gap-2 rounded-xl hover:bg-slate-100 text-[#41A36D] transition-colors"
                                        >
                                            <span className="material-icons text-[22px]">image</span>
                                            <ThemedText as="span" className="text-[13px] font-bold text-slate-700">Ảnh</ThemedText>
                                        </button>
                                        <button className="flex h-10 px-3 items-center gap-2 rounded-xl hover:bg-slate-100 text-[#D05B5B] transition-colors">
                                            <span className="material-icons text-[22px]">videocam</span>
                                            <ThemedText as="span" className="text-[13px] font-bold text-slate-700">Video</ThemedText>
                                        </button>
                                        <button
                                            onClick={() => setShowMoreOptions(!showMoreOptions)}
                                            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${showMoreOptions ? 'bg-slate-200 text-slate-900' : 'hover:bg-slate-100 text-slate-500'}`}
                                        >
                                            <span className="material-icons">more_horiz</span>
                                        </button>
                                    </div>
                                </div>

                                {showMoreOptions && (
                                    <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 animate-in slide-in-from-top-2 duration-200">
                                        <button className="flex items-center gap-2 rounded-xl p-2 hover:bg-slate-100 transition-colors">
                                            <span className="material-icons text-[#F02849]">location_on</span>
                                            <ThemedText as="span" className="text-[13px] font-medium text-slate-700">Check in</ThemedText>
                                        </button>
                                        <button className="flex items-center gap-2 rounded-xl p-2 hover:bg-slate-100 transition-colors">
                                            <span className="material-icons text-[#F9A825]">emoji_emotions</span>
                                            <ThemedText as="span" className="text-[13px] font-medium text-slate-700">Cảm xúc</ThemedText>
                                        </button>
                                        <button className="flex items-center gap-2 rounded-xl p-2 hover:bg-slate-100 transition-colors">
                                            <span className="material-icons text-[#1877F2]">person_add</span>
                                            <ThemedText as="span" className="text-[13px] font-medium text-slate-700">Gắn thẻ</ThemedText>
                                        </button>
                                        <button className="flex items-center gap-2 rounded-xl p-2 hover:bg-slate-100 transition-colors">
                                            <span className="material-icons text-[#2ABBA7]">gif_box</span>
                                            <ThemedText as="span" className="text-[13px] font-medium text-slate-700">File GIF</ThemedText>
                                        </button>
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
