import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
  type FilterFn,
  type RowSelectionState,
} from '@tanstack/react-table'
import type { SearchResultItem } from '#/types'
import { ColumnFilter } from './ColumnFilter'

function BooleanStatusCell({ value }: { value: boolean | null }) {
  if (value) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M13.5 4.5L6 12L2.5 8.5"
          stroke="#10B981"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M13.5 4.5L6 12L2.5 8.5"
        stroke="#D1D5DB"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function EmptyCell() {
  return <span className="empty-cell">—</span>
}

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
    filterVariant?: 'text' | 'range' | 'boolean' | 'tier'
  }
}

interface DataGridProps {
  data: SearchResultItem[]
  keyword: string | null
}

const columnHelper = createColumnHelper<SearchResultItem>()

const booleanFilter: FilterFn<SearchResultItem> = (row, columnId, filterValue) => {
  if (filterValue === undefined || filterValue === '') return true
  const value = row.getValue(columnId)
  return String(value) === filterValue
}

const rangeFilter: FilterFn<SearchResultItem> = (row, columnId, filterValue) => {
  const [min, max] = (filterValue as [number, number]) ?? []
  const value = row.getValue<number>(columnId)
  if (min !== undefined && value < min) return false
  if (max !== undefined && value > max) return false
  return true
}

export function DataGrid({ data, keyword }: DataGridProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'rowNumber',
        header: '',
        cell: (info) => (
          <span className="row-number">{info.row.index + 1}</span>
        ),
        size: 40,
      }),
      columnHelper.display({
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            className="checkbox-teal"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="checkbox-teal"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
        size: 40,
      }),
      columnHelper.accessor('position', {
        header: '#',
        cell: (info) => info.getValue(),
        enableColumnFilter: false,
        size: 50,
      }),
      columnHelper.accessor('creator.handle', {
        header: 'Creator',
        cell: (info) => (
          <a
            href={`https://tiktok.com/@${info.getValue()}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            @{info.getValue()}
          </a>
        ),
        size: 150,
      }),
      columnHelper.accessor('creator.followers', {
        header: 'Followers',
        cell: (info) => {
          const value = info.getValue()
          if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
          if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
          return value
        },
        meta: { filterVariant: 'range' },
        filterFn: rangeFilter,
        size: 100,
      }),
      columnHelper.accessor('caption', {
        header: 'Caption',
        cell: (info) => (
          <div className="whitespace-pre-wrap break-words max-w-md">
            {info.getValue()}
          </div>
        ),
        size: 400,
      }),
      columnHelper.accessor('isPromotion', {
        header: 'Promotion',
        cell: (info) => <BooleanStatusCell value={info.getValue()} />,
        meta: { filterVariant: 'boolean' },
        filterFn: booleanFilter,
        size: 90,
      }),
      columnHelper.accessor('isAd', {
        header: 'Ad',
        cell: (info) => <BooleanStatusCell value={info.getValue()} />,
        meta: { filterVariant: 'boolean' },
        filterFn: booleanFilter,
        size: 70,
      }),
      columnHelper.accessor('isSponsored', {
        header: 'Sponsored',
        cell: (info) => <BooleanStatusCell value={info.getValue()} />,
        meta: { filterVariant: 'boolean' },
        filterFn: booleanFilter,
        size: 90,
      }),
      columnHelper.accessor('brand', {
        header: 'Brand',
        cell: (info) => {
          const brand = info.getValue()
          return brand ? <span className="font-medium">{brand}</span> : <EmptyCell />
        },
        size: 120,
      }),
      columnHelper.accessor('confidence', {
        header: 'Confidence',
        cell: (info) => {
          const value = info.getValue()
          const percentage = Math.round(value * 100)
          return (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-[60px]">
                <div
                  className={`h-full rounded-full ${
                    value >= 0.8
                      ? 'bg-green-500'
                      : value >= 0.5
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-xs text-gray-600">{percentage}%</span>
            </div>
          )
        },
        meta: { filterVariant: 'range' },
        filterFn: rangeFilter,
        size: 120,
      }),
      columnHelper.accessor('signals', {
        header: 'Signals',
        cell: (info) => {
          const signals = info.getValue()
          if (signals.length === 0) return <EmptyCell />
          return (
            <div className="flex flex-wrap gap-1">
              {signals.slice(0, 3).map((signal, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800"
                  title={signal}
                >
                  {signal.length > 20 ? signal.slice(0, 20) + '...' : signal}
                </span>
              ))}
              {signals.length > 3 && (
                <span className="text-xs text-gray-500">+{signals.length - 3}</span>
              )}
            </div>
          )
        },
        enableSorting: false,
        size: 200,
      }),
      columnHelper.accessor('tier', {
        header: 'Tier',
        cell: (info) => {
          const tier = info.getValue()
          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                tier === 1
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              Tier {tier}
            </span>
          )
        },
        meta: { filterVariant: 'tier' },
        filterFn: booleanFilter,
        size: 80,
      }),
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <svg
          className="w-16 h-16 mb-4 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <p className="text-lg font-medium">No results to display</p>
        <p className="text-sm">Enter a search term to get started</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          {keyword && (
            <span className="text-sm text-gray-600">
              Results for <span className="font-semibold">"{keyword}"</span>
            </span>
          )}
          <span className="text-sm text-gray-500">
            {table.getFilteredRowModel().rows.length} of {data.length} rows
          </span>
        </div>
        <input
          type="text"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search all columns..."
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex-1 overflow-auto">
        <table className="data-grid">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="relative"
                  >
                    <div className="flex flex-col gap-1">
                      <div
                        className={`flex items-center gap-1 ${
                          header.column.getCanSort()
                            ? 'cursor-pointer select-none hover:text-blue-600'
                            : ''
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: ' ↑',
                          desc: ' ↓',
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                      {header.column.getCanFilter() && (
                        <ColumnFilter column={header.column} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className={row.getIsSelected() ? 'selected' : ''}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
