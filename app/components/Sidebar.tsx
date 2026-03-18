import type { HistorySearchItem } from '#/types'

type SidebarProps = {
  history: HistorySearchItem[]
  isLoading?: boolean
  onSelectSearch: (searchId: string) => void
  onDeleteSearch: (searchId: string) => void
  currentSearchId: string | null
}

export function Sidebar({
  history,
  isLoading,
  onSelectSearch,
  onDeleteSearch,
  currentSearchId,
}: SidebarProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString()
  }

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          History
        </h2>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-4 text-xs text-gray-400 text-center">
            Loading...
          </div>
        ) : history.length === 0 ? (
          <div className="p-6 text-xs text-gray-400 text-center">
            No searches yet
          </div>
        ) : (
          <ul className="m-0 p-0 list-none">
            {history.map((item) => {
              const isActive = currentSearchId === item.id
              const isBrand = item.type === 'brand_explorer'
              const isPending = item.id === 'pending'
              return (
                <li
                  key={item.id}
                  className={`border-b border-gray-200 relative group ${
                    isActive ? 'bg-white' : ''
                  }`}
                >
                  <button
                    onClick={() => !isPending && onSelectSearch(item.id)}
                    className={`w-full text-left px-4 py-3 pr-10 bg-transparent border-none transition-colors ${
                      isPending ? 'cursor-default' : 'cursor-pointer'
                    } ${
                      isActive
                        ? 'border-l-2 border-l-gray-800'
                        : 'hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm truncate ${isActive ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                        {item.query}
                      </span>
                      <span className="font-mono-ui text-[10px] text-gray-400 px-1 border border-gray-300 rounded">
                        {isBrand ? 'brand' : 'query'}
                      </span>
                    </div>
                    <div className="font-mono-ui text-[11px] text-gray-400">
                      {isPending ? (
                        <span className="animate-pulse">Searching...</span>
                      ) : (
                        <>{item.resultCount} results · {formatTime(item.updatedAt)}</>
                      )}
                    </div>
                  </button>
                  {!isPending && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteSearch(item.id)
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-transparent border-none cursor-pointer text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 flex items-center justify-center transition-all"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}
