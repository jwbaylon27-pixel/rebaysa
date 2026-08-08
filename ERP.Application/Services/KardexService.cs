using ClosedXML.Excel;
using ERP.Application.DTOs.Kardex;
using ERP.Application.Interfaces;
using System.Data;
using System.Drawing;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace ERP.Application.Services;

public class KardexService : IKardexService
{
    private readonly IKardexRepository _repository;
    public KardexService(
        IKardexRepository repository)
    {
        _repository = repository;
    }

    //=========================================================
    // RESUMEN DEL PRODUCTO
    //=========================================================

    public async Task<KardexResumenDto> ObtenerResumenProductoAsync(
        int productoId,
        int almacenId)
    {
        return await _repository.ObtenerResumenProducto(
            productoId,
            almacenId);
    }


    //=========================================================
    // MOVIMIENTOS
    //=========================================================

    public async Task<IEnumerable<KardexMovimientoDto>> ListarMovimientosAsync(
        KardexFiltroDto filtro)
    {
        return await _repository.ListarMovimientos(filtro);
    }

    //=========================================================
    // DETALLE
    //=========================================================

    public async Task<KardexDetalleDto?> ObtenerDetalleMovimientoAsync(
        long movimientoId)
    {
        return await _repository.ObtenerDetalleMovimiento(
            movimientoId);
    }

    //=========================================================
    // PRODUCTOS (AUTOCOMPLETE)
    //=========================================================

    public async Task<IEnumerable<ProductoBusquedaDto>> BuscarProductosAsync(
        string texto)
    {
        return await _repository.BuscarProductos(texto);
    }

    //=========================================================
    // ALMACENES
    //=========================================================

    public async Task<IEnumerable<AlmacenDto>> ListarAlmacenesAsync()
    {
        return await _repository.ListarAlmacenes();
    }

    //=========================================================
    // TIPOS MOVIMIENTO
    //=========================================================

    public async Task<IEnumerable<TipoMovimientoDto>> ListarTiposMovimientoAsync()
    {
        return await _repository.ListarTiposMovimiento();
    }

    //=========================================================
    // EXPORTAR EXCEL
    //=========================================================
    public async Task<byte[]> ExportarExcelAsync(
    KardexFiltroDto filtro)
    {
        var movimientos =
            (await _repository.ListarMovimientos(filtro))
            .ToList();

        using var workbook = new XLWorkbook();

        var ws = workbook.Worksheets.Add("Kardex");

        //-------------------------------------------------
        // TITULO
        //-------------------------------------------------

        ws.Cell("A1").Value = "KARDEX GENERAL";
        ws.Range("A1:J1").Merge();
        ws.Cell("A1").Style.Font.Bold = true;
        ws.Cell("A1").Style.Font.FontSize = 16;
        ws.Cell("A1").Style.Alignment.Horizontal =
            XLAlignmentHorizontalValues.Center;

        //-------------------------------------------------
        // ENCABEZADOS
        //-------------------------------------------------

        int fila = 3;

        ws.Cell(fila, 1).Value = "Fecha";
        ws.Cell(fila, 2).Value = "Movimiento";
        ws.Cell(fila, 3).Value = "Documento";
        ws.Cell(fila, 4).Value = "Producto";
        ws.Cell(fila, 5).Value = "Entrada";
        ws.Cell(fila, 6).Value = "Salida";
        ws.Cell(fila, 7).Value = "Stock Ant.";
        ws.Cell(fila, 8).Value = "Stock Act.";
        ws.Cell(fila, 9).Value = "Costo";
        ws.Cell(fila, 10).Value = "Total";

        var encabezado =
            ws.Range(fila, 1, fila, 10);

        encabezado.Style.Font.Bold = true;

        encabezado.Style.Fill.BackgroundColor =
            XLColor.DarkBlue;

        encabezado.Style.Font.FontColor =
            XLColor.White;

        //-------------------------------------------------
        // DETALLE
        //-------------------------------------------------

        fila++;

        foreach (var item in movimientos)
        {
            ws.Cell(fila, 1).Value =
                item.Fecha;
            ws.Cell(fila, 1).Style.DateFormat.Format =
                "dd/MM/yyyy";
            ws.Cell(fila, 2).Value =
                item.TipoMovimiento;
            ws.Cell(fila, 3).Value =
                item.Documento;
            ws.Cell(fila, 4).Value =
                item.Producto;
            ws.Cell(fila, 5).Value =
                item.Entrada;
            ws.Cell(fila, 6).Value =
                item.Salida;
            ws.Cell(fila, 7).Value =
                item.StockAnterior;
            ws.Cell(fila, 8).Value =
                item.StockActual;
            ws.Cell(fila, 9).Value =
                item.CostoUnitario;
            ws.Cell(fila, 10).Value =
                item.CostoTotal;
            fila++;
        }

        //-------------------------------------------------
        // FORMATO
        //-------------------------------------------------

        ws.Columns().AdjustToContents();
        ws.SheetView.FreezeRows(3);
        using var stream =
            new MemoryStream();

        workbook.SaveAs(stream);
        return stream.ToArray();
    }
    //=========================================================
    // EXPORTAR PDF
    //=========================================================
    public async Task<byte[]> ExportarPdfAsync(
    KardexFiltroDto filtro)
    {
        var movimientos =
            (await _repository.ListarMovimientos(filtro))
            .ToList();

        QuestPDF.Settings.License =
            LicenseType.Community;

        var documento = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());

