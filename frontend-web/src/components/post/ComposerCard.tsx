'use client';

import Image from 'next/image';
import { useState, useRef } from 'react';
import { createPost, uploadPostMedia, resolveAvatarUrl } from '@/lib/api';
import type { AuthUser } from '@/lib/auth';
import { ThemedText } from '@/components/ui/ThemedText';

export function ComposerCard({ onPostCreated, currentUser }: { onPostCreated?: () => void; currentUser?: AuthUser | null }) {
    const [text, setText] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [isPosting, setIsPosting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePickPhoto = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setSelectedImage(URL.createObjectURL(file));
        }
    };

    const handlePost = async () => {
        if (isPosting) return;
        setIsPosting(true);
        try {
            let mediaUrls: string[] = [];
            if (selectedFile) {
                const uploadRes = await uploadPostMedia(selectedFile);
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

    const avatarUrl = resolveAvatarUrl(currentUser?.avatar_url);

    return (
        <section className="rounded-[28px] border border-[#E4E8EE] bg-white p-5">
            <div className="flex items-start gap-4">
                {avatarUrl ? (
                    <Image src={avatarUrl} width={56} height={56} className="h-14 w-14 rounded-[22px] object-cover" alt="Avatar" unoptimized />
                ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-[#D9ECF8]">
                        <ThemedText as="span" className="text-base font-semibold text-slate-900">{initials}</ThemedText>
                    </div>
                )}
                <div className="flex-1">
                    <textarea
                        className="w-full rounded-[24px] bg-[#F7F8FA] px-5 py-4 text-base text-slate-900 outline-none placeholder:text-slate-400 resize-none transition-all"
                        placeholder="Share a project update, a photo, or a thought"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        style={{ minHeight: isFocused ? '100px' : '56px' }}
                    />
                </div>
            </div>

            {selectedImage && (
                <div className="relative mt-4 overflow-hidden rounded-[24px]">
                    {/* Use native img for blob URLs — next/image does not support blob: scheme */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={selectedImage}
                        className="h-auto max-h-[500px] w-full rounded-[24px] object-contain bg-slate-50"
                        alt="Preview"
                    />
                    <button
                        type="button"
                        onClick={() => { setSelectedImage(null); setSelectedFile(null); }}
                        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                        <span className="material-icons text-[18px]">close</span>
                    </button>
                </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#E4E8EE] pt-4">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                />
                
                <button
                    onClick={() => {}}
                    className="flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-[20px] bg-[#F7F8FA] px-4 py-4 hover:bg-[#F1F5F9] transition-colors"
                >
                    <span className="material-icons text-[20px] text-[#D05B5B]">videocam</span>
                    <ThemedText as="span" className="text-base font-medium text-slate-900">Live</ThemedText>
                </button>

                <button
                    onClick={handlePickPhoto}
                    className="flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-[20px] bg-[#F7F8FA] px-4 py-4 hover:bg-[#F1F5F9] transition-colors"
                >
                    <span className="material-icons text-[20px] text-[#41A36D]">image</span>
                    <ThemedText as="span" className="text-base font-medium text-slate-900">Photo</ThemedText>
                </button>

                <button
                    onClick={() => {}}
                    className="flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-[20px] bg-[#F7F8FA] px-4 py-4 hover:bg-[#F1F5F9] transition-colors"
                >
                    <span className="material-icons text-[20px] text-[#4A9FD8]">edit_note</span>
                    <ThemedText as="span" className="text-base font-medium text-slate-900">Write note</ThemedText>
                </button>

                {canPost && (
                    <button
                        onClick={handlePost}
                        disabled={isPosting}
                        className={`flex items-center justify-center gap-2 rounded-[20px] bg-[#0A0A0A] px-8 py-4 text-white hover:bg-slate-800 transition-colors ${isPosting ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {isPosting ? (
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                            <>
                                <span className="material-icons text-[18px]">send</span>
                                <span className="text-base font-medium">Post</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </section>
    );
}
