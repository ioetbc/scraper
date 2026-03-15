import { useState, type FormEvent } from 'react'

export type SearchMode = 'query' | 'brand'

type SearchInputProps = {
  onSearch: (value: string, mode: SearchMode) => void
  isLoading: boolean
  mode: SearchMode
  onModeChange: (mode: SearchMode) => void
}

export function SearchInput({ onSearch, isLoading, mode, onModeChange }: SearchInputProps) {
  const [value, setValue] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed && !isLoading) {
      onSearch(trimmed, mode)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => onModeChange('query')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            mode === 'query'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Keyword Search
        </button>
        <button
          type="button"
          onClick={() => onModeChange('brand')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            mode === 'brand'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Brand Explorer
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={mode === 'query' ? 'Enter search keyword...' : 'Enter brand handle (e.g., @submagic.co)...'}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {mode === 'query' ? 'Searching...' : 'Exploring...'}
            </span>
          ) : (
            mode === 'query' ? 'Search' : 'Explore'
          )}
        </button>
      </form>
    </div>
  )
}