                page.Margin(20);

                //-------------------------------------------------
                // CABECERA
                //-------------------------------------------------

                page.Header()
                    .AlignCenter()
                    .Text("KARDEX GENERAL")
                    .Bold()
                    .FontSize(18);

                //-------------------------------------------------
                // TABLA
                //-------------------------------------------------

                page.Content().Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.RelativeColumn(1.5f); // Fecha
                        columns.RelativeColumn(1.2f); // Movimiento
                        columns.RelativeColumn(2.4f); // Documento
                        columns.RelativeColumn(3.5f); // Producto
                        columns.RelativeColumn(1);    // Entrada
                        columns.RelativeColumn(1);    // Salida
                        columns.RelativeColumn(1);    // Stock Ant.
                        columns.RelativeColumn(1);    // Stock Act.
                        columns.RelativeColumn(1.2f); // Costo
                        columns.RelativeColumn(1.4f); // Total
                    });

                    //-------------------------------------------------
                    // ENCABEZADOS
                    //-------------------------------------------------

                    table.Header(header =>
                    {
                        Header(header.Cell(), "Fecha");
                        Header(header.Cell(), "Movimiento");
                        Header(header.Cell(), "Documento");
                        Header(header.Cell(), "Producto");
                        Header(header.Cell(), "Entrada");
                        Header(header.Cell(), "Salida");
                        Header(header.Cell(), "Stock Ant.");
                        Header(header.Cell(), "Stock Act.");
                        Header(header.Cell(), "Costo");
                        Header(header.Cell(), "Total");
                    });

                    //-------------------------------------------------
                    // DETALLE
                    //-------------------------------------------------

                    foreach (var item in movimientos)
                    {
                        Body(table.Cell(), item.Fecha.ToString("dd/MM/yyyy"));
                        Body(table.Cell(), item.TipoMovimiento);
                        Body(table.Cell(), item.Documento);
                        Body(table.Cell(), item.Producto);
                        Body(table.Cell(), item.Entrada.ToString());
                        Body(table.Cell(), item.Salida.ToString());
                        Body(table.Cell(), item.StockAnterior.ToString());
                        Body(table.Cell(), item.StockActual.ToString());
                        Body(table.Cell(), item.CostoUnitario.ToString("N2"));
                        Body(table.Cell(), item.CostoTotal.ToString("N2"));
                    }
                });

                //-------------------------------------------------
                // PIE
                //-------------------------------------------------

                page.Footer()
                    .AlignRight()
                    .Text(text =>
                    {
                        text.Span("Página ");
                        text.CurrentPageNumber();
                        text.Span(" de ");
                        text.TotalPages();
                    });
            });
        });

        return documento.GeneratePdf();
    }
    private static void Header(
    IContainer container,
    string texto)
    {
        container
            .Border(1)
            .Background(Colors.Blue.Medium)
            .Padding(5)
            .Text(texto)
            .FontColor(Colors.White)
            .Bold()
            .FontSize(10);
    }

    private static void Body(
        IContainer container,
        string texto)
    {
        container
            .BorderBottom(1)
            .BorderColor(Colors.Grey.Lighten2)
            .Padding(4)
            .Text(texto)
            .FontSize(9);
    }

}