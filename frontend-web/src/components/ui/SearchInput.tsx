type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
  showClearButton?: boolean;
  autoFocus?: boolean;
};

export function SearchInput({
  value,
  onChange,
  onFocus,
  placeholder = 'Search',
  className = '',
  showClearButton = true,
  autoFocus = false,
}: SearchInputProps) {
  const shouldShowClearButton = showClearButton && value.length > 0;

  return (
    <div
      className={`flex items-center gap-3 rounded-[24px] border border-[#D6DEE8] bg-[#F7FAFC] px-4 py-3 ${className}`}>
      <span className="text-[#64748B]">⌕</span>
      <input
        className="no-focus-ring flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-[#94A3B8] focus:outline-none focus:shadow-none focus:ring-0 [box-shadow:none!important]"
        style={{ outline: 'none', boxShadow: 'none' }}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        value={value}
        autoFocus={autoFocus}
      />
      {shouldShowClearButton ? (
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E5ECF4] text-sm text-[#475569] transition hover:bg-[#d9e3ef]"
          onClick={() => onChange('')}
          type="button"
          aria-label="Clear search">
          ×
        </button>
      ) : null}
    </div>
  );
}
