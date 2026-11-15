using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HSH.Data.Migrations
{
    /// <inheritdoc />
    public partial class RenameTablesAndOtherFixes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FireData_Trees_TreeId",
                table: "FireData");

            migrationBuilder.DropForeignKey(
                name: "FK_FireData_countries_CountryId",
                table: "FireData");

            migrationBuilder.DropForeignKey(
                name: "FK_quad_tree_FireData_FireId",
                table: "quad_tree");

            migrationBuilder.DropPrimaryKey(
                name: "PK_countries",
                table: "countries");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Trees",
                table: "Trees");

            migrationBuilder.DropPrimaryKey(
                name: "PK_quad_tree",
                table: "quad_tree");

            migrationBuilder.RenameTable(
                name: "countries",
                newName: "Countries");

            migrationBuilder.RenameTable(
                name: "Trees",
                newName: "TreeBoundaries");

            migrationBuilder.RenameTable(
                name: "quad_tree",
                newName: "QuadTrees");

            migrationBuilder.RenameIndex(
                name: "IX_countries_CountryName",
                table: "Countries",
                newName: "IX_Countries_CountryName");

            migrationBuilder.RenameIndex(
                name: "IX_quad_tree_FireId",
                table: "QuadTrees",
                newName: "IX_QuadTrees_FireId");

            migrationBuilder.RenameIndex(
                name: "IX_quad_tree_CellId",
                table: "QuadTrees",
                newName: "IX_QuadTrees_CellId");

            migrationBuilder.AlterColumn<long>(
                name: "FireId",
                table: "QuadTrees",
                type: "bigint",
                nullable: true,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Countries",
                table: "Countries",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_TreeBoundaries",
                table: "TreeBoundaries",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_QuadTrees",
                table: "QuadTrees",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_QuadTrees_CountryId",
                table: "QuadTrees",
                column: "CountryId");

            migrationBuilder.AddForeignKey(
                name: "FK_FireData_Countries_CountryId",
                table: "FireData",
                column: "CountryId",
                principalTable: "Countries",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_FireData_TreeBoundaries_TreeId",
                table: "FireData",
                column: "TreeId",
                principalTable: "TreeBoundaries",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_QuadTrees_Countries_CountryId",
                table: "QuadTrees",
                column: "CountryId",
                principalTable: "Countries",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_QuadTrees_FireData_FireId",
                table: "QuadTrees",
                column: "FireId",
                principalTable: "FireData",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FireData_Countries_CountryId",
                table: "FireData");

            migrationBuilder.DropForeignKey(
                name: "FK_FireData_TreeBoundaries_TreeId",
                table: "FireData");

            migrationBuilder.DropForeignKey(
                name: "FK_QuadTrees_Countries_CountryId",
                table: "QuadTrees");

            migrationBuilder.DropForeignKey(
                name: "FK_QuadTrees_FireData_FireId",
                table: "QuadTrees");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Countries",
                table: "Countries");

            migrationBuilder.DropPrimaryKey(
                name: "PK_TreeBoundaries",
                table: "TreeBoundaries");

            migrationBuilder.DropPrimaryKey(
                name: "PK_QuadTrees",
                table: "QuadTrees");

            migrationBuilder.DropIndex(
                name: "IX_QuadTrees_CountryId",
                table: "QuadTrees");

            migrationBuilder.RenameTable(
                name: "Countries",
                newName: "countries");

            migrationBuilder.RenameTable(
                name: "TreeBoundaries",
                newName: "Trees");

            migrationBuilder.RenameTable(
                name: "QuadTrees",
                newName: "quad_tree");

            migrationBuilder.RenameIndex(
                name: "IX_Countries_CountryName",
                table: "countries",
                newName: "IX_countries_CountryName");

            migrationBuilder.RenameIndex(
                name: "IX_QuadTrees_FireId",
                table: "quad_tree",
                newName: "IX_quad_tree_FireId");

            migrationBuilder.RenameIndex(
                name: "IX_QuadTrees_CellId",
                table: "quad_tree",
                newName: "IX_quad_tree_CellId");

            migrationBuilder.AlterColumn<long>(
                name: "FireId",
                table: "quad_tree",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldNullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_countries",
                table: "countries",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Trees",
                table: "Trees",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_quad_tree",
                table: "quad_tree",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_FireData_Trees_TreeId",
                table: "FireData",
                column: "TreeId",
                principalTable: "Trees",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_FireData_countries_CountryId",
                table: "FireData",
                column: "CountryId",
                principalTable: "countries",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_quad_tree_FireData_FireId",
                table: "quad_tree",
                column: "FireId",
                principalTable: "FireData",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
