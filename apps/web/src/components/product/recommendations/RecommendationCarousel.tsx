'use client';

import useEmblaCarousel from 'embla-carousel-react';
import ProductCard from '@/components/ProductCard';
import type { ProductListItem } from '@/types';
import { OutboundSource } from '@/lib/search-tracking';

interface RecommendationCarouselProps {
  products: ProductListItem[];
}

export default function RecommendationCarousel({
  products,
}: RecommendationCarouselProps) {
  const [emblaRef] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
  });

  return (
    <div ref={emblaRef} className="overflow-hidden -mx-4">
      <div className="flex gap-3 px-4">
        {products.map((product, index) => (
          <div key={product.id} className="flex-[0_0_42%] min-w-0">
            <ProductCard
              product={product}
              source={OutboundSource.RECOMMENDATION}
              position={index + 1}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
