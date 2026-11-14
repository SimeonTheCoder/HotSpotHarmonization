namespace HSH.Data.Models;

// One quad tree per country
public class QuadTree
{
    public int Id { get; set; }

    public int CountryId { get; set; }
    public Country Country { get; set; } = null!;

    // Max points in a leaf before it is split
    public int NodeCapacity { get; set; }

    public int MaxDepth { get; set; }

    public long? RootNodeId { get; set; }
    public QuadTreeNode? RootNode { get; set; }

    public ICollection<QuadTreeNode> Nodes { get; set; } = new List<QuadTreeNode>();
}
