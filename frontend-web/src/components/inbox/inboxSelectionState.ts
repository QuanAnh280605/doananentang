export function resolveInboxSelectionAfterSearchClears<TUser>(selectedUser: TUser | null): TUser | null {
  return selectedUser;
}

export function resolveInboxSelectionAfterThreadRefresh<
  TUser extends { id: number },
  TThread extends { user: TUser },
>(selectedUser: TUser | null, nextThreads: readonly TThread[]): TUser | null {
  if (selectedUser === null) {
    return null;
  }

  return nextThreads.find((item) => item.user.id === selectedUser.id)?.user ?? selectedUser;
}

export function ensureThreadStaysInInboxContext<TThread extends { user: { id: number } }>(
  visibleThreads: readonly TThread[],
  selectedThread: TThread,
): TThread[] {
  if (visibleThreads.some((item) => item.user.id === selectedThread.user.id)) {
    return [...visibleThreads];
  }

  return [selectedThread, ...visibleThreads];
}
