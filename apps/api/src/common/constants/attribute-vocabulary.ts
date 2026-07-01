/**
 * Static dimension vocabulary - Single Source of Truth
 *
 * All filter dimensions (except color) are defined here.
 * Color dimension is managed by the `colors` table (19 color families), NOT here.
 *
 * Consumers:
 *   - AI prompt builder (constrain AI output to valid values)
 *   - AI response parser / normalizer
 *   - Filter UI (frontend reads valid[] to render filter chips)
 *   - normalize-ai-attributes.ts migration script
 */

// ---------------------------------------------------------------------------
// Vocabulary definition
// ---------------------------------------------------------------------------

export const ATTRIBUTE_VOCABULARY = {
  gender: {
    type: 'single_select' as const,
    valid: ['Men', 'Women', 'Unisex', 'Kids'] as const,
    synonyms: {
      male: 'Men',
      man: 'Men',
      men: 'Men',
      female: 'Women',
      woman: 'Women',
      women: 'Women',
      unisex: 'Unisex',
      kids: 'Kids',
      kid: 'Kids',
      children: 'Kids',
      child: 'Kids',
      boy: 'Kids',
      girl: 'Kids',
      boys: 'Kids',
      girls: 'Kids',
      youth: 'Kids',
      toddler: 'Kids',
      infant: 'Kids',
    } as Record<string, string>,
  },

  style: {
    type: 'multi_select' as const,
    valid: [
      'Streetwear',
      'Casual',
      'Luxury',
      'Classic',
      'Sporty',
      'Minimalist',
      'Elegant',
      'Retro',
      'Athleisure',
      'Avant-Garde',
    ] as const,
    synonyms: {
      // --- Sporty ---
      basketball: 'Sporty',
      athletic: 'Sporty',
      sport: 'Sporty',
      'sporty casual': 'Sporty',
      technical: 'Sporty',
      performance: 'Sporty',
      utility: 'Sporty',
      motorsport: 'Sporty',
      outdoor: 'Sporty',

      // --- Luxury ---
      'luxury casual': 'Luxury',
      'luxury collaboration': 'Luxury',
      'high fashion': 'Luxury',
      designer: 'Luxury',
      premium: 'Luxury',
      'high-end': 'Luxury',

      // --- Classic ---
      heritage: 'Classic',
      timeless: 'Classic',
      traditional: 'Classic',
      preppy: 'Classic',
      aviation: 'Classic',

      // --- Casual ---
      contemporary: 'Casual',
      modern: 'Casual',
      resort: 'Casual',

      // --- Streetwear ---
      urban: 'Streetwear',
      street: 'Streetwear',
      'hip-hop': 'Streetwear',
      hiphop: 'Streetwear',
      chunky: 'Streetwear',
      graphic: 'Streetwear',
      collaborative: 'Streetwear',

      // --- Elegant ---
      feminine: 'Elegant',
      chic: 'Elegant',
      sophisticated: 'Elegant',

      // --- Retro ---
      vintage: 'Retro',
      'old school': 'Retro',
      throwback: 'Retro',

      // --- Minimalist ---
      simple: 'Minimalist',
      clean: 'Minimalist',
      basic: 'Minimalist',

      // --- Athleisure ---
      'gym casual': 'Athleisure',
      activewear: 'Athleisure',

      // --- Avant-Garde ---
      experimental: 'Avant-Garde',
      artistic: 'Avant-Garde',
      bold: 'Avant-Garde',
      deconstructed: 'Avant-Garde',
    } as Record<string, string>,
  },

  occasion: {
    type: 'multi_select' as const,
    valid: [
      'Daily Wear',
      'Casual',
      'Sport',
      'Travel',
      'Party',
      'Formal',
      'Outdoor',
      'School',
    ] as const,
    synonyms: {
      // --- Party (fashion events / nightlife / social) ---
      fashion: 'Casual',
      'fashion event': 'Party',
      'fashion events': 'Party',
      'fashion statement': 'Party',
      'fashion show': 'Party',
      'fashion forward': 'Casual',
      'night out': 'Party',
      'evening out': 'Party',
      'evening wear': 'Party',
      evening: 'Party',
      'social gatherings': 'Party',
      'social gathering': 'Party',
      'date night': 'Party',
      cocktail: 'Party',
      'cocktail party': 'Party',
      'art events': 'Party',

      // --- Formal ---
      business: 'Formal',
      'business casual': 'Formal',
      'smart casual': 'Formal',
      'smart-casual': 'Formal',
      'formal events': 'Formal',
      'formal event': 'Formal',
      wedding: 'Formal',
      office: 'Formal',
      work: 'Formal',

      // --- Casual ---
      'street style': 'Casual',
      'casual wear': 'Casual',
      weekend: 'Casual',
      lunch: 'Casual',
      gift: 'Casual',
      driving: 'Casual',
      layering: 'Casual',
      'car events': 'Casual',
      'fan apparel': 'Casual',

      // --- Daily Wear ---
      everyday: 'Daily Wear',
      'everyday wear': 'Daily Wear',
      daily: 'Daily Wear',
      commute: 'Daily Wear',
      'urban commuting': 'Daily Wear',

      // --- Sport ---
      sports: 'Sport',
      athletic: 'Sport',
      gym: 'Sport',
      workout: 'Sport',
      running: 'Sport',
      'light running': 'Sport',
      training: 'Sport',
      'soccer match': 'Sport',
      'match day': 'Sport',

      // --- Outdoor ---
      outdoors: 'Outdoor',
      hiking: 'Outdoor',
      camping: 'Outdoor',
      skiing: 'Outdoor',

      // --- School ---
      campus: 'School',
      college: 'School',
      university: 'School',

      // --- Travel ---
      vacation: 'Travel',
      holiday: 'Travel',
      resort: 'Travel',
    } as Record<string, string>,
  },

  season: {
    type: 'multi_select' as const,
    valid: ['Spring', 'Summer', 'Fall', 'Winter'] as const,
    synonyms: {
      spring: 'Spring',
      summer: 'Summer',
      fall: 'Fall',
      autumn: 'Fall',
      winter: 'Winter',
    } as Record<string, string>,
  },
} as const;

// ---------------------------------------------------------------------------
// Derived types
// ---------------------------------------------------------------------------

export type AttributeDimension = keyof typeof ATTRIBUTE_VOCABULARY;
export type GenderValue = (typeof ATTRIBUTE_VOCABULARY.gender.valid)[number];
export type StyleValue = (typeof ATTRIBUTE_VOCABULARY.style.valid)[number];
export type OccasionValue =
  (typeof ATTRIBUTE_VOCABULARY.occasion.valid)[number];
export type SeasonValue = (typeof ATTRIBUTE_VOCABULARY.season.valid)[number];
