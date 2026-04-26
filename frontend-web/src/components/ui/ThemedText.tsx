import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

type TextType = 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'eyebrow';

type ThemedTextProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
  type?: TextType;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>;

export function ThemedText<T extends ElementType = 'p'>({
  as,
  children,
  className,
  type = 'default',
  ...rest
}: ThemedTextProps<T>) {
  const Component = as ?? 'p';
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
    <Component className={textClassName} {...rest}>
      {children}
    </Component>
  );
}
