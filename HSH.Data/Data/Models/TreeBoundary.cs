
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HSH.Data.Models
{
    [Table("Trees")]
    public class TreeBoundary
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }  // Primary Key: treeId
        
        [Required]
        public int TreeId { get; set; }  // Reference to Trees table
        
        [Required]
        public int BoundaryId { get; set; }
        
        [Required]
        [Range(0.01f, 999999f)]
        public float Value { get; set; }
    }
}