import { Text, type TextProps } from 'react-native';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'eyebrow';
};

export function ThemedText({
  className,
  style,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const textClassName = [
    'text-slate-900',
    type === 'default' ? 'text-base leading-6' : '',
    type === 'title' ? 'text-3xl font-bold leading-9' : '',
    type === 'defaultSemiBold' ? 'text-base font-semibold leading-6' : '',
    type === 'subtitle' ? 'text-xl font-bold leading-7' : '',
    type === 'link' ? 'text-base leading-6 text-blue-600' : '',
    type === 'eyebrow' ? 'text-xs font-semibold uppercase tracking-[1.5px] text-slate-500' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Text
      className={textClassName}
      style={style}
      {...rest}
    />
  );
}
