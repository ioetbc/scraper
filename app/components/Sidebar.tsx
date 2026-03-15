import type { SearchHistoryItem } from '#/types'

type SidebarProps = {
  history: SearchHistoryItem[]
  onSelectSearch: (keyword: string, type: 'query' | 'brand') => void
  onRemoveItem: (keyword: string, type: 'query' | 'brand') => void
  onClearHistory: () => void
  currentKeyword: string | null
  currentType: 'query' | 'brand' | null
}

export function Sidebar({
  history,
  onSelectSearch,
  onRemoveItem,
  onClearHistory,
  currentKeyword,
  currentType,
}: SidebarProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <aside className="w-72 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Search History
        </h2>
      </div>

      <div className="flex-1 overflow-auto">
        {history.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 text-center">
            No search history yet
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {history.map((item) => {
              const itemType = item.type ?? 'query'
              const isActive = currentKeyword === item.keyword && currentType === itemType
              return (
                <li
                  key={`${itemType}-${item.keyword}`}
                  className={`group relative ${
                    isActive ? 'bg-blue-50' : 'hover:bg-gray-100'
                  }`}
                >
                  <button
                    onClick={() => onSelectSearch(item.keyword, itemType)}
                    className="w-full text-left p-4 pr-10"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {item.keyword}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          itemType === 'brand'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {itemType === 'brand' ? 'Brand' : 'Query'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span>{item.resultCount} results</span>
                      <span>·</span>
                      <span>{formatTime(item.timestamp)}</span>
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveItem(item.keyword, itemType)
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove from history"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {history.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClearHistory}
            className="w-full text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            Clear all history
          </button>
        </div>
      )}
    </aside>
  )
}
