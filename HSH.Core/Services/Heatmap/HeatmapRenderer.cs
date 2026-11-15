using System.Buffers.Binary;
using System.IO.Compression;

namespace HSH.Core.Services.Heatmap;

/// <summary>
/// A grid of squares over the whole world in Web Mercator (the projection of the Leaflet map), so each square
/// is a real square on screen. Fire counts are added to it and it is drawn as a transparent PNG.
/// </summary>
public sealed class HeatmapGrid
{
    /// <summary>Web Mercator stops at this latitude; it is also the top and bottom of the image.</summary>
    public const double MaxLat = 85.05112878;

    public const int Columns = 720; // 0.5 degree of longitude per square
    public const int Rows = 720;    // same number of rows: the Mercator world is a square

    /// <summary>Pixels per square side in the image (the browser scales it up with "pixelated" rendering).</summary>
    public const int SquarePixels = 2;

    public const int ScreenWidth = Columns * SquarePixels;
    public const int ScreenHeight = Rows * SquarePixels;

    private readonly double[] fires = new double[Columns * Rows];

    // Mercator y between 0 (top, 85°N) and 1 (bottom, 85°S)
    private static double LatToY(double lat)
    {
        lat = Math.Clamp(lat, -MaxLat, MaxLat) * Math.PI / 180;
        return 0.5 - Math.Log(Math.Tan(Math.PI / 4 + lat / 2)) / (2 * Math.PI);
    }

    private static double LonToX(double lon) => (Math.Clamp(lon, -180, 180) + 180) / 360;

    /// <summary>
    /// Spreads <paramref name="count"/> fires evenly over <paramref name="rect"/>: every square gets the part of the
    /// count that matches the part of the rectangle it covers (measured on the Mercator map).
    /// </summary>
    public void Add(GeoRect rect, double count)
    {
        double x0 = LonToX(rect.MinLon) * Columns, x1 = LonToX(rect.MaxLon) * Columns;
        double y0 = LatToY(rect.MaxLat) * Rows, y1 = LatToY(rect.MinLat) * Rows; // north is on top
        double width = x1 - x0, height = y1 - y0;

        if (width <= 1e-9 || height <= 1e-9)
        {
            // no area: everything goes into the square of the middle point
            int c = Math.Clamp((int)((x0 + x1) / 2), 0, Columns - 1);
            int r = Math.Clamp((int)((y0 + y1) / 2), 0, Rows - 1);
            fires[r * Columns + c] += count;
            return;
        }

        double perArea = count / (width * height);
        for (int r = Math.Max(0, (int)y0); r < Math.Min(Rows, (int)Math.Ceiling(y1)); r++)
        {
            double h = Math.Min(y1, r + 1) - Math.Max(y0, r);
            if (h <= 0) continue;
            for (int c = Math.Max(0, (int)x0); c < Math.Min(Columns, (int)Math.Ceiling(x1)); c++)
            {
                double w = Math.Min(x1, c + 1) - Math.Max(x0, c);
                if (w > 0) fires[r * Columns + c] += perArea * w * h;
            }
        }
    }

    /// <summary>
    /// Draws the grid: an empty square is see-through, a square with fires is yellow to red and gets more
    /// opaque the more fires it has (on a log scale, so a few very busy squares don't hide all the others).
    /// </summary>
    public byte[] OutputBitmap()
    {
        // the 99.5th percentile is the "full colour" value, so one extreme square does not wash out the map
        var nonEmpty = fires.Where(f => f >= MinFires).Order().ToArray();
        double top = nonEmpty.Length == 0 ? 1 : nonEmpty[Math.Min(nonEmpty.Length - 1, (int)(nonEmpty.Length * 0.995))];
        double scale = Math.Log(1 + top);

        var rgba = new byte[ScreenWidth * ScreenHeight * 4];

        for (int i = 0; i < ScreenHeight; i++)
        {
            for (int j = 0; j < ScreenWidth; j++)
            {
                double value = fires[i / SquarePixels * Columns + j / SquarePixels];
                if (value < MinFires) continue; // stays transparent

                double t = Math.Clamp(Math.Log(1 + value) / scale, 0, 1);
                var (r, g, b) = HeatColor(t);
                byte a = (byte)(60 + 175 * t);

                int p = (i * ScreenWidth + j) * 4;
                rgba[p] = r;
                rgba[p + 1] = g;
                rgba[p + 2] = b;
                rgba[p + 3] = a;
            }
        }

        return Png.Encode(ScreenWidth, ScreenHeight, rgba);
    }

    /// <summary>Squares with fewer fires than this are not drawn.</summary>
    private const double MinFires = 1;

    // yellow -> orange -> red
    private static (byte, byte, byte) HeatColor(double t)
    {
        (double r, double g, double b) from, to;
        double k;
        if (t < 0.5) { from = (255, 225, 80); to = (255, 138, 0); k = t / 0.5; }
        else { from = (255, 138, 0); to = (196, 20, 40); k = (t - 0.5) / 0.5; }
        return (
            (byte)(from.r + (to.r - from.r) * k),
            (byte)(from.g + (to.g - from.g) * k),
            (byte)(from.b + (to.b - from.b) * k));
    }
}

/// <summary>A minimal PNG writer (8-bit RGBA, no extra package needed).</summary>
internal static class Png
{
    public static byte[] Encode(int width, int height, byte[] rgba)
    {
        using var output = new MemoryStream();
        output.Write([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

        var header = new byte[13];
        BinaryPrimitives.WriteInt32BigEndian(header.AsSpan(0), width);
        BinaryPrimitives.WriteInt32BigEndian(header.AsSpan(4), height);
        header[8] = 8; // bits per channel
        header[9] = 6; // RGBA
        WriteChunk(output, "IHDR", header);

        using (var data = new MemoryStream())
        {
            using (var zlib = new ZLibStream(data, CompressionLevel.Optimal, leaveOpen: true))
            {
                int stride = width * 4;
                for (int y = 0; y < height; y++)
                {
                    zlib.WriteByte(0); // no filter
                    zlib.Write(rgba, y * stride, stride);
                }
            }
            WriteChunk(output, "IDAT", data.ToArray());
        }

        WriteChunk(output, "IEND", []);
        return output.ToArray();
    }

    private static void WriteChunk(Stream output, string type, byte[] data)
    {
        Span<byte> number = stackalloc byte[4];
        BinaryPrimitives.WriteInt32BigEndian(number, data.Length);
        output.Write(number);

        byte[] typeBytes = System.Text.Encoding.ASCII.GetBytes(type);
        output.Write(typeBytes);
        output.Write(data);

        uint crc = Crc32(Crc32(0xFFFFFFFF, typeBytes), data) ^ 0xFFFFFFFF;
        BinaryPrimitives.WriteUInt32BigEndian(number, crc);
        output.Write(number);
    }

    private static readonly uint[] CrcTable = Enumerable.Range(0, 256).Select(n =>
    {
        uint c = (uint)n;
        for (int k = 0; k < 8; k++) c = (c & 1) != 0 ? 0xEDB88320 ^ (c >> 1) : c >> 1;
        return c;
    }).ToArray();

    private static uint Crc32(uint crc, byte[] data)
    {
        foreach (byte b in data) crc = CrcTable[(crc ^ b) & 0xFF] ^ (crc >> 8);
        return crc;
    }
}
