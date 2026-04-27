'use client';

import { useEffect, useState } from 'react';
import { fetchPostLikers, API_URL } from '@/lib/api';
import { ThemedText } from '@/components/ui/ThemedText';

export function InteractionsModal({
    postId,
    onClose
}: {
    postId: string;
    onClose: () => void;
}) {
    const [likers, setLikers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPostLikers(postId).then(res => {
            setLikers(res.users);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [postId]);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6">
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-500" onClick={onClose} />
            <div className="relative w-full max-w-[500px] bg-white/95 backdrop-blur-xl rounded-[40px] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] animate-in zoom-in-95 duration-300">
                <div className="border-b border-slate-100 p-7 flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                        <ThemedText as="h3" className="text-[20px] font-bold text-slate-950 tracking-tight">Người đã thích</ThemedText>
                        <ThemedText as="span" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{likers.length} Lượt thích</ThemedText>
                    </div>
                    <button onClick={onClose} className="h-11 w-11 flex items-center justify-center rounded-[16px] bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-950 active:scale-90 transition-all duration-300">
                        <span className="material-icons text-[24px]">close</span>
                    </button>
                </div>

                <div className="max-h-[500px] overflow-y-auto p-4 space-y-2 scrollbar-hide">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-100 border-t-[#4A9FD8]" />
                            <ThemedText className="text-[14px] font-bold text-slate-400">Đang tải danh sách...</ThemedText>
                        </div>
                    ) : likers.length === 0 ? (
                        <div className="py-24 text-center">
                            <div className="h-16 w-16 mx-auto mb-5 flex items-center justify-center rounded-[24px] bg-slate-50 text-slate-200">
                                <span className="material-icons text-[32px]">favorite_border</span>
                            </div>
                            <ThemedText className="text-[15px] font-bold text-slate-400">Chưa có ai thích bài viết này</ThemedText>
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            {likers.map(user => (
                                <div key={user.id} className="flex items-center gap-4 p-4 rounded-[26px] hover:bg-slate-50 transition-all duration-300 group">
                                    <div className="relative">
                                        {user.avatar_url ? (
                                            <img 
                                                src={user.avatar_url.startsWith('http') ? user.avatar_url : `${API_URL}${user.avatar_url}`} 
                                                className="h-13 w-13 rounded-[18px] object-cover ring-0 group-hover:ring-4 ring-white transition-all duration-500 shadow-sm" 
                                                alt="avatar" 
                                            />
                                        ) : (
                                            <div className="h-13 w-13 rounded-[18px] bg-gradient-to-br from-[#D9ECF8] to-[#F1F5F9] flex items-center justify-center font-bold text-slate-900 group-hover:scale-105 transition-transform duration-500">
                                                {user.first_name?.[0]}{user.last_name?.[0]}
                                            </div>
                                        )}
                                        <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-[#4A9FD8] border-[2.5px] border-white shadow-sm flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-transform duration-500">
                                            <span className="material-icons text-[12px]">thumb_up</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <ThemedText as="p" className="font-bold text-[16px] text-slate-950 group-hover:text-[#4A9FD8] transition-colors">
                                            {user.first_name} {user.last_name}
                                        </ThemedText>
                                        <ThemedText className="text-[12px] font-semibold text-slate-400">@{user.first_name?.toLowerCase()}{user.id.toString().slice(0, 4)}</ThemedText>
                                    </div>
                                    <button className="rounded-full bg-slate-900 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[#4A9FD8] active:scale-95 transition-all duration-300 shadow-lg shadow-slate-900/10">
                                        Theo dõi
                                    </button>
                                </div>
                            ))}
                        </div>
                    )
                    }
                </div>
                
                <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                    <ThemedText className="text-[12px] text-center font-bold text-slate-400 uppercase tracking-[0.2em]">Cộng đồng kết nối</ThemedText>
                </div>
            </div>
        </div>
    );
}
