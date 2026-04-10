import { Search } from 'lucide-react';
import Input from '@/shared/components/ui/input/Input';
import BadgeNav from '@/shared/components/ui/badge-nav/BadgeNav';

export default function RouteFilters({ filters = {}, onFilterChange }) {
  const handleSearchChange = (e) => {
    if (onFilterChange) onFilterChange({ ...filters, search: e.target.value });
  };

  // NOTE: multi selection handled by `handleMultiChange` below

  // Single combined options list — each value encodes its filter type so we can
  // support a single-row pill sweep that toggles different filter dimensions.
  const options = [
    { label: 'Newest', value: 'sort:newest' },
    { label: 'Road', value: 'terrain:road' },
    { label: 'Gravel', value: 'terrain:gravel' },
    { label: 'Trail', value: 'terrain:trail' },
    { label: 'Mixed', value: 'terrain:mixed' },
    { label: 'Casual', value: 'difficulty:casual' },
    { label: 'Moderate', value: 'difficulty:moderate' },
    { label: 'Hard', value: 'difficulty:hard' },
    { label: '< 20km', value: 'distance:short' },
    { label: '20 - 50km', value: 'distance:medium' },
    { label: '> 50km', value: 'distance:long' },
  ];

  const activeValues = [];
  if (filters.sort === 'newest') activeValues.push('sort:newest');
  if (filters.terrain && filters.terrain !== 'all') activeValues.push(`terrain:${filters.terrain}`);
  if (filters.difficulty && filters.difficulty !== 'all') activeValues.push(`difficulty:${filters.difficulty}`);
  if (filters.distance && filters.distance !== 'all') activeValues.push(`distance:${filters.distance}`);

  const handleMultiChange = (nextActive = []) => {
    // Normalize selection: only the last selected value per type should apply.
    const next = { ...filters };
    // reset to defaults
    next.sort = undefined;
    next.terrain = 'all';
    next.difficulty = 'all';
    next.distance = 'all';

    nextActive.forEach((val) => {
      const [type, v] = val.split(':');
      if (type === 'sort') next.sort = v;
      if (type === 'terrain') next.terrain = v;
      if (type === 'difficulty') next.difficulty = v;
      if (type === 'distance') next.distance = v;
    });

    if (onFilterChange) onFilterChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 pl-4 flex items-center">
          <Search className="h-4 w-4 text-white/40" />
        </div>
        <Input
          type="text"
          placeholder="Search routes by title..."
          value={filters.search || ''}
          onChange={handleSearchChange}
          className="pl-11"
        />
      </div>

      <div className="flex justify-center sm:justify-start">
        <BadgeNav
          options={options}
          multi
          activeValues={activeValues}
          onChange={handleMultiChange}
          className="w-full"
        />
      </div>
    </div>
  );
}
