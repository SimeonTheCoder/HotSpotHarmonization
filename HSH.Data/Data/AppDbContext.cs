using Microsoft.EntityFrameworkCore;
using HSH.Data.Models;

namespace HSH.Data
{
    public class AppDbContext : DbContext
    {
        public DbSet<FireData> FireData { get; set; }
        public DbSet<TreeBoundary> TreeBoundaries { get; set; }
        public DbSet<Country> Countries { get; set; }
        public DbSet<QuadTree> QuadTrees { get; set; }

        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // FireData - Country relationship (one-to-many)
            modelBuilder.Entity<FireData>()
                .HasOne(f => f.Country)
                .WithMany()
                .HasForeignKey(f => f.CountryId);

            // FireData - TreeBoundary relationship (one-to-many)
            modelBuilder.Entity<FireData>()
                .HasOne(f => f.Tree)
                .WithMany()
                .HasForeignKey(f => f.TreeId);
        }
    }
}