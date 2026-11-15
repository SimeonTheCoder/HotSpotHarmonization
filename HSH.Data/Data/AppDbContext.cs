using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using HSH.Data.Data.Models;
using HSH.Data.Models;

namespace HSH.Data
{
    public class AppDbContext : IdentityDbContext<AppUser>
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

            // FireData - TreeBoundary relationship (optional, one-to-many)
            modelBuilder.Entity<FireData>()
                .HasOne(f => f.Tree)
                .WithMany()
                .HasForeignKey(f => f.TreeId)
                .IsRequired(false);

            modelBuilder.Entity<Country>()
                .HasIndex(c => c.CountryName)
                .IsUnique();

            modelBuilder.Entity<QuadTree>()
                .HasIndex(q => q.CellId);
            modelBuilder.Entity<QuadTree>()
                .HasIndex(q => q.FireId);
        }
    }
}
