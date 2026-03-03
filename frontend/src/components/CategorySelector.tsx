import React from 'react';
import { Category } from '@/types';
import { Icon } from '@/components/Icon';
import { getValidIcon } from '@/utils/icons';

interface CategorySelectorProps {
  categories: Category[];
  selectedId: string;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  quickCount?: number;
  className?: string;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedId,
  onSelect,
  isLoading = false,
  quickCount = 0,
  className = '',
}) => {

  /* SKELETON STATE */
  if (isLoading) {
    return (
      <div className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 ${className}`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse flex flex-col items-center gap-2 p-3">
            <div className="size-14 rounded-2xl bg-app-subtle" />
            <div className="h-2.5 w-12 bg-app-subtle rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  /* EMPTY STATE */
  if (!categories || categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-app-subtle/30 rounded-2xl border border-dashed border-app-border text-center">
        <Icon name="category_search" size={32} className="text-app-muted mb-2 opacity-50" />
        <p className="text-xs text-app-muted font-medium">Sin categorías disponibles</p>
      </div>
    );
  }

  const quickCategories = quickCount > 0 ? categories.slice(0, quickCount) : [];
  const restCategories = quickCount > 0 ? categories.slice(quickCount) : categories;

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* QUICK CATEGORIES (first N as large buttons for 1-tap selection) */}
      {quickCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quickCategories.map((cat) => {
            const isSelected = selectedId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelect(cat.id)}
                className={`
                  min-h-[44px] px-4 py-2.5 rounded-2xl flex items-center gap-2.5
                  transition-all duration-200 outline-none border-2
                  ${isSelected
                    ? 'scale-[1.02] shadow-md'
                    : 'bg-app-subtle/60 border-transparent hover:bg-app-subtle active:scale-95'
                  }
                `}
                style={{
                  backgroundColor: isSelected ? `${cat.color}20` : undefined,
                  borderColor: isSelected ? cat.color : undefined,
                  color: isSelected ? cat.color : undefined,
                }}
              >
                <Icon name={getValidIcon(cat.icon)} size={20} />
                <span className="text-sm font-bold">{cat.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* FULL GRID */}
      <div className={`grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 sm:gap-3 pb-safe-offset-2 overflow-y-auto max-h-[200px] custom-scrollbar`}>
        {restCategories.map((cat) => {
          const isSelected = selectedId === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelect(cat.id)}
              className={`
              relative flex flex-col items-center justify-center min-h-[72px] min-w-[60px] p-2 rounded-2xl transition-all duration-200 outline-none select-none
              ${isSelected ? '-translate-y-1' : 'hover:bg-app-subtle/50 active:scale-95'}
            `}
            >
              {/* Icon Box */}
              <div
                className={`
                size-12 rounded-2xl flex items-center justify-center text-[22px] transition-all duration-300
                ${isSelected
                    ? 'border-2 scale-105'
                    : 'bg-app-subtle/40 border border-transparent'
                  }
              `}
                style={{
                  backgroundColor: isSelected ? `${cat.color}20` : undefined, // 20% opacity tint
                  color: cat.color,
                  borderColor: isSelected ? cat.color : 'transparent',
                  boxShadow: isSelected ? `0 4px 12px -2px ${cat.color}40` : undefined,
                }}
              >
                <Icon name={getValidIcon(cat.icon)} size={22} />
              </div>

              {/* Label */}
              <span className={`
                text-[10px] text-center w-full truncate font-medium transition-colors mt-1.5
                ${isSelected ? 'text-app-text font-bold' : 'text-app-muted'}
            `}>
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
