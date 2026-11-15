using System;
using System.ComponentModel.DataAnnotations;
using System.Data;

namespace HSH.Core.DTOs;

public class CreateQuadTree
{
   [Required, MaxLength(50)]
   public string CellId {get;set;} = string.Empty;

   [Required]
   public int FireId {get;set;}
   public int? TreeId {get;set;}
   public int? CountryId { get;set;}

}
