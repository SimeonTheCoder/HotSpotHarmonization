using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HSH.Data.Migrations
{
    /// <inheritdoc />
    public partial class FireDataImport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "countries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CountryName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CountryCode = table.Column<string>(type: "nvarchar(5)", maxLength: 5, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_countries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "quad_tree",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CellId = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    FireId = table.Column<long>(type: "bigint", nullable: false),
                    TreeOrCountryId = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_quad_tree", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Trees",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TreeId = table.Column<int>(type: "int", nullable: false),
                    BoundaryId = table.Column<int>(type: "int", nullable: false),
                    Value = table.Column<float>(type: "real", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Trees", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FireData",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TreeId = table.Column<int>(type: "int", nullable: true),
                    CountryId = table.Column<int>(type: "int", nullable: false),
                    Latitude = table.Column<double>(type: "float", nullable: false),
                    Longitude = table.Column<double>(type: "float", nullable: false),
                    AcquiredAt = table.Column<DateTime>(type: "datetime2(0)", nullable: false),
                    Satellite = table.Column<byte>(type: "tinyint", nullable: false),
                    Instrument = table.Column<byte>(type: "tinyint", nullable: false),
                    ConfidencePercent = table.Column<byte>(type: "tinyint", nullable: true),
                    ConfidenceLevel = table.Column<byte>(type: "tinyint", nullable: true),
                    Brightness = table.Column<float>(type: "real", nullable: true),
                    BrightT31 = table.Column<float>(type: "real", nullable: true),
                    BrightTi4 = table.Column<float>(type: "real", nullable: true),
                    BrightTi5 = table.Column<float>(type: "real", nullable: true),
                    Scan = table.Column<float>(type: "real", nullable: false),
                    Track = table.Column<float>(type: "real", nullable: false),
                    Frp = table.Column<float>(type: "real", nullable: false),
                    Version = table.Column<float>(type: "real", nullable: false),
                    DayNight = table.Column<byte>(type: "tinyint", nullable: false),
                    Type = table.Column<byte>(type: "tinyint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FireData", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FireData_Trees_TreeId",
                        column: x => x.TreeId,
                        principalTable: "Trees",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_FireData_countries_CountryId",
                        column: x => x.CountryId,
                        principalTable: "countries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_countries_CountryName",
                table: "countries",
                column: "CountryName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FireData_CountryId",
                table: "FireData",
                column: "CountryId");

            migrationBuilder.CreateIndex(
                name: "IX_FireData_TreeId",
                table: "FireData",
                column: "TreeId");

            migrationBuilder.CreateIndex(
                name: "IX_quad_tree_CellId",
                table: "quad_tree",
                column: "CellId");

            migrationBuilder.CreateIndex(
                name: "IX_quad_tree_FireId",
                table: "quad_tree",
                column: "FireId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FireData");

            migrationBuilder.DropTable(
                name: "quad_tree");

            migrationBuilder.DropTable(
                name: "Trees");

            migrationBuilder.DropTable(
                name: "countries");
        }
    }
}
