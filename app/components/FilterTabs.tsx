interface FilterTabsProps {
  activeFilter: string
  onFilterChange: (filter: string) => void
  resultCounts: {
    all: number
    promotions: number
    highConfidence: number
    tier1: number
  }
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 3v10M3 8h10" strokeLinecap="round" />
    </svg>
  )
}

function SortIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6l4-3 4 3M4 10l4 3 4-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function FilterTabs({
  activeFilter,
  onFilterChange,
  resultCounts,
}: FilterTabsProps) {
  const tabs = [
    { id: 'all', label: 'All', count: resultCounts.all },
    { id: 'promotions', label: 'Promotions', count: resultCounts.promotions },
    { id: 'highConfidence', label: 'High Confidence', count: resultCounts.highConfidence },
    { id: 'tier1', label: 'Tier 1', count: resultCounts.tier1 },
  ]

  return (
    <div className="flex items-center gap-2 p-4 border-b border-gray-200 bg-white">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onFilterChange(tab.id)}
          className={`h-8 px-3 text-sm font-medium rounded-full transition-colors flex items-center gap-1.5 ${
            activeFilter === tab.id
              ? 'bg-gray-800 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          {tab.label}
          <span
            className={`text-xs ${
              activeFilter === tab.id
                ? 'text-gray-300'
                : 'text-gray-400'
            }`}
          >
            {tab.count}
          </span>
        </button>
      ))}

      <button
        className="h-8 w-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
        title="Add filter"
      >
        <PlusIcon />
      </button>

      <div className="flex-1" />

      <button
        className="h-8 w-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
        title="Sort"
      >
        <SortIcon />
      </button>
    </div>
  )
}
