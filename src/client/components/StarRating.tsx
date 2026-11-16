import React, { useState } from 'react';

interface StarRatingProps {
  value: number | null;
  onChange?: (rating: number | null) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 'md',
  showValue = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const displayRating = hoverRating !== null ? hoverRating : (value ?? 0);

  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  }[size];

  const handleStarClick = (starIndex: number, isHalf: boolean) => {
    if (readOnly || !onChange) return;
    const newRating = isHalf ? starIndex - 0.5 : starIndex;
    if (value === newRating) {
      onChange(0);
    } else {
      onChange(newRating);
    }
  };

  return (
    <div className="inline-flex items-center gap-1 select-none">
      {!readOnly && onChange && (
        <button
          type="button"
          onClick={() => onChange(value === 0 ? null : 0)}
          className={`text-xs px-1.5 py-0.5 rounded border transition ${
            value === 0
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-medium'
              : 'border-rose-950/80 text-stone-400 hover:text-stone-200'
          }`}
          title="Rate 0.0 stars"
        >
          0★
        </button>
      )}
      <div
        className="inline-flex items-center gap-0.5"
        onMouseLeave={() => !readOnly && setHoverRating(null)}
      >
        {[1, 2, 3, 4, 5].map((starIndex) => {
          const fillLevel = Math.max(
            0,
            Math.min(1, displayRating - (starIndex - 1))
          );

          return (
            <div
              key={starIndex}
              className={`relative inline-block ${
                readOnly ? '' : 'cursor-pointer'
              } ${sizeClasses}`}
            >
              {!readOnly && (
                <>
                  <div
                    className="absolute inset-y-0 left-0 w-1/2 z-10"
                    onMouseEnter={() => setHoverRating(starIndex - 0.5)}
                    onClick={() => handleStarClick(starIndex, true)}
                  />
                  <div
                    className="absolute inset-y-0 right-0 w-1/2 z-10"
                    onMouseEnter={() => setHoverRating(starIndex)}
                    onClick={() => handleStarClick(starIndex, false)}
                  />
                </>
              )}

              {/* Base empty star */}
              <svg
                viewBox="0 0 24 24"
                className="w-full h-full text-rose-950/90 fill-current"
              >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>

              {/* Filled overlay (Golden Marquee Star) */}
              {fillLevel > 0 && (
                <div
                  className="absolute inset-y-0 left-0 overflow-hidden pointer-events-none"
                  style={{ width: `${fillLevel * 100}%` }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className={`${sizeClasses} text-amber-400 fill-current`}
                  >
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showValue && value !== null && value !== undefined && (
        <span className="ml-1 text-xs font-semibold text-amber-400 tabular-nums">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
