export function useHazardsList() {
  return {
    hazards: [
      { id: 1, title: 'Gate closed', status: 'Live', severity: 'Medium' },
      { id: 2, title: 'Trail maintenance', status: 'New', severity: 'High' },
    ],
  };
}
