/**
 * 筛选组件常量
 */

// 多选筛选参数 key（逗号分隔的多值参数）
export const MULTI_SELECT_FILTER_KEYS = [
  'categories', 'brands', 'colors', 'genders',
  'styles', 'occasions', 'seasons',
] as const;

// 所有筛选参数 key（含价格）
export const ALL_FILTER_KEYS = [
  ...MULTI_SELECT_FILTER_KEYS, 'minPrice', 'maxPrice',
] as const;

// 默认显示数量
export const DEFAULT_SHOW_COUNT = 5;
export const DEFAULT_COLOR_SHOW_COUNT = 8;

// 颜色名称到色值的映射
export const COLOR_MAP: Record<string, string> = {
  // 基础色
  'Black': '#000000',
  'White': '#FFFFFF',
  'Red': '#E53935',
  'Blue': '#1E88E5',
  'Green': '#43A047',
  'Yellow': '#FDD835',
  'Orange': '#FB8C00',
  'Purple': '#8E24AA',
  'Pink': '#EC407A',
  'Brown': '#6D4C41',
  'Gray': '#757575',
  'Grey': '#757575',
  // 深浅色
  'Navy Blue': '#1A237E',
  'Light Blue': '#03A9F4',
  'Dark Blue': '#0D47A1',
  'Sky Blue': '#87CEEB',
  'Royal Blue': '#4169E1',
  'Dark Green': '#1B5E20',
  'Light Green': '#8BC34A',
  'Mint Green': '#98FF98',
  'Olive': '#808000',
  'Teal': '#009688',
  'Dark Red': '#B71C1C',
  'Wine': '#722F37',
  'Burgundy': '#800020',
  'Coral': '#FF7F50',
  'Salmon': '#FA8072',
  'Beige': '#F5F5DC',
  'Cream': '#FFFDD0',
  'Ivory': '#FFFFF0',
  'Khaki': '#C3B091',
  'Tan': '#D2B48C',
  'Gold': '#FFD700',
  'Silver': '#C0C0C0',
  'Rose Gold': '#B76E79',
  'Lavender': '#E6E6FA',
  'Maroon': '#800000',
  'Navy': '#000080',
  'Charcoal': '#36454F',
  'Off-White': '#FAF9F6',
  // 军绿
  'Army Green': '#4B5320',
  // 多色/特殊
  'Multicolor': 'linear-gradient(135deg, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4)',
  'Multi': 'linear-gradient(135deg, #FF6B6B, #4ECDC4, #45B7D1, #96CEB4)',
  'Transparent': 'repeating-conic-gradient(#d9d9d9 0% 25%, #fff 0% 50%) 0 0 / 8px 8px',
};

// 浅色列表（需要边框）
export const LIGHT_COLORS = ['white', 'off-white', 'cream', 'ivory', 'beige', 'transparent'];

// 获取颜色的显示样式
export const getColorStyle = (colorName: string): React.CSSProperties => {
  const color = COLOR_MAP[colorName];
  const lowerName = colorName.toLowerCase();
  const isLight = LIGHT_COLORS.includes(lowerName);

  return {
    width: 16,
    height: 16,
    borderRadius: '50%',
    display: 'inline-block',
    marginRight: 8,
    border: isLight ? '1px solid #d9d9d9' : 'none',
    background: color || '#ccc',
    flexShrink: 0,
  };
};
