namespace Rydo.Api.Services;

public record PaginatedResult<T>(IReadOnlyList<T> Items, int Total, int Skip, int Take);

public static class Pagination
{
    public static PaginatedResult<T> Page<T>(IEnumerable<T> source, int skip, int take)
    {
        var list = source.ToList();
        var total = list.Count;
        var items = list.Skip(skip).Take(take).ToList();
        return new PaginatedResult<T>(items, total, skip, take);
    }

    public static PaginatedResult<T> PageQueryable<T>(IQueryable<T> query, int skip, int take)
    {
        var total = query.Count();
        var items = query.Skip(skip).Take(take).ToList();
        return new PaginatedResult<T>(items, total, skip, take);
    }
}
