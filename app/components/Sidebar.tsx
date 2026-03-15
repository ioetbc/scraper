import type { HistorySearchItem } from '#/types'

type SidebarProps = {
  history: HistorySearchItem[]
  isLoading?: boolean
  onSelectSearch: (searchId: string) => void
  currentSearchId: string | null
}

export function Sidebar({
  history,
  isLoading,
  onSelectSearch,
  currentSearchId,
}: SidebarProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
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

  const getDisplayType = (type: 'keyword' | 'brand_explorer') => {
    return type === 'brand_explorer' ? 'brand' : 'query'
  }

  return (
    <aside className="w-72 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Search History
        </h2>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-4 text-sm text-gray-500 text-center">
            Loading history...
          </div>
        ) : history.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 text-center">
            No search history yet
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {history.map((item) => {
              const displayType = getDisplayType(item.type)
              const isActive = currentSearchId === item.id
              return (
                <li
                  key={item.id}
                  className={`group relative ${
                    isActive ? 'bg-blue-50' : 'hover:bg-gray-100'
                  }`}
                >
                  <button
                    onClick={() => onSelectSearch(item.id)}
                    className="w-full text-left p-4"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {item.query}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          displayType === 'brand'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {displayType === 'brand' ? 'Brand' : 'Query'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span>{item.resultCount} results</span>
                      <span>·</span>
                      <span>{formatTime(item.updatedAt)}</span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}
