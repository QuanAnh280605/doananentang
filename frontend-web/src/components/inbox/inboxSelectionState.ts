export function resolveInboxSelectionAfterSearchClears<TUser>(selectedUser: TUser | null): TUser | null {
  return selectedUser;
}

export function resolveInboxSelectionAfterThreadRefresh<
  TUser extends { id: number },
  TThread extends { user: TUser | null },
>(selectedUser: TUser | null, nextThreads: readonly TThread[]): TUser | null {
  if (selectedUser === null) {
    return null;
  }

  return nextThreads.find((item) => item.user?.id === selectedUser.id)?.user ?? selectedUser;
}

export function ensureThreadStaysInInboxContext<TThread extends { user: { id: number } | null; chatId?: string | null }>(
  visibleThreads: readonly TThread[],
  selectedThread: TThread,
): TThread[] {
  const threadKey = selectedThread.chatId ?? (selectedThread.user ? String(selectedThread.user.id) : null);

  if (!threadKey) {
    return [selectedThread, ...visibleThreads];
  }

  if (visibleThreads.some((item) => (item.chatId ?? (item.user ? String(item.user.id) : null)) === threadKey)) {
    return [...visibleThreads];
  }

  return [selectedThread, ...visibleThreads];
}
