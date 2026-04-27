import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Platform, Pressable, TextInput, View } from 'react-native';

type SearchInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
  showClearButton?: boolean;
  autoFocus?: boolean;
};

export function SearchInput({
  value,
  onChangeText,
  onFocus,
  placeholder = 'Search',
  className = '',
  showClearButton = true,
  autoFocus = false,
}: SearchInputProps) {
  const shouldShowClearButton = showClearButton && value.length > 0;

  return (
    <View
      className={`flex-row items-center gap-3 rounded-[24px] border border-[#D6DEE8] bg-[#F7FAFC] px-4 py-3 ${className}`}>
      <MaterialIcons color="#64748B" name="search" size={20} />
      <TextInput
        className="flex-1 text-base text-slate-900 outline-none"
        style={Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : undefined}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        selectionColor="#4A9FD8"
        value={value}
        autoFocus={autoFocus}
      />
      {shouldShowClearButton ? (
        <Pressable
          className="h-8 w-8 items-center justify-center rounded-full bg-[#E5ECF4] active:opacity-80"
          onPress={() => onChangeText('')}>
          <MaterialIcons color="#475569" name="close" size={16} />
        </Pressable>
      ) : null}
    </View>
  );
}
