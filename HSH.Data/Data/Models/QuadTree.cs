using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HSH.Data.Models
{
    [Table("quad_tree")]
    public class QuadTree
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }  // Primary Key
        
        [Required, MaxLength(50)]
        public string CellId { get; set; }  // e.g., the spatial cell identifier
        
        [Required]
        public int FireId { get; set; }  // Reference to fire in Data table
        public virtual FireData Fire { get; set; } // Navigation property

        // Clean separation instead of a mixed string column:
        public int? TreeId { get; set; }
        public virtual TreeBoundary Tree { get; set; }

        public int? CountryId { get; set; }
        public virtual Country Country { get; set; }
    }
}