// Fallback for using Phosphor Icons on Android, iOS and web.

import { House, PaperPlaneTilt, Bell, User, EnvelopeSimple, MagnifyingGlass, Code, CaretRight } from 'phosphor-react-native';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

/**
 * Mappings from SF Symbols name to Phosphor Icon components
 */
const MAPPING = {
  'house.fill': House,
  'paperplane.fill': PaperPlaneTilt,
  'chevron.left.forwardslash.chevron.right': Code,
  'chevron.right': CaretRight,
  'bell.fill': Bell,
  'envelope.fill': EnvelopeSimple,
  'person.fill': User,
  'magnifyingglass': MagnifyingGlass,
} as const;

type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses Phosphor Icons to ensure a premium, identical look 
 * across both mobile (iOS/Android) and web, matching the web styling perfectly.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const IconComponent = MAPPING[name];
  if (!IconComponent) return null;
  return <IconComponent color={color as string} size={size} weight="regular" style={style as any} />;
}
