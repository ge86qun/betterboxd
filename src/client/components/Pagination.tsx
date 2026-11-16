import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '../lib/api.js';

interface PaginationProps {
  pagination: PaginationMeta | null;
  onPageChange: (page: number) => void;
}

export function Pagination({ pagination, onPageChange }: PaginationProps) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, total } = pagination;

  return (
    <div className="mt-8 flex items-center justify-between border-t border-rose-950/60 pt-4 text-xs sm:text-sm text-stone-400">
      <div>
        Showing page <span className="font-semibold text-stone-200">{page}</span> of{' '}
        <span className="font-semibold text-stone-200">{totalPages}</span> ({total}{' '}
        total)
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1a0c10] border border-rose-950/80 text-stone-200 hover:border-rose-700 disabled:opacity-40 disabled:pointer-events-none transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Prev
        </button>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1a0c10] border border-rose-950/80 text-stone-200 hover:border-rose-700 disabled:opacity-40 disabled:pointer-events-none transition"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
