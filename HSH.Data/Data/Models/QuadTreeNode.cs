using HSH.Data.Enums;

namespace HSH.Data.Models;

public class QuadTreeNode
{
    public long Id { get; set; }

    public int QuadTreeId { get; set; }
    public QuadTree QuadTree { get; set; } = null!;

    public long? ParentId { get; set; }
    public QuadTreeNode? Parent { get; set; }

    public Quadrant? Quadrant { get; set; }

    public int Depth { get; set; }

    // Bounding box of the node
    public double MinLatitude { get; set; }
    public double MaxLatitude { get; set; }
    public double MinLongitude { get; set; }
    public double MaxLongitude { get; set; }

    public bool IsLeaf { get; set; }

    public int PointCount { get; set; }

    public ICollection<QuadTreeNode> Children { get; set; } = new List<QuadTreeNode>();

    // Only populated for leaf nodes
    public ICollection<FirePoint> FirePoints { get; set; } = new List<FirePoint>();
}

