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
    <form onSubmit={handleSubmit} className="flex items-stretch border border-gray-300 bg-white rounded max-w-md flex-1">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={mode === 'query' ? 'Search keyword...' : 'Search @handle...'}
        className="flex-1 px-3 py-2 text-sm bg-transparent border-none outline-none min-w-[180px] placeholder:text-gray-400"
        disabled={isLoading}
      />
      <select
        value={mode}
        onChange={(e) => onModeChange(e.target.value as SearchMode)}
        className="px-2 py-2 text-xs text-gray-500 border-none border-l border-gray-200 bg-gray-50 cursor-pointer outline-none appearance-none hover:bg-gray-100 transition-colors"
        disabled={isLoading}
      >
        <option value="query">Keyword</option>
        <option value="brand">Brand</option>
      </select>
      {isLoading ? (
        <div className="px-4 py-2 text-xs text-gray-400 border-l border-gray-200 bg-gray-50 flex items-center">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : (
        <button
          type="submit"
          disabled={!value.trim()}
          className="px-4 py-2 text-xs font-medium border-none border-l border-gray-200 bg-gray-800 text-white cursor-pointer rounded-r hover:bg-gray-700 transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          Search
        </button>
      )}
    </form>
  )
}
