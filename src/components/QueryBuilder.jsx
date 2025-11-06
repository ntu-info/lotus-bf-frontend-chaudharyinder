import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input" // <-- Import Input

export function QueryBuilder({ query, setQuery }) {
  const append = (token) => setQuery((q) => (q ? `${q} ${token}` : token));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // The Input is already controlled, so no extra setQuery needed here.
    }
  };

  return (
    // Removed the "qb" class, using standard Tailwind gap
    <div className="flex flex-col gap-3">
      {/* Header - REMOVED the redundant "Query Builder" title, it's now in App.jsx */}
      
      {/* Input - Replaced with Shadcn Input */}
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Create a query, e.g.: [-22,-4,18] NOT emotion"
        className="text-base" // Make text a bit larger
      />

      {/* Operators + Reset (single row) */}
      <div className="flex gap-2 flex-nowrap overflow-x-auto">
        {[
          { label: 'AND', onClick: () => append('AND') },
          { label: 'OR', onClick: () => append('OR') },
          { label: 'NOT', onClick: () => append('NOT') },
          { label: '(', onClick: () => append('(') },
          { label: ')', onClick: () => append(')') },
          { label: 'Reset', onClick: () => setQuery('') },
        ].map((b) => (
          <Button
            key={b.label}
            onClick={b.onClick}
            variant={b.label === 'Reset' ? 'destructive' : 'outline'}
            size="sm" // Use small buttons to fit
          >
            {b.label}
          </Button>
        ))}
      </div>

      {/* Tip (English) */}
      <div className="text-xs text-muted-foreground pt-1">
        Tip: You can mix terms and MNI coordinates, e.g., "[-22,-4,-18] NOT emotion"
      </div>
    </div>
  );
}