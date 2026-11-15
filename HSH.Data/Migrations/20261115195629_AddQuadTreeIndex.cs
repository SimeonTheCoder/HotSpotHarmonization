using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HSH.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddQuadTreeIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_QuadTrees_CountryId",
                table: "QuadTrees");

            migrationBuilder.CreateIndex(
                name: "IX_QuadTrees_CountryId_CellId",
                table: "QuadTrees",
                columns: new[] { "CountryId", "CellId" })
                .Annotation("SqlServer:Include", new[] { "FireId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_QuadTrees_CountryId_CellId",
                table: "QuadTrees");

            migrationBuilder.CreateIndex(
                name: "IX_QuadTrees_CountryId",
                table: "QuadTrees",
                column: "CountryId");
        }
    }
}
