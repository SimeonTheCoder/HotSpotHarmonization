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

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            if (!optionsBuilder.IsConfigured)
            {
                // Fallback provider for EF Core design-time commands (migrations)
                optionsBuilder.UseSqlite("Data Source=hsh_fallback.db");
            }
        }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            modelBuilder.Entity<QuadTree>()
                .HasOne(q => q.Fire)
                .WithMany()
                .HasForeignKey(q => q.FireId);

            modelBuilder.Entity<QuadTree>()
                .HasOne(q => q.Tree)
                .WithMany()
                .HasForeignKey(q => q.TreeId);

            modelBuilder.Entity<QuadTree>()
                .HasOne(q => q.Country)
                .WithMany()
                .HasForeignKey(q => q.CountryId);
        }
  
    
    }
}