import {useMemo, useState} from "react";
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
} from "@tanstack/react-table";
import type {SearchResultItem} from "#/types";
import {DebugModal} from "./DebugModal";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    filterVariant?: "text" | "range";
  }
}

type StreamingProgress = {
  total: number;
  completed: number;
};

type DataGridProps = {
  data: SearchResultItem[];
  keyword: string | null;
  isLoading?: boolean;
  progress?: StreamingProgress | null;
};

const columnHelper = createColumnHelper<SearchResultItem>();

const rangeFilter: FilterFn<SearchResultItem> = (
  row,
  columnId,
  filterValue,
) => {
  const [min, max] = (filterValue as [number, number]) ?? [];
  const value = row.getValue<number>(columnId);
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
};

export function DataGrid({data, keyword, isLoading, progress}: DataGridProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [debugModalOpen, setDebugModalOpen] = useState(false);
  const [debugItem, setDebugItem] = useState<SearchResultItem | null>(null);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: ({table}) => (
          <input
            type="checkbox"
            className="checkbox-clean"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({row}) => (
          <input
            type="checkbox"
            className="checkbox-clean"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
        size: 36,
      }),
      columnHelper.accessor("position", {
        header: "Position",
        cell: (info) => (
          <span className="font-mono-ui text-xs text-gray-400">
            {info.getValue()}
          </span>
        ),
        enableColumnFilter: false,
        size: 48,
      }),
      columnHelper.accessor("creator.handle", {
        header: "Creator",
        cell: (info) => {
          const creator = info.row.original.creator;
          return (
            <a
              href={`https://tiktok.com/@${info.getValue()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 hover:underline"
            >
              {creator.avatarUrl ? (
                <img
                  src={creator.avatarUrl}
                  alt=""
                  className="w-6 h-6 rounded-md object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-6 h-6 rounded-md bg-gray-200 flex-shrink-0" />
              )}
              <span className="truncate">@{info.getValue()}</span>
            </a>
          );
        },
        size: 180,
      }),
      columnHelper.accessor("creator.followers", {
        header: "Followers",
        cell: (info) => {
          const value = info.getValue();
          let display: string;
          if (value >= 1_000_000) {
            display = `${(value / 1_000_000).toFixed(1)}M`;
          } else if (value >= 1_000) {
            display = `${(value / 1_000).toFixed(0)}K`;
          } else {
            display = String(value);
          }
          return (
            <span className="font-mono-ui text-xs text-gray-600 text-right block">
              {display}
            </span>
          );
        },
        meta: {filterVariant: "range"},
        filterFn: rangeFilter,
        size: 80,
      }),
      columnHelper.accessor("caption", {
        header: "Caption",
        cell: (info) => (
          <span
            className="text-sm text-gray-600 truncate block max-w-full"
            title={info.getValue()}
          >
            {info.getValue()}
          </span>
        ),
        size: 320,
      }),
      columnHelper.accessor("videoUrl", {
        header: "Video",
        cell: (info) => (
          <a
            href={info.getValue()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm line-clamp-1 text-blue-600 hover:text-blue-800 hover:underline truncate block"
            title={info.getValue()}
          >
            {info.getValue()}
          </a>
        ),
        enableColumnFilter: false,
        size: 200,
      }),
      columnHelper.accessor("brand", {
        header: "Brand",
        cell: (info) => {
          const brand = info.getValue();
          return brand ? (
            <span className="text-sm font-medium text-gray-800 truncate block">
              {brand}
            </span>
          ) : (
            <span className="text-gray-300">—</span>
          );
        },
        size: 100,
      }),
      columnHelper.display({
        id: "debug",
        header: "",
        cell: ({row}) => (
          <button
            className="w-6 h-6 bg-transparent border border-gray-200 rounded cursor-pointer text-gray-400 text-sm flex items-center justify-center hover:border-gray-400 hover:text-gray-600 transition-colors"
            onClick={() => {
              setDebugItem(row.original);
              setDebugModalOpen(true);
            }}
            title="Details"
          >
            ···
          </button>
        ),
        size: 40,
      }),
    ],
    [],
  );

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
  });

  // Show loading state only if we have no data yet
  if (isLoading && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-sm text-gray-500 mb-1">Searching...</div>
        {progress ? (
          <div className="text-xs text-gray-400">
            Processing {progress.completed} of {progress.total} videos
          </div>
        ) : (
          <div className="text-xs text-gray-400">This may take a moment</div>
        )}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-sm text-gray-500 mb-1">No results</div>
        <div className="text-xs text-gray-400">Enter a search to begin</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <DebugModal
        open={debugModalOpen}
        onOpenChange={setDebugModalOpen}
        item={debugItem}
      />

      {/* Info bar */}
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 text-xs text-gray-500 flex gap-4">
        {keyword && (
          <span>
            Query: <span className="font-medium text-gray-700">{keyword}</span>
          </span>
        )}
        <span>
          Showing{" "}
          <span className="font-medium text-gray-700">
            {table.getFilteredRowModel().rows.length}
          </span>{" "}
          of <span className="font-medium text-gray-700">{data.length}</span>
        </span>
        {isLoading && progress && (
          <span className="text-blue-600">
            Processing {progress.completed} of {progress.total} videos...
          </span>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table
          className="w-full border-collapse text-sm"
          style={{tableLayout: "fixed"}}
        >
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{width: header.getSize()}}
                    className={`sticky top-0 z-10 bg-gray-100 text-gray-600 text-left px-3 py-2 text-xs font-medium border-b border-gray-200 whitespace-nowrap ${
                      header.column.getCanSort()
                        ? "cursor-pointer select-none hover:bg-gray-200"
                        : ""
                    }`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {{
                      asc: " ↑",
                      desc: " ↓",
                    }[header.column.getIsSorted() as string] ?? null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`${
                  row.getIsSelected() ? "bg-gray-100" : "hover:bg-gray-50"
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-3 h-10 border-b border-gray-100 overflow-hidden text-ellipsis whitespace-nowrap"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
