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

export function FilterTabs({
  activeFilter,
  onFilterChange,
  resultCounts,
}: FilterTabsProps) {
  const tabs = [
    { id: 'all', label: 'All rows', count: resultCounts.all },
    { id: 'promotions', label: 'Promotions Only', count: resultCounts.promotions },
    { id: 'highConfidence', label: 'High Confidence', count: resultCounts.highConfidence },
    { id: 'tier1', label: 'Tier 1', count: resultCounts.tier1 },
  ]

  return (
    <div className="flex gap-2 p-4 border-b border-gray-200 bg-white">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onFilterChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeFilter === tab.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {tab.label}
          <span
            className={`ml-2 px-1.5 py-0.5 text-xs rounded ${
              activeFilter === tab.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  )
}
