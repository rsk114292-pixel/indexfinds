/**
 * 品牌LOGO特征库 (精简版)
 *
 * 只保留最关键的LOGO识别信息，避免提示词过长
 */

export interface BrandLogoFeature {
  name: string;
  logo: string; // 简短的LOGO描述
}

/**
 * 常见品牌LOGO特征（精简）
 */
export const BRAND_LOGO_FEATURES: BrandLogoFeature[] = [
  // 奢侈品牌
  { name: 'Louis Vuitton', logo: 'LV字母标志、Monogram老花图案' },
  { name: 'Gucci', logo: 'GG双G互锁标志、红绿条纹' },
  { name: 'Dior', logo: 'DIOR文字、CD标志、Oblique斜纹' },
  { name: 'Prada', logo: 'PRADA三角标牌' },
  { name: 'Balenciaga', logo: 'BALENCIAGA文字、BB标志' },
  { name: 'Versace', logo: '美杜莎头像' },
  { name: 'Dolce & Gabbana', logo: 'D&G或DG标志' },
  { name: 'Valentino', logo: 'VALENTINO文字、V标志、铆钉' },
  { name: 'Givenchy', logo: 'GIVENCHY文字、4G标志' },
  { name: 'Burberry', logo: 'BURBERRY文字、经典格纹' },
  { name: 'Fendi', logo: 'FENDI文字、FF双F标志' },
  { name: 'Bottega Veneta', logo: '编织皮革（无明显LOGO）' },
  { name: 'Moncler', logo: 'MONCLER文字+公鸡标志' },
  { name: 'Philipp Plein', logo: 'PP六边形、骷髅头' },
  { name: 'Alexander McQueen', logo: 'McQueen文字、厚底小白鞋' },
  { name: 'Hogan', logo: 'HOGAN文字、H字母装饰' },
  { name: 'Maison Margiela', logo: '四角缝线标签、Tabi分趾' },

  // 运动品牌
  { name: 'Nike', logo: 'Swoosh勾勾标志' },
  { name: 'Air Jordan', logo: 'Jumpman飞人标志、AJ编号' },
  { name: 'Adidas', logo: '三条纹、三叶草' },
  { name: 'Puma', logo: '跳跃美洲狮' },
  { name: 'New Balance', logo: 'N字母标志' },
  { name: 'Converse', logo: '五角星、All Star' },
  { name: 'Vans', logo: 'VANS文字、棋盘格' },

  // 潮牌
  { name: 'Supreme', logo: '红底白字BOX LOGO' },
  { name: 'Off-White', logo: '斜条纹箭头、引号设计' },
  { name: 'A Bathing Ape', logo: '猿人头像' },
  { name: 'Play Comme des Garcons', logo: '红心眼睛标志' },
];

/**
 * 生成简短的品牌识别提示
 */
export function generateBrandRecognitionPrompt(): string {
  const features = BRAND_LOGO_FEATURES.map((b) => `${b.name}: ${b.logo}`).join(
    '\n',
  );
  return `${features}

⚠️ 子品牌优先规则：当可以识别到更具体的子品牌时，始终输出子品牌名而非母品牌。
- 看到 Jumpman 飞人标志 → 输出 "Air Jordan"（不是 "Nike"）
- 看到 SB 标志或 SB Dunk → 输出 "Nike SB"（不是 "Nike"）
- 看到 Yeezy → 输出 "Adidas Yeezy"（不是 "Adidas"）
- 看到 Y-3 标志 → 输出 "Adidas Y-3"（不是 "Adidas"）
- 看到三叶草标志 → 输出 "Adidas Originals"（不是 "Adidas"）
- 看到红心眼睛 + Converse → 输出 "Converse x CDG"（不是 "Converse"）
只有无法确定子品牌时，才输出母品牌名（如普通 Nike Swoosh 鞋且无其他子品牌特征 → "Nike"）。`;
}

/**
 * 获取品牌名称列表
 */
export function getAllBrandNames(): string[] {
  return BRAND_LOGO_FEATURES.map((b) => b.name);
}
