namespace HSH.Core.Services.Heatmap;

/// <summary>A lat/lon rectangle of the world. Min is inclusive, max is exclusive (like the tree's "&gt;=" test).</summary>
public readonly record struct GeoRect(double MinLon, double MaxLon, double MinLat, double MaxLat)
{
    public bool IsEmpty => MaxLon <= MinLon || MaxLat <= MinLat;
}

/// <summary>
/// One country's BSP tree as stored in TreeBoundaries (rows sorted by BoundaryId, children are row indexes, -1 = none).
/// Even depths split on longitude, odd depths on latitude - exactly like the importer's CalculateCells.
/// </summary>
public sealed class BspTree(float[] values, int[] left, int[] right)
{
    public const int MaxDepth = 16;

    public int Count => values.Length;

    /// <summary>The CellId of a point: the same walk the importer used to fill QuadTrees.CellId.</summary>
    public ushort Test(double lat, double lon)
    {
        ushort result = 0;
        int pointer = 0;

        for (int depth = 0; depth < MaxDepth; depth++)
        {
            result *= 2;
            double value = depth % 2 == 0 ? lon : lat;

            if (value >= values[pointer])
            {
                result += 1;
                pointer = right[pointer];
            }
            else
            {
                pointer = left[pointer];
            }

            if (pointer == -1) break;
        }

        return result;
    }

    /// <summary>
    /// The area the tree's splits cover: the smallest and largest longitude and latitude boundary of the inner nodes.
    /// Null if the tree has too few splits to tell.
    /// </summary>
    public GeoRect? Extent()
    {
        double minLon = double.MaxValue, maxLon = double.MinValue, minLat = double.MaxValue, maxLat = double.MinValue;
        Visit(0, 0);

        if (minLon > maxLon || minLat > maxLat) return null;
        return new GeoRect(minLon, maxLon, minLat, maxLat);

        void Visit(int node, int depth)
        {
            if (node < 0 || node >= values.Length || depth >= MaxDepth) return;
            if (left[node] == -1 && right[node] == -1) return; // a leaf: its value is not a real boundary

            if (depth % 2 == 0)
            {
                minLon = Math.Min(minLon, values[node]);
                maxLon = Math.Max(maxLon, values[node]);
            }
            else
            {
                minLat = Math.Min(minLat, values[node]);
                maxLat = Math.Max(maxLat, values[node]);
            }

            Visit(left[node], depth + 1);
            Visit(right[node], depth + 1);
        }
    }

    /// <summary>
    /// Every rectangle a walk of <see cref="Test"/> can end in, with the CellId it gives, clipped to <paramref name="bounds"/>.
    /// A point inside one of these rectangles gets exactly that CellId from Test.
    /// </summary>
    public IEnumerable<(ushort CellId, GeoRect Rect)> Cells(GeoRect bounds)
    {
        var found = new List<(ushort, GeoRect)>();
        if (values.Length > 0) Split(0, 0, 0, bounds);
        return found;

        void Split(int node, int depth, ushort path, GeoRect rect)
        {
            float boundary = values[node];
            bool onLon = depth % 2 == 0;

            for (int side = 0; side < 2; side++)
            {
                GeoRect part = onLon
                    ? side == 0
                        ? rect with { MaxLon = Math.Min(rect.MaxLon, boundary) }
                        : rect with { MinLon = Math.Max(rect.MinLon, boundary) }
                    : side == 0
                        ? rect with { MaxLat = Math.Min(rect.MaxLat, boundary) }
                        : rect with { MinLat = Math.Max(rect.MinLat, boundary) };
                if (part.IsEmpty) continue;

                ushort next = (ushort)(path * 2 + side);
                int child = side == 0 ? left[node] : right[node];

                if (child == -1 || depth + 1 == MaxDepth || child >= values.Length)
                    found.Add((next, part));
                else
                    Split(child, depth + 1, next, part);
            }
        }
    }
}
