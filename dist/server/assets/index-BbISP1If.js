import { jsxs, jsx } from "react/jsx-runtime";
import * as React from "react";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useReactTable, getSortedRowModel, getFilteredRowModel, getCoreRowModel, flexRender, createColumnHelper } from "@tanstack/react-table";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { hc } from "hono/client";
function SearchInput({ onSearch, isLoading, mode, onModeChange }) {
  const [value, setValue] = useState("");
  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed && !isLoading) {
      onSearch(trimmed, mode);
    }
  };
  return /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "flex items-stretch border border-gray-300 bg-white rounded max-w-md flex-1", children: [
    /* @__PURE__ */ jsx(
      "input",
      {
        type: "text",
        value,
        onChange: (e) => setValue(e.target.value),
        placeholder: mode === "query" ? "Search keyword..." : "Search @handle...",
        className: "flex-1 px-3 py-2 text-sm bg-transparent border-none outline-none min-w-[180px] placeholder:text-gray-400",
        disabled: isLoading
      }
    ),
    /* @__PURE__ */ jsxs(
      "select",
      {
        value: mode,
        onChange: (e) => onModeChange(e.target.value),
        className: "px-2 py-2 text-xs text-gray-500 border-none border-l border-gray-200 bg-gray-50 cursor-pointer outline-none appearance-none hover:bg-gray-100 transition-colors",
        disabled: isLoading,
        children: [
          /* @__PURE__ */ jsx("option", { value: "query", children: "Keyword" }),
          /* @__PURE__ */ jsx("option", { value: "brand", children: "Brand" })
        ]
      }
    ),
    isLoading ? /* @__PURE__ */ jsx("div", { className: "px-4 py-2 text-xs text-gray-400 border-l border-gray-200 bg-gray-50 flex items-center", children: /* @__PURE__ */ jsxs("svg", { className: "animate-spin h-4 w-4", viewBox: "0 0 24 24", children: [
      /* @__PURE__ */ jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4", fill: "none" }),
      /* @__PURE__ */ jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })
    ] }) }) : /* @__PURE__ */ jsx(
      "button",
      {
        type: "submit",
        disabled: !value.trim(),
        className: "px-4 py-2 text-xs font-medium border-none border-l border-gray-200 bg-gray-800 text-white cursor-pointer rounded-r hover:bg-gray-700 transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed",
        children: "Search"
      }
    )
  ] });
}
function Sidebar({
  history,
  isLoading,
  onSelectSearch,
  onDeleteSearch,
  currentSearchId
}) {
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = /* @__PURE__ */ new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 6e4);
    const diffHours = Math.floor(diffMs / 36e5);
    const diffDays = Math.floor(diffMs / 864e5);
    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };
  return /* @__PURE__ */ jsxs("aside", { className: "w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full", children: [
    /* @__PURE__ */ jsx("div", { className: "px-4 py-3 border-b border-gray-200", children: /* @__PURE__ */ jsx("h2", { className: "text-xs font-medium text-gray-500 uppercase tracking-wide", children: "History" }) }),
    /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-auto", children: isLoading ? /* @__PURE__ */ jsx("div", { className: "p-4 text-xs text-gray-400 text-center", children: "Loading..." }) : history.length === 0 ? /* @__PURE__ */ jsx("div", { className: "p-6 text-xs text-gray-400 text-center", children: "No searches yet" }) : /* @__PURE__ */ jsx("ul", { className: "m-0 p-0 list-none", children: history.map((item) => {
      const isActive = currentSearchId === item.id;
      const isBrand = item.type === "brand_explorer";
      return /* @__PURE__ */ jsxs(
        "li",
        {
          className: `border-b border-gray-200 relative group ${isActive ? "bg-white" : ""}`,
          children: [
            /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: () => onSelectSearch(item.id),
                className: `w-full text-left px-4 py-3 pr-10 bg-transparent border-none cursor-pointer transition-colors ${isActive ? "border-l-2 border-l-gray-800" : "hover:bg-white"}`,
                children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-1", children: [
                    /* @__PURE__ */ jsx("span", { className: `text-sm truncate ${isActive ? "font-medium text-gray-900" : "text-gray-700"}`, children: item.query }),
                    /* @__PURE__ */ jsx("span", { className: "font-mono-ui text-[10px] text-gray-400 px-1 border border-gray-300 rounded", children: isBrand ? "brand" : "query" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "font-mono-ui text-[11px] text-gray-400", children: [
                    item.resultCount,
                    " results · ",
                    formatTime(item.updatedAt)
                  ] })
                ]
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: (e) => {
                  e.stopPropagation();
                  onDeleteSearch(item.id);
                },
                className: "absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-transparent border-none cursor-pointer text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 flex items-center justify-center transition-all",
                title: "Delete",
                children: /* @__PURE__ */ jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5, d: "M6 18L18 6M6 6l12 12" }) })
              }
            )
          ]
        },
        item.id
      );
    }) }) })
  ] });
}
const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;
const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DialogPrimitive.Overlay,
  {
    ref,
    className: `dialog-overlay ${className ?? ""}`,
    ...props
  }
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;
const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(DialogPortal, { children: [
  /* @__PURE__ */ jsx(DialogOverlay, {}),
  /* @__PURE__ */ jsxs(
    DialogPrimitive.Content,
    {
      ref,
      className: `dialog-content ${className ?? ""}`,
      ...props,
      children: [
        children,
        /* @__PURE__ */ jsxs(DialogPrimitive.Close, { className: "dialog-close-btn", children: [
          /* @__PURE__ */ jsx(
            "svg",
            {
              width: "15",
              height: "15",
              viewBox: "0 0 15 15",
              fill: "none",
              xmlns: "http://www.w3.org/2000/svg",
              children: /* @__PURE__ */ jsx(
                "path",
                {
                  d: "M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z",
                  fill: "currentColor",
                  fillRule: "evenodd",
                  clipRule: "evenodd"
                }
              )
            }
          ),
          /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Close" })
        ] })
      ]
    }
  )
] }));
DialogContent.displayName = DialogPrimitive.Content.displayName;
function DialogHeader({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsx("div", { className: `dialog-header ${className ?? ""}`, ...props });
}
DialogHeader.displayName = "DialogHeader";
const DialogTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DialogPrimitive.Title,
  {
    ref,
    className: `dialog-title ${className ?? ""}`,
    ...props
  }
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;
const DialogDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DialogPrimitive.Description,
  {
    ref,
    className: `dialog-description ${className ?? ""}`,
    ...props
  }
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
function StatusBadge({ value, label }) {
  if (value) {
    return /* @__PURE__ */ jsxs("span", { className: "status-badge status-badge-yellow", children: [
      /* @__PURE__ */ jsx("span", { className: "status-circle" }),
      "Yes"
    ] });
  }
  return /* @__PURE__ */ jsxs("span", { className: "status-badge status-badge-gray", children: [
    /* @__PURE__ */ jsx("span", { className: "status-dot" }),
    "No"
  ] });
}
function ConfidenceBadge({ value }) {
  const percentage = Math.round(value * 100);
  return /* @__PURE__ */ jsxs(
    "span",
    {
      className: `status-badge ${value >= 0.7 ? "status-badge-green" : value >= 0.4 ? "status-badge-yellow" : "status-badge-gray"}`,
      children: [
        /* @__PURE__ */ jsx(
          "span",
          {
            className: value >= 0.7 ? "status-dot" : value >= 0.4 ? "status-circle" : "status-dot"
          }
        ),
        percentage,
        "%"
      ]
    }
  );
}
function DebugModal({ open, onOpenChange, item }) {
  if (!item) return null;
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxs(DialogContent, { children: [
    /* @__PURE__ */ jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsx(DialogTitle, { children: "Debug Details" }),
      /* @__PURE__ */ jsxs(DialogDescription, { children: [
        "Classification details for @",
        item.creator.handle
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { marginTop: "8px" }, children: [
      /* @__PURE__ */ jsxs("div", { className: "debug-modal-row", children: [
        /* @__PURE__ */ jsx("span", { className: "debug-modal-label", children: "Confidence" }),
        /* @__PURE__ */ jsx("div", { className: "debug-modal-value", children: /* @__PURE__ */ jsx(ConfidenceBadge, { value: item.confidence }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "debug-modal-row", children: [
        /* @__PURE__ */ jsx("span", { className: "debug-modal-label", children: "Is Ad" }),
        /* @__PURE__ */ jsx("div", { className: "debug-modal-value", children: /* @__PURE__ */ jsx(StatusBadge, { value: item.isAd, label: "Ad" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "debug-modal-row", children: [
        /* @__PURE__ */ jsx("span", { className: "debug-modal-label", children: "Is Sponsored" }),
        /* @__PURE__ */ jsx("div", { className: "debug-modal-value", children: /* @__PURE__ */ jsx(StatusBadge, { value: item.isSponsored, label: "Sponsored" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "debug-modal-row", children: [
        /* @__PURE__ */ jsx("span", { className: "debug-modal-label", children: "Signals" }),
        /* @__PURE__ */ jsx("div", { className: "debug-modal-value", children: item.signals.length === 0 ? /* @__PURE__ */ jsx("span", { className: "empty-cell", children: "—" }) : /* @__PURE__ */ jsx("div", { className: "debug-modal-signals", children: item.signals.map((signal, i) => /* @__PURE__ */ jsx("span", { className: "debug-modal-signal", children: signal }, i)) }) })
      ] }),
      item.brand && /* @__PURE__ */ jsxs("div", { className: "debug-modal-row", children: [
        /* @__PURE__ */ jsx("span", { className: "debug-modal-label", children: "Brand" }),
        /* @__PURE__ */ jsx("div", { className: "debug-modal-value", children: item.brand })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "debug-modal-row", children: [
        /* @__PURE__ */ jsx("span", { className: "debug-modal-label", children: "Is Promotion" }),
        /* @__PURE__ */ jsx("div", { className: "debug-modal-value", children: /* @__PURE__ */ jsx(StatusBadge, { value: item.isPromotion, label: "Promotion" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "debug-modal-row", children: [
        /* @__PURE__ */ jsx("span", { className: "debug-modal-label", children: "Tier" }),
        /* @__PURE__ */ jsx("div", { className: "debug-modal-value", children: /* @__PURE__ */ jsxs(
          "span",
          {
            className: `status-badge ${item.tier === 1 ? "status-badge-green" : "status-badge-gray"}`,
            children: [
              /* @__PURE__ */ jsx("span", { className: "status-dot" }),
              "Tier ",
              item.tier
            ]
          }
        ) })
      ] })
    ] })
  ] }) });
}
function Badge({ yes }) {
  if (yes) {
    return /* @__PURE__ */ jsx("span", { className: "inline-block text-[10px] font-medium px-1.5 py-0.5 bg-gray-800 text-white rounded", children: "Yes" });
  }
  return /* @__PURE__ */ jsx("span", { className: "inline-block text-[10px] px-1.5 py-0.5 text-gray-400", children: "No" });
}
function TierBadge({ tier }) {
  if (tier === 1) {
    return /* @__PURE__ */ jsx("span", { className: "inline-block text-[10px] font-medium px-1.5 py-0.5 bg-gray-800 text-white rounded", children: "Tier 1" });
  }
  if (tier === null) {
    return /* @__PURE__ */ jsx("span", { className: "text-gray-300", children: "—" });
  }
  return /* @__PURE__ */ jsxs("span", { className: "inline-block text-[10px] px-1.5 py-0.5 text-gray-400 border border-gray-200 rounded", children: [
    "Tier ",
    tier
  ] });
}
const columnHelper = createColumnHelper();
const booleanFilter = (row, columnId, filterValue) => {
  if (filterValue === void 0 || filterValue === "") return true;
  const value = row.getValue(columnId);
  return String(value) === filterValue;
};
const rangeFilter = (row, columnId, filterValue) => {
  const [min, max] = filterValue ?? [];
  const value = row.getValue(columnId);
  if (min !== void 0 && value < min) return false;
  if (max !== void 0 && value > max) return false;
  return true;
};
function DataGrid({
  data,
  keyword,
  isLoading
}) {
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState({});
  const [debugModalOpen, setDebugModalOpen] = useState(false);
  const [debugItem, setDebugItem] = useState(null);
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: ({ table: table2 }) => /* @__PURE__ */ jsx(
          "input",
          {
            type: "checkbox",
            className: "checkbox-clean",
            checked: table2.getIsAllRowsSelected(),
            onChange: table2.getToggleAllRowsSelectedHandler()
          }
        ),
        cell: ({ row }) => /* @__PURE__ */ jsx(
          "input",
          {
            type: "checkbox",
            className: "checkbox-clean",
            checked: row.getIsSelected(),
            onChange: row.getToggleSelectedHandler()
          }
        ),
        size: 36
      }),
      columnHelper.accessor("position", {
        header: "#",
        cell: (info) => /* @__PURE__ */ jsx("span", { className: "font-mono-ui text-xs text-gray-400", children: info.getValue() }),
        enableColumnFilter: false,
        size: 48
      }),
      columnHelper.accessor("creator.handle", {
        header: "Creator",
        cell: (info) => /* @__PURE__ */ jsxs(
          "a",
          {
            href: `https://tiktok.com/@${info.getValue()}`,
            target: "_blank",
            rel: "noopener noreferrer",
            className: "text-sm text-gray-700 hover:text-gray-900 hover:underline truncate",
            children: [
              "@",
              info.getValue()
            ]
          }
        ),
        size: 150
      }),
      columnHelper.accessor("creator.followers", {
        header: "Followers",
        cell: (info) => {
          const value = info.getValue();
          let display;
          if (value >= 1e6) {
            display = `${(value / 1e6).toFixed(1)}M`;
          } else if (value >= 1e3) {
            display = `${(value / 1e3).toFixed(0)}K`;
          } else {
            display = String(value);
          }
          return /* @__PURE__ */ jsx("span", { className: "font-mono-ui text-xs text-gray-600 text-right block", children: display });
        },
        meta: { filterVariant: "range" },
        filterFn: rangeFilter,
        size: 80
      }),
      columnHelper.accessor("caption", {
        header: "Caption",
        cell: (info) => /* @__PURE__ */ jsx("span", { className: "text-sm text-gray-600 truncate block max-w-full", title: info.getValue(), children: info.getValue() }),
        size: 320
      }),
      columnHelper.accessor("isPromotion", {
        header: "Promo",
        cell: (info) => /* @__PURE__ */ jsx(Badge, { yes: !!info.getValue() }),
        meta: { filterVariant: "boolean" },
        filterFn: booleanFilter,
        size: 64
      }),
      columnHelper.accessor("brand", {
        header: "Brand",
        cell: (info) => {
          const brand = info.getValue();
          return brand ? /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-gray-800 truncate block", children: brand }) : /* @__PURE__ */ jsx("span", { className: "text-gray-300", children: "—" });
        },
        size: 100
      }),
      columnHelper.accessor("tier", {
        header: "Tier",
        cell: (info) => /* @__PURE__ */ jsx(TierBadge, { tier: info.getValue() }),
        meta: { filterVariant: "tier" },
        filterFn: booleanFilter,
        size: 64
      }),
      columnHelper.display({
        id: "debug",
        header: "",
        cell: ({ row }) => /* @__PURE__ */ jsx(
          "button",
          {
            className: "w-6 h-6 bg-transparent border border-gray-200 rounded cursor-pointer text-gray-400 text-sm flex items-center justify-center hover:border-gray-400 hover:text-gray-600 transition-colors",
            onClick: () => {
              setDebugItem(row.original);
              setDebugModalOpen(true);
            },
            title: "Details",
            children: "···"
          }
        ),
        size: 40
      })
    ],
    []
  );
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel()
  });
  if (isLoading) {
    return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center h-full", children: [
      /* @__PURE__ */ jsx("div", { className: "text-sm text-gray-500 mb-1", children: "Searching..." }),
      /* @__PURE__ */ jsx("div", { className: "text-xs text-gray-400", children: "This may take a moment" })
    ] });
  }
  if (data.length === 0) {
    return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center h-full", children: [
      /* @__PURE__ */ jsx("div", { className: "text-sm text-gray-500 mb-1", children: "No results" }),
      /* @__PURE__ */ jsx("div", { className: "text-xs text-gray-400", children: "Enter a search to begin" })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full bg-white", children: [
    /* @__PURE__ */ jsx(
      DebugModal,
      {
        open: debugModalOpen,
        onOpenChange: setDebugModalOpen,
        item: debugItem
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "px-4 py-2 border-b border-gray-200 bg-gray-50 text-xs text-gray-500 flex gap-4", children: [
      keyword && /* @__PURE__ */ jsxs("span", { children: [
        "Query: ",
        /* @__PURE__ */ jsx("span", { className: "font-medium text-gray-700", children: keyword })
      ] }),
      /* @__PURE__ */ jsxs("span", { children: [
        "Showing ",
        /* @__PURE__ */ jsx("span", { className: "font-medium text-gray-700", children: table.getFilteredRowModel().rows.length }),
        " of",
        " ",
        /* @__PURE__ */ jsx("span", { className: "font-medium text-gray-700", children: data.length })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full border-collapse text-sm", style: { tableLayout: "fixed" }, children: [
      /* @__PURE__ */ jsx("thead", { children: table.getHeaderGroups().map((headerGroup) => /* @__PURE__ */ jsx("tr", { children: headerGroup.headers.map((header) => /* @__PURE__ */ jsxs(
        "th",
        {
          style: { width: header.getSize() },
          className: `sticky top-0 z-10 bg-gray-100 text-gray-600 text-left px-3 py-2 text-xs font-medium border-b border-gray-200 whitespace-nowrap ${header.column.getCanSort() ? "cursor-pointer select-none hover:bg-gray-200" : ""}`,
          onClick: header.column.getToggleSortingHandler(),
          children: [
            flexRender(header.column.columnDef.header, header.getContext()),
            {
              asc: " ↑",
              desc: " ↓"
            }[header.column.getIsSorted()] ?? null
          ]
        },
        header.id
      )) }, headerGroup.id)) }),
      /* @__PURE__ */ jsx("tbody", { children: table.getRowModel().rows.map((row) => /* @__PURE__ */ jsx(
        "tr",
        {
          className: `${row.getIsSelected() ? "bg-gray-100" : "hover:bg-gray-50"}`,
          children: row.getVisibleCells().map((cell) => /* @__PURE__ */ jsx(
            "td",
            {
              className: "px-3 h-10 border-b border-gray-100 overflow-hidden text-ellipsis whitespace-nowrap",
              children: flexRender(cell.column.columnDef.cell, cell.getContext())
            },
            cell.id
          ))
        },
        row.id
      )) })
    ] }) })
  ] });
}
const client$4 = hc("/");
function useHistoryQuery() {
  return useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      const res = await client$4.api.history.$get();
      const data = await res.json();
      if ("error" in data) {
        throw new Error(data.error);
      }
      return data;
    }
  });
}
const client$3 = hc("/");
function useHistoryDetailQuery(searchId) {
  return useQuery({
    queryKey: ["history", searchId],
    queryFn: async () => {
      if (!searchId) {
        throw new Error("No search ID provided");
      }
      const res = await client$3.api.history[":id"].$get({
        param: { id: searchId }
      });
      const data = await res.json();
      if ("error" in data) {
        throw new Error(data.error);
      }
      return data;
    },
    enabled: !!searchId
  });
}
const client$2 = hc("/");
function useSearchMutation(options) {
  return useMutation({
    mutationKey: ["search"],
    mutationFn: async (keyword) => {
      const res = await client$2.api.search.$post({
        json: { keyword }
      });
      const data = await res.json();
      if ("error" in data) {
        throw new Error(data.error);
      }
      return data;
    },
    onSuccess: (data, keyword) => {
      options?.onSuccess?.(data, keyword);
    }
  });
}
const client$1 = hc("/");
function useBrandExplorerMutation(options) {
  return useMutation({
    mutationKey: ["brand-explorer"],
    mutationFn: async (handle) => {
      const res = await client$1.api["brand-explorer"].$post({
        json: { handle }
      });
      const data = await res.json();
      if ("error" in data) {
        throw new Error(data.error);
      }
      return data;
    },
    onSuccess: (data, handle) => {
      options?.onSuccess?.(data, handle);
    }
  });
}
const client = hc("/");
function useDeleteSearchMutation(options) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["deleteSearch"],
    mutationFn: async (searchId) => {
      const res = await client.api.history[":id"].$delete({
        param: { id: searchId }
      });
      const data = await res.json();
      if ("error" in data) {
        throw new Error(data.error);
      }
      return data;
    },
    onSuccess: (_, searchId) => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      queryClient.removeQueries({ queryKey: ["history", searchId] });
      options?.onSuccess?.(searchId);
    }
  });
}
function HomePage() {
  const queryClient = useQueryClient();
  const [searchMode, setSearchMode] = useState("query");
  const [currentSearchId, setCurrentSearchId] = useState(null);
  const [currentSearchType, setCurrentSearchType] = useState(null);
  const [pendingSearch, setPendingSearch] = useState(null);
  const {
    data: historyData,
    isLoading: isHistoryLoading
  } = useHistoryQuery();
  const history = historyData?.searches ?? [];
  const {
    data: historyDetail,
    isLoading: isDetailLoading
  } = useHistoryDetailQuery(currentSearchId);
  const {
    mutate: search,
    data: searchData,
    isPending: isSearchPending,
    error: searchError
  } = useSearchMutation({
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["history"]
      });
      setCurrentSearchId(result.searchId);
      setCurrentSearchType("keyword");
      setPendingSearch(null);
    },
    onError: () => {
      setPendingSearch(null);
    }
  });
  const {
    mutate: exploreBrand,
    data: brandData,
    isPending: isBrandPending,
    error: brandError
  } = useBrandExplorerMutation({
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: ["history"]
      });
      setCurrentSearchId(result.searchId);
      setCurrentSearchType("brand_explorer");
      setPendingSearch(null);
    },
    onError: () => {
      setPendingSearch(null);
    }
  });
  const {
    mutate: deleteSearch
  } = useDeleteSearchMutation({
    onSuccess: (deletedId) => {
      if (currentSearchId === deletedId) {
        setCurrentSearchId(null);
        setCurrentSearchType(null);
      }
    }
  });
  const isPending = isSearchPending || isBrandPending || isDetailLoading;
  const error = searchError || brandError;
  const currentSearch = history.find((s) => s.id === currentSearchId);
  const keyword = currentSearch?.query ?? null;
  const results = useMemo(() => {
    if (currentSearchType === "brand_explorer" && brandData) {
      return brandData.results;
    }
    if (currentSearchType === "keyword" && searchData) {
      return searchData.results;
    }
    if (historyDetail) {
      return historyDetail.results;
    }
    return [];
  }, [currentSearchType, brandData, searchData, historyDetail]);
  const handleSearch = (searchTerm, mode) => {
    setSearchMode(mode);
    setCurrentSearchId(null);
    setCurrentSearchType(null);
    if (mode === "brand") {
      exploreBrand(searchTerm);
    } else {
      search(searchTerm);
    }
  };
  const handleSelectFromHistory = (searchId) => {
    const selectedSearch = history.find((s) => s.id === searchId);
    if (selectedSearch) {
      setSearchMode(selectedSearch.type === "brand_explorer" ? "brand" : "query");
      setCurrentSearchId(searchId);
      setCurrentSearchType(selectedSearch.type);
    }
  };
  const handleDeleteSearch = (searchId) => {
    deleteSearch(searchId);
  };
  return /* @__PURE__ */ jsxs("div", { className: "flex h-screen bg-white", children: [
    /* @__PURE__ */ jsx(Sidebar, { history, isLoading: isHistoryLoading, onSelectSearch: handleSelectFromHistory, onDeleteSearch: handleDeleteSearch, currentSearchId }),
    /* @__PURE__ */ jsxs("main", { className: "flex-1 flex flex-col overflow-hidden", children: [
      /* @__PURE__ */ jsxs("header", { className: "px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-6", children: [
        /* @__PURE__ */ jsx("h1", { className: "text-sm font-semibold text-gray-800 m-0 whitespace-nowrap", children: "Habitz" }),
        /* @__PURE__ */ jsx(SearchInput, { onSearch: handleSearch, isLoading: isPending, mode: searchMode, onModeChange: setSearchMode })
      ] }),
      error && /* @__PURE__ */ jsxs("div", { className: "px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-xs", children: [
        "Error: ",
        error instanceof Error ? error.message : "Search failed"
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-hidden", children: /* @__PURE__ */ jsx(DataGrid, { data: results, keyword, isLoading: isSearchPending || isBrandPending }) })
    ] })
  ] });
}
export {
  HomePage as component
};
