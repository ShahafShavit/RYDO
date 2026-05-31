namespace Rydo.Api.Data;

public class XpLedgerEntry
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public ApplicationUser? User { get; set; }
    public int Amount { get; set; }
    public string SourceType { get; set; } = "";
    public int SourceId { get; set; }
    public string Description { get; set; } = "";
    public DateTime CreatedAt { get; set; }
}
