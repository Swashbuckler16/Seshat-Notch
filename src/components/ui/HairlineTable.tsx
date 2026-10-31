import React from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
  isNumeric?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface HairlineTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
}

/**
 * Hallmark Hairline Table Primitive
 * - Sentence-case heads that never wrap (Craft § 9).
 * - Horizontal 1px hairline rules only (no heavy outer card border).
 * - Tabular numerals on all numeric columns (F6).
 */
export function HairlineTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No records in this ledger.',
  className = '',
}: HairlineTableProps<T>): React.ReactElement {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="hairline-b bg-[var(--color-paper-2)] text-[var(--color-ink-muted)] font-medium">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={`py-2.5 px-3 whitespace-nowrap ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-rule)]">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-[var(--color-ink-muted)]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={`hover:bg-[var(--color-paper-2)] transition-opacity ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {columns.map((col) => {
                  const content = col.render
                    ? col.render(row)
                    : (row as Record<string, unknown>)[col.key] as React.ReactNode;

                  return (
                    <td
                      key={col.key}
                      className={`py-2.5 px-3 ${col.isNumeric ? 'tabular-figure font-mono' : ''} ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

