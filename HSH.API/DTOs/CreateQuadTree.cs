using System;
using System.ComponentModel.DataAnnotations;
using System.Data;

namespace HSH.API.DTOs;

public class CreateQuadTree
{
   [Required, MaxLength(50)]
   public string CellId {get;set;}

   [Required]
   public int FireId {get;set;}
   public int? TreeId {get;set;}
   public int? CountryId { get;set;}

}
