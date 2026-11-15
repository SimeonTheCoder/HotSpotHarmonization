using System.Text;

public class BSP
{
    static float HalfwaySplit(float[] data, int[] indices, byte[] mask)
    {
        int nonMaskedCount = indices.Count(i => mask[i] == 0);

        if (indices.Count(i => mask[i] == 0) == 0)
            return -1;

        return data[indices.Where(i => mask[i] == 0).Skip(nonMaskedCount / 2).First()];
    }

    static int MiddleIndex(int[] indices, byte[] mask)
    {
        int nonMaskedCount = indices.Count(i => mask[i] == 0);

        if (indices.Count(i => mask[i] == 0) == 0)
            return -1;

        return indices.IndexOf(indices.Where(i => mask[i] == 0).Skip(nonMaskedCount / 2).First());
    }

    class Node
    {
        public float boundary;
        public Node childLeft = null!;
        public Node childRight = null!;
    }

    static void GenerateTree(
        float[] lats,
        float[] longs,
        int[] latsIndices,
        int[] longsIndices,
        byte[] mask,
        byte depth,
        Node currNode
    )
    {
        if (depth < 4)
            System.Console.Write("#");

        if (depth > 16)
            return;

        float[] referenced = depth % 2 == 1 ? longs : lats;
        int[] referencedIndices = depth % 2 == 1 ? longsIndices : latsIndices;

        float boundary = HalfwaySplit(referenced, referencedIndices, mask);
        int boundaryIndex = MiddleIndex(referencedIndices, mask);

        if (boundary == -1)
            return;

        currNode.boundary = boundary;

        currNode.childLeft = new();
        currNode.childRight = new();

        for (int i = 0; i < boundaryIndex; i++)
        {
            if (mask[referencedIndices[i]] != 0)
                continue;
            if (referenced[referencedIndices[i]] >= boundary)
                break;

            mask[referencedIndices[i]] = depth;
        }

        GenerateTree(
            lats,
            longs,
            latsIndices,
            longsIndices,
            mask,
            (byte)(depth + 1),
            currNode.childRight
        );

        for (int i = 0; i < referencedIndices.Length; i++)
        {
            if (mask[referencedIndices[i]] != depth && mask[referencedIndices[i]] != 0)
                continue;

            if (mask[referencedIndices[i]] == depth)
                mask[referencedIndices[i]] = 0;
            else
                mask[referencedIndices[i]] = depth;
        }

        GenerateTree(
            lats,
            longs,
            latsIndices,
            longsIndices,
            mask,
            (byte)(depth + 1),
            currNode.childLeft
        );

        for (int i = boundaryIndex; i < referencedIndices.Length; i++)
        {
            if (mask[referencedIndices[i]] != depth)
                continue;

            mask[referencedIndices[i]] = 0;
        }
    }

    static ushort Test(float lat, float lon, Node node)
    {
        ushort result = 0;

        Node curr = node;

        for (int depth = 0; depth < 16; depth++)
        {
            result *= 2;

            float value = depth % 2 == 0 ? lon : lat;

            if (value >= curr.boundary)
                result += 1;

            if (curr.childLeft == null && curr.childRight == null)
                return result;

            curr = (value >= curr.boundary ? curr.childRight : curr.childLeft)!;
        }

        return result;
    }

    static int[] GetSortOrder(float[] arr)
    {
        (int, float)[] newArr = new (int, float)[arr.Length];
        for (int i = 0; i < arr.Length; i++)
        {
            newArr[i] = (i, arr[i]);
        }
        newArr.Sort((a, b) => a.Item2.CompareTo(b.Item2));
        return newArr.Select(e => e.Item1).ToArray();
    }

    static void FlattenTree(List<float> boundaries, Node tree)
    {
        boundaries.Add(tree.boundary);

        if (tree.childLeft == null || tree.childRight == null)
            return;

        FlattenTree(boundaries, tree.childLeft);
        FlattenTree(boundaries, tree.childRight);
    }

    static void OutputTree(StringBuilder sb, Node tree, List<float> flattened)
    {
        sb.AppendLine(
            $"{tree.boundary},{(tree.childLeft != null ? flattened.IndexOf(tree.childLeft.boundary) : -1)},{(tree.childRight != null ? flattened.IndexOf(tree.childRight.boundary) : -1)}"
        );

        if (tree.childLeft == null || tree.childRight == null)
            return;

        OutputTree(sb, tree.childLeft, flattened);
        OutputTree(sb, tree.childRight, flattened);
    }

    static void IndexFiles(string[] filenames, string country)
    {
        Console.WriteLine("Now doing: " + country);

        string[][] lines = new string[filenames.Length][];
        int length = 0;

        for (int i = 0; i < filenames.Length; i++)
        {
            lines[i] = File.ReadAllLines(filenames[i]).Skip(1).ToArray();
            length += lines[i].Length;
        }

        float[] lats = new float[length];
        float[] longs = new float[length];

        byte[] mask = new byte[length];

        int index = 0;

        for (int i = 0; i < lines.Length; i++)
        {
            for (int j = 0; j < lines[i].Length; j++)
            {
                string[] tokens = lines[i][j].Split(",");

                float latitude = float.Parse(tokens[0]);
                float longitude = float.Parse(tokens[1]);

                lats[index] = latitude;
                longs[index] = longitude;

                index++;
            }
        }

        Console.WriteLine("Data in!");

        int[] latsIndices = GetSortOrder(lats);
        int[] longsIndices = GetSortOrder(longs);

        Console.WriteLine("Sorting done!");

        Node node = new();
        GenerateTree(lats, longs, latsIndices, longsIndices, mask, 1, node);

        Console.WriteLine("Tree - done!");

        List<float> flatTree = new();
        FlattenTree(flatTree, node);

        StringBuilder output = new();
        OutputTree(output, node, flatTree);

        File.WriteAllText($"{country.Replace(" ", "_")}.csv", output.ToString());
        // OutputBitmap(node);
    }

    static void Main(string[] args)
    {
        string baseUrl = "/home/moni/Coding/nasa-spaceapps/data/modis";
        DirectoryInfo info = new DirectoryInfo(baseUrl);

        Dictionary<string, List<string>> countries = new();

        foreach (var dir in info.GetDirectories())
        {
            string currName = dir.Name;
            DirectoryInfo currDir = new DirectoryInfo(baseUrl + "/" + currName);

            foreach (var file in currDir.GetFiles())
            {
                if (file.Extension != ".csv")
                    continue;

                string countryName = string.Join(" ", file.Name.Split("_").Skip(2)).Split(".")[0];

                if (!countries.ContainsKey(countryName))
                    countries.Add(countryName, [file.FullName]);
                else
                    countries[countryName].Add(file.FullName);
            }
        }

        List<string> keys = countries.Keys.ToList();

        // int threadId = int.Parse(args[0]);

        // int start = (int)(keys.Count / 8f * threadId);
        // int end = (int)(keys.Count / 8f * (threadId + 1));

        for (int i = 0; i < countries.Keys.Count; i++)
        {
            IndexFiles(countries[keys[i]].Take(1).ToArray(), keys[i]);
        }
    }
}
