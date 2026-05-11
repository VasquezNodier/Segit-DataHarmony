"""Tests unitarios horizontes_split (sin volumen remoto)."""
from pathlib import Path

import pytest

from modules.routines.horizontes_split.errors import HorizontesSplitParseError
from modules.routines.horizontes_split.reader import load_horizontes_lines
from modules.routines.horizontes_split.transform import group_lines_by_horizon
from modules.routines.horizontes_split.writer import (
    build_outputs,
    summarize_row_counts,
    validate_horizon_filename,
)


FIXTURES = Path(__file__).resolve().parent / "fixtures" / "horizontes_split"


def test_skip_empty_and_bang_lines():
    raw = b"! a comment\nHorizonA\n\n   1 2 3\n   \n4 5 6 !bad\nHorizonB\n7 8 9\n"
    lines = load_horizontes_lines(raw)
    # líneas con '!' y vacías deben filtrarse
    assert "! a comment" not in lines
    assert "" not in lines
    assert any("4 5 6" in ln for ln in lines) is False  # tenía '!' inline
    assert "HorizonA" in lines
    assert "HorizonB" in lines


def test_group_in_order_of_appearance():
    raw = b"HorizonB\n1 1 1\nHorizonA\n2 2 2\nHorizonB\n3 3 3\n"
    lines = load_horizontes_lines(raw)
    grouped = group_lines_by_horizon(lines)
    # orden por primera aparición
    assert list(grouped.keys()) == ["HorizonB", "HorizonA"]
    # las líneas repetidas bajo el mismo horizonte se acumulan (no se deduplican)
    assert len(grouped["HorizonB"]) == 2


def test_header_detection_alpha_token():
    # Primera columna numérica → no es header; requiere header previo.
    raw = b"1 2 3\n"
    lines = load_horizontes_lines(raw)
    with pytest.raises(HorizontesSplitParseError):
        group_lines_by_horizon(lines)


def test_data_line_before_header_fails():
    raw = b"0 0 0\nHorizonA\n1 1 1\n"
    lines = load_horizontes_lines(raw)
    with pytest.raises(HorizontesSplitParseError):
        group_lines_by_horizon(lines)


def test_invalid_filename_chars_rejected():
    with pytest.raises(ValueError):
        validate_horizon_filename("bad/name")
    with pytest.raises(ValueError):
        validate_horizon_filename('quoted"name')


def _normalize(s: str) -> str:
    # Compara ignorando el EOL que Git/editor puedan haber aplicado (CRLF↔LF).
    return s.replace("\r\n", "\n")


def test_build_outputs_preserves_lines_verbatim():
    raw = (FIXTURES / "horizontes.dat").read_bytes()
    lines = load_horizontes_lines(raw)
    grouped = group_lines_by_horizon(lines)
    outputs = build_outputs(grouped)

    assert set(outputs.keys()) == {"HorizonA.dat", "HorizonB.dat"}
    assert _normalize(outputs["HorizonA.dat"]) == _normalize(
        (FIXTURES / "HorizonA.dat").read_bytes().decode("utf-8")
    )
    assert _normalize(outputs["HorizonB.dat"]) == _normalize(
        (FIXTURES / "HorizonB.dat").read_bytes().decode("utf-8")
    )

    counts = summarize_row_counts(grouped)
    assert counts == {"HorizonA": 2, "HorizonB": 1}


def test_empty_file_fails():
    with pytest.raises(HorizontesSplitParseError):
        load_horizontes_lines(b"\n   \n!only comment\n")


def test_decodes_legacy_cp1252_input():
    # Archivos legacy generados en Windows suelen venir en CP-1252 / Latin-1.
    # El reader debe caer al fallback sin fallar. 0xBA = 'º' en cp1252.
    text = "Horizonte_Nº1\n   1 2 3\n"
    raw = text.encode("cp1252")
    assert b"\xba" in raw  # sanity check
    lines = load_horizontes_lines(raw)
    assert lines[0] == "Horizonte_Nº1"
    assert lines[1].strip() == "1 2 3"


def test_decodes_legacy_input_with_accents():
    text = "Cretácico\n   1 2 3\nJurásico\n   4 5 6\n"
    raw = text.encode("cp1252")
    lines = load_horizontes_lines(raw)
    grouped = group_lines_by_horizon(lines)
    assert list(grouped.keys()) == ["Cretácico", "Jurásico"]


def _build_xlsx_bytes(rows: list[list]) -> bytes:
    """Arma un xlsx en memoria con las filas dadas."""
    from io import BytesIO

    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    for row in rows:
        ws.append(row)
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def test_xlsx_input_is_autodetected_and_parsed():
    raw = _build_xlsx_bytes(
        [
            ["HorizonA"],
            [1.0, 2.0, 3.0],
            [4.5, 5.5, 6.5],
            [],  # fila vacía → se descarta
            ["! comentario"],  # fila con '!' → se descarta
            ["HorizonB"],
            [7.0, 8.0, 9.0],
        ]
    )
    # Sanity: debe venir con magic ZIP.
    assert raw[:4] == b"PK\x03\x04"
    lines = load_horizontes_lines(raw)
    grouped = group_lines_by_horizon(lines)
    assert list(grouped.keys()) == ["HorizonA", "HorizonB"]
    assert grouped["HorizonA"] == ["1 2 3", "4.5 5.5 6.5"]
    assert grouped["HorizonB"] == ["7 8 9"]


def test_xlsx_integer_floats_stringify_without_trailing_zero():
    raw = _build_xlsx_bytes(
        [
            ["Alpha"],
            [1.0, 2.0, 3.0],
        ]
    )
    lines = load_horizontes_lines(raw)
    # 1.0 no debe aparecer como '1.0' sino como '1' para mantener los .dat limpios.
    assert lines[1] == "1 2 3"


def test_headers_without_data_produce_no_output():
    # awk legacy no crea archivos para headers sin filas; aquí esperamos un fallo
    # cuando ningún header tuvo datos.
    raw = b"HorizonA\nHorizonB\n"
    lines = load_horizontes_lines(raw)
    with pytest.raises(HorizontesSplitParseError):
        group_lines_by_horizon(lines)
