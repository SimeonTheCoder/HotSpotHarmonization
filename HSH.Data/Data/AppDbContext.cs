using HSH.Data.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace HSH.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<AppUser>(options)
{
    public DbSet<Country> Countries => Set<Country>();
    public DbSet<FirePoint> FirePoints => Set<FirePoint>();
    public DbSet<QuadTree> QuadTrees => Set<QuadTree>();
    public DbSet<QuadTreeNode> QuadTreeNodes => Set<QuadTreeNode>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Country>(e =>
        {
            e.HasIndex(c => c.Code).IsUnique();
        });

        modelBuilder.Entity<QuadTree>(e =>
        {
            e.HasOne(t => t.Country)
                .WithOne(c => c.QuadTree)
                .HasForeignKey<QuadTree>(t => t.CountryId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(t => t.RootNode)
                .WithOne()
                .HasForeignKey<QuadTree>(t => t.RootNodeId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<QuadTreeNode>(e =>
        {
            e.HasOne(n => n.QuadTree)
                .WithMany(t => t.Nodes)
                .HasForeignKey(n => n.QuadTreeId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(n => n.Parent)
                .WithMany(n => n.Children)
                .HasForeignKey(n => n.ParentId)
                .OnDelete(DeleteBehavior.NoAction);

            e.HasIndex(n => new { n.QuadTreeId, n.MinLatitude, n.MaxLatitude, n.MinLongitude, n.MaxLongitude });
        });

        modelBuilder.Entity<FirePoint>(e =>
        {
            e.HasOne(p => p.Country)
                .WithMany(c => c.FirePoints)
                .HasForeignKey(p => p.CountryId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(p => p.QuadTreeNode)
                .WithMany(n => n.FirePoints)
                .HasForeignKey(p => p.QuadTreeNodeId)
                .OnDelete(DeleteBehavior.NoAction);

            e.HasIndex(p => new { p.CountryId, p.Latitude, p.Longitude });
            e.HasIndex(p => p.AcquiredAtUtc);
        });
    }
}
