import type { Column } from '@tanstack/react-table'
import type { SearchResult } from '#/types'

interface ColumnFilterProps {
  column: Column<SearchResult, unknown>
}

export function ColumnFilter({ column }: ColumnFilterProps) {
  const columnFilterValue = column.getFilterValue()
  const { filterVariant } = column.columnDef.meta ?? {}

  if (filterVariant === 'range') {
    return (
      <div className="flex gap-1">
        <input
          type="number"
          value={(columnFilterValue as [number, number])?.[0] ?? ''}
          onChange={(e) =>
            column.setFilterValue((old: [number, number]) => [
              e.target.value ? Number(e.target.value) : undefined,
              old?.[1],
            ])
          }
          placeholder="Min"
          className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
        />
        <input
          type="number"
          value={(columnFilterValue as [number, number])?.[1] ?? ''}
          onChange={(e) =>
            column.setFilterValue((old: [number, number]) => [
              old?.[0],
              e.target.value ? Number(e.target.value) : undefined,
            ])
          }
          placeholder="Max"
          className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
        />
      </div>
    )
  }

  if (filterVariant === 'boolean') {
    return (
      <select
        value={(columnFilterValue as string) ?? ''}
        onChange={(e) =>
          column.setFilterValue(e.target.value === '' ? undefined : e.target.value)
        }
        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
      >
        <option value="">All</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    )
  }

  if (filterVariant === 'tier') {
    return (
      <select
        value={(columnFilterValue as string) ?? ''}
        onChange={(e) =>
          column.setFilterValue(e.target.value === '' ? undefined : e.target.value)
        }
        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
      >
        <option value="">All</option>
        <option value="1">Tier 1</option>
        <option value="2">Tier 2</option>
      </select>
    )
  }

  return (
    <input
      type="text"
      value={(columnFilterValue as string) ?? ''}
      onChange={(e) => column.setFilterValue(e.target.value || undefined)}
      placeholder="Filter..."
      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
    />
  )
}
