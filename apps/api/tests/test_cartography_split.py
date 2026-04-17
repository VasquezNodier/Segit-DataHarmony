"""
Tests de `modules.cartography`.

- Parser: unitario, sin I/O.
- Service: preview y execute contra un adaptador de storage en memoria que
  reproduce el ejemplo real de `RUBIALES1747H` descrito en el spec.
"""
from __future__ import annotations

import posixpath
from datetime import datetime, timezone
from typing import Iterator, Optional
from uuid import uuid4

import pytest

from modules.cartography.errors import (
    CartographySplitConflictError,
    CartographySplitValidationError,
)
from modules.cartography.parser import (
    build_target_dir_name,
    parse_file_name,
    parse_source_dir_name,
)
from modules.cartography.service import CartographySplitService
from modules.volumes.storage.base import (
    BaseStorageAdapter,
    FileStatResult,
    StorageConflictError,
    StoragePathNotFoundError,
)


# ---------------------------------------------------------------------------
# Parser (unit)
# ---------------------------------------------------------------------------


class TestParser:
    def test_parse_source_dir_name_happy_path(self):
        info = parse_source_dir_name(
            "MAPA_LOC_DIST_LINDERO_TRAYECTORIA_RUBIALES1747H_4CR_MNal"
        )
        assert info is not None
        assert info.well == "RUBIALES1747H"
        assert info.cr == "4CR"

    def test_parse_source_dir_name_case_insensitive(self):
        info = parse_source_dir_name(
            "mapa_loc_dist_lindero_trayectoria_apiay2415_6cr_mnal"
        )
        assert info is not None
        assert info.well == "APIAY2415"
        assert info.cr == "6CR"

    def test_parse_source_dir_name_rejects_invalid(self):
        assert parse_source_dir_name("random_folder") is None
        assert parse_source_dir_name("") is None
        assert (
            parse_source_dir_name(
                "MAPA_LOC_DIST_LINDERO_TRAYECTORIA_RUBIALES1747H_MNal"
            )
            is None
        )  # sin _NCR_

    def test_parse_file_name_with_survey(self):
        fi = parse_file_name("Loc_dist_Survey_RUBIALES2263H_4CR_MNal_SGC.pdf")
        assert fi is not None
        assert fi.well == "RUBIALES2263H"
        assert fi.cr == "4CR"
        assert fi.extension == "pdf"

    def test_parse_file_name_without_survey(self):
        fi = parse_file_name("Loc_dist_APIAY2415_6CR_MNal_SGC.mxd")
        assert fi is not None
        assert fi.well == "APIAY2415"
        assert fi.cr == "6CR"
        assert fi.extension == "mxd"

    def test_parse_file_name_case_insensitive(self):
        fi = parse_file_name("LOC_DIST_SURVEY_RUBIALES1_4cr_MNAL_sgc.PDF")
        assert fi is not None
        assert fi.well == "RUBIALES1"
        assert fi.cr == "4CR"
        assert fi.extension == "pdf"

    def test_parse_file_name_rejects_wrong_extension(self):
        assert parse_file_name("Loc_dist_RUBIALES1_4CR_MNal_SGC.txt") is None
        assert parse_file_name("Loc_dist_RUBIALES1_4CR_MNal_SGC.shp") is None

    def test_parse_file_name_rejects_missing_parts(self):
        assert parse_file_name("random.pdf") is None
        assert parse_file_name("Loc_dist_RUBIALES_MNal_SGC.pdf") is None

    def test_build_target_dir_name_normalizes_case(self):
        assert (
            build_target_dir_name("rubiales2458p", "4cr")
            == "MAPA_LOC_DIST_LINDERO_TRAYECTORIA_RUBIALES2458P_4CR_MNal"
        )


# ---------------------------------------------------------------------------
# In-memory storage adapter (para service tests)
# ---------------------------------------------------------------------------


class InMemoryAdapter(BaseStorageAdapter):
    """Adapter en memoria: directorios y archivos como diccionarios.

    Simula el subconjunto del API usado por CartographySplitService:
    list_dir, stat, exists, create_folder, rename, copy, delete.
    """

    def __init__(self) -> None:
        # dirs: set de paths que son carpetas
        self._dirs: set[str] = {"/"}
        # files: path -> bytes. El contenido es solo un placeholder por nombre.
        self._files: dict[str, bytes] = {}

    # ------------------ helpers internos ------------------

    def _norm(self, path: str) -> str:
        return posixpath.normpath("/" + path.lstrip("/"))

    def _parent(self, path: str) -> str:
        return posixpath.dirname(self._norm(path)) or "/"

    def add_file(self, path: str, content: bytes = b"") -> None:
        p = self._norm(path)
        parent = self._parent(p)
        self._ensure_dir(parent)
        self._files[p] = content

    def add_dir(self, path: str) -> None:
        self._ensure_dir(self._norm(path))

    def _ensure_dir(self, path: str) -> None:
        # Crea path y todos sus ancestros
        parts = [p for p in path.split("/") if p]
        cur = ""
        self._dirs.add("/")
        for p in parts:
            cur = cur + "/" + p
            self._dirs.add(cur)

    def snapshot(self) -> tuple[frozenset[str], frozenset[str]]:
        """Retorna (dirs, files) para comparaciones en tests."""
        return frozenset(self._dirs), frozenset(self._files)

    # ------------------ BaseStorageAdapter API ------------------

    def test_connection(self) -> dict:  # pragma: no cover
        return {"ok": True, "message": "memory", "latency_ms": 0}

    def list_dir(self, path: str) -> list[FileStatResult]:
        p = self._norm(path)
        if p not in self._dirs:
            raise StoragePathNotFoundError(p)
        results: list[FileStatResult] = []
        prefix = p.rstrip("/") + "/"
        seen: set[str] = set()
        for d in self._dirs:
            if d == p:
                continue
            if d.startswith(prefix) and "/" not in d[len(prefix):]:
                name = d[len(prefix):]
                if name and name not in seen:
                    seen.add(name)
                    results.append(
                        FileStatResult(
                            name=name, path=d, is_dir=True, size=None,
                            modified_at=datetime.now(timezone.utc),
                        )
                    )
        for f in self._files:
            if f.startswith(prefix) and "/" not in f[len(prefix):]:
                name = f[len(prefix):]
                if name and name not in seen:
                    seen.add(name)
                    results.append(
                        FileStatResult(
                            name=name,
                            path=f,
                            is_dir=False,
                            size=len(self._files[f]),
                            modified_at=datetime.now(timezone.utc),
                        )
                    )
        return results

    def stat(self, path: str) -> FileStatResult:
        p = self._norm(path)
        if p in self._dirs:
            return FileStatResult(
                name=posixpath.basename(p) or "/",
                path=p,
                is_dir=True,
                size=None,
                modified_at=datetime.now(timezone.utc),
            )
        if p in self._files:
            return FileStatResult(
                name=posixpath.basename(p),
                path=p,
                is_dir=False,
                size=len(self._files[p]),
                modified_at=datetime.now(timezone.utc),
            )
        raise StoragePathNotFoundError(p)

    def exists(self, path: str) -> bool:
        p = self._norm(path)
        return p in self._dirs or p in self._files

    def read_file(self, path: str, max_bytes: Optional[int] = None) -> bytes:
        p = self._norm(path)
        if p not in self._files:
            raise StoragePathNotFoundError(p)
        return self._files[p]

    def download_file(self, path: str) -> Iterator[bytes]:  # pragma: no cover
        yield self.read_file(path)

    def upload_file(self, remote_path: str, data: bytes) -> int:
        p = self._norm(remote_path)
        self._ensure_dir(self._parent(p))
        self._files[p] = data
        return len(data)

    def create_folder(self, path: str) -> None:
        p = self._norm(path)
        if p in self._files:
            raise StorageConflictError(p)
        self._ensure_dir(p)

    def rename(self, source_path: str, target_path: str) -> None:
        src = self._norm(source_path)
        dst = self._norm(target_path)
        if src in self._files:
            if dst in self._files or dst in self._dirs:
                raise StorageConflictError(dst)
            self._files[dst] = self._files.pop(src)
            self._ensure_dir(self._parent(dst))
            return
        if src in self._dirs:
            # Mover un directorio completo
            if dst in self._files or dst in self._dirs:
                raise StorageConflictError(dst)
            prefix = src.rstrip("/") + "/"
            new_dirs: set[str] = set()
            new_files: dict[str, bytes] = {}
            for d in list(self._dirs):
                if d == src:
                    new_dirs.add(dst)
                elif d.startswith(prefix):
                    new_dirs.add(dst + d[len(src):])
                else:
                    new_dirs.add(d)
            for f, data in self._files.items():
                if f.startswith(prefix):
                    new_files[dst + f[len(src):]] = data
                else:
                    new_files[f] = data
            self._dirs = new_dirs
            self._files = new_files
            return
        raise StoragePathNotFoundError(src)

    def copy(self, source_path: str, destination_path: str) -> None:
        src = self._norm(source_path)
        dst = self._norm(destination_path)
        if src in self._files:
            if dst in self._files or dst in self._dirs:
                raise StorageConflictError(dst)
            self._ensure_dir(self._parent(dst))
            self._files[dst] = self._files[src]
            return
        if src in self._dirs:
            if dst in self._files or dst in self._dirs:
                raise StorageConflictError(dst)
            prefix = src.rstrip("/") + "/"
            self._ensure_dir(dst)
            for d in list(self._dirs):
                if d.startswith(prefix):
                    self._dirs.add(dst + d[len(src):])
            for f, data in list(self._files.items()):
                if f.startswith(prefix):
                    self._files[dst + f[len(src):]] = data
            return
        raise StoragePathNotFoundError(src)

    def delete(self, path: str) -> None:
        p = self._norm(path)
        if p in self._files:
            del self._files[p]
            return
        if p in self._dirs:
            prefix = p.rstrip("/") + "/"
            self._dirs = {d for d in self._dirs if d != p and not d.startswith(prefix)}
            self._files = {
                f: data for f, data in self._files.items() if not f.startswith(prefix)
            }
            return
        raise StoragePathNotFoundError(p)


# ---------------------------------------------------------------------------
# Fixtures del escenario RUBIALES
# ---------------------------------------------------------------------------


SOURCE_DIR = "/cartografia/MAPA_LOC_DIST_LINDERO_TRAYECTORIA_RUBIALES1747H_4CR_MNal"
DEST_DIR = "/cartografia/output"

RUBIALES_WELLS = ["RUBIALES1747H", "RUBIALES2263H", "RUBIALES2456H", "RUBIALES2458P"]
OWNER_WELL = "RUBIALES1747H"
OTHER_WELLS = [w for w in RUBIALES_WELLS if w != OWNER_WELL]
SHP_FILES = ["mapa.shp", "mapa.shx", "mapa.dbf"]


def _make_adapter_with_source() -> InMemoryAdapter:
    adapter = InMemoryAdapter()
    adapter.add_dir(SOURCE_DIR)
    for well in RUBIALES_WELLS:
        for ext in ("pdf", "mxd"):
            adapter.add_file(
                f"{SOURCE_DIR}/Loc_dist_Survey_{well}_4CR_MNal_SGC.{ext}",
                content=f"{well}-{ext}".encode("ascii"),
            )
    for sf in SHP_FILES:
        adapter.add_file(f"{SOURCE_DIR}/SHP/{sf}", content=sf.encode("ascii"))
    adapter.add_dir("/cartografia")
    return adapter


class _FakeVolume:
    def __init__(self, share: str = "/cartografia") -> None:
        self.id = uuid4()
        self.is_active = True
        self.share_path = share


@pytest.fixture
def scenario(monkeypatch: pytest.MonkeyPatch):
    adapter = _make_adapter_with_source()
    volume = _FakeVolume(share="/cartografia")

    def fake_get_volume_by_id(db, volume_id):
        return volume

    def fake_get_adapter(vol):
        return adapter

    monkeypatch.setattr(
        "modules.cartography.service.get_volume_by_id", fake_get_volume_by_id
    )
    monkeypatch.setattr(
        "modules.cartography.service.get_adapter", fake_get_adapter
    )
    return adapter, volume


# ---------------------------------------------------------------------------
# Preview
# ---------------------------------------------------------------------------


class TestPreview:
    def test_detects_owner_and_three_others(self, scenario):
        _, volume = scenario
        plan = CartographySplitService.preview(
            db=None, volume_id=volume.id, source_path=SOURCE_DIR, dest_path=DEST_DIR
        )
        assert plan["owner_well"] == {"well": "RUBIALES1747H", "cr": "4CR"}
        assert len(plan["detected_wells"]) == 4
        owners = [w for w in plan["detected_wells"] if w["is_owner"]]
        assert len(owners) == 1
        others = [w for w in plan["detected_wells"] if not w["is_owner"]]
        assert sorted(w["well"] for w in others) == sorted(OTHER_WELLS)

    def test_summary_counts(self, scenario):
        _, volume = scenario
        plan = CartographySplitService.preview(
            db=None, volume_id=volume.id, source_path=SOURCE_DIR, dest_path=DEST_DIR
        )
        assert plan["summary"] == {
            "new_dirs_to_create": 3,
            "files_to_move": 6,  # 3 pozos * (pdf + mxd)
            "shp_copies_planned": 3,
        }
        assert plan["shp_folders"] == ["SHP"]
        assert plan["unmatched_files"] == []
        assert plan["conflicts"] == []

    def test_target_dir_paths_under_dest(self, scenario):
        _, volume = scenario
        plan = CartographySplitService.preview(
            db=None, volume_id=volume.id, source_path=SOURCE_DIR, dest_path=DEST_DIR
        )
        for w in plan["detected_wells"]:
            if w["is_owner"]:
                assert w["target_dir_path"] == SOURCE_DIR
            else:
                assert w["target_dir_path"].startswith(DEST_DIR + "/")
                assert w["target_dir_path"].endswith(f"_{w['well']}_{w['cr']}_MNal")

    def test_unmatched_files_listed(self, scenario):
        adapter, volume = scenario
        adapter.add_file(f"{SOURCE_DIR}/README.txt", content=b"notes")
        adapter.add_file(f"{SOURCE_DIR}/.DS_Store", content=b"meta")
        plan = CartographySplitService.preview(
            db=None, volume_id=volume.id, source_path=SOURCE_DIR, dest_path=DEST_DIR
        )
        assert set(plan["unmatched_files"]) == {"README.txt", ".DS_Store"}

    def test_rejects_source_dir_name_mismatch(self, scenario):
        _, volume = scenario
        with pytest.raises(CartographySplitValidationError):
            CartographySplitService.preview(
                db=None,
                volume_id=volume.id,
                source_path="/cartografia/random_folder",
                dest_path=DEST_DIR,
            )

    def test_rejects_dest_inside_source(self, scenario):
        _, volume = scenario
        with pytest.raises(CartographySplitValidationError):
            CartographySplitService.preview(
                db=None,
                volume_id=volume.id,
                source_path=SOURCE_DIR,
                dest_path=f"{SOURCE_DIR}/subdir",
            )

    def test_reports_conflicts(self, scenario):
        adapter, volume = scenario
        existing = (
            f"{DEST_DIR}/"
            "MAPA_LOC_DIST_LINDERO_TRAYECTORIA_RUBIALES2263H_4CR_MNal"
        )
        adapter.add_dir(existing)
        plan = CartographySplitService.preview(
            db=None, volume_id=volume.id, source_path=SOURCE_DIR, dest_path=DEST_DIR
        )
        assert len(plan["conflicts"]) == 1
        assert plan["conflicts"][0]["path"] == existing


# ---------------------------------------------------------------------------
# Execute
# ---------------------------------------------------------------------------


class TestExecute:
    def test_happy_path_moves_and_copies(self, scenario):
        adapter, volume = scenario
        result = CartographySplitService.execute_on_volume(
            db=None,
            volume_id=volume.id,
            source_path=SOURCE_DIR,
            dest_path=DEST_DIR,
        )

        # 3 carpetas nuevas creadas
        assert result["summary"]["newDirsCreated"] == 3
        assert result["summary"]["filesMoved"] == 6
        assert result["summary"]["shpCopiesDone"] == 3

        # Owner sigue intacto con sus 2 archivos + SHP original
        for ext in ("pdf", "mxd"):
            assert adapter.exists(
                f"{SOURCE_DIR}/Loc_dist_Survey_{OWNER_WELL}_4CR_MNal_SGC.{ext}"
            )
        for sf in SHP_FILES:
            assert adapter.exists(f"{SOURCE_DIR}/SHP/{sf}")

        # Otros pozos: PDF/MXD ya no están en source, sí en el destino
        for well in OTHER_WELLS:
            for ext in ("pdf", "mxd"):
                assert not adapter.exists(
                    f"{SOURCE_DIR}/Loc_dist_Survey_{well}_4CR_MNal_SGC.{ext}"
                )
            target = (
                f"{DEST_DIR}/MAPA_LOC_DIST_LINDERO_TRAYECTORIA_{well}_4CR_MNal"
            )
            for ext in ("pdf", "mxd"):
                assert adapter.exists(
                    f"{target}/Loc_dist_Survey_{well}_4CR_MNal_SGC.{ext}"
                )
            # SHP copiado completo
            for sf in SHP_FILES:
                assert adapter.exists(f"{target}/SHP/{sf}")

    def test_conflict_without_overwrite_raises_and_preserves_source(self, scenario):
        adapter, volume = scenario
        existing = (
            f"{DEST_DIR}/"
            "MAPA_LOC_DIST_LINDERO_TRAYECTORIA_RUBIALES2263H_4CR_MNal"
        )
        adapter.add_dir(existing)
        dirs_before, files_before = adapter.snapshot()

        with pytest.raises(CartographySplitConflictError) as exc:
            CartographySplitService.execute_on_volume(
                db=None,
                volume_id=volume.id,
                source_path=SOURCE_DIR,
                dest_path=DEST_DIR,
                overwrite_existing=False,
            )
        assert existing in exc.value.conflicting_paths

        # Nada se movió
        dirs_after, files_after = adapter.snapshot()
        assert dirs_after == dirs_before
        assert files_after == files_before

    def test_conflict_with_overwrite_replaces_target(self, scenario):
        adapter, volume = scenario
        existing = (
            f"{DEST_DIR}/"
            "MAPA_LOC_DIST_LINDERO_TRAYECTORIA_RUBIALES2263H_4CR_MNal"
        )
        adapter.add_file(f"{existing}/stale.pdf", content=b"stale")

        CartographySplitService.execute_on_volume(
            db=None,
            volume_id=volume.id,
            source_path=SOURCE_DIR,
            dest_path=DEST_DIR,
            overwrite_existing=True,
        )

        # El archivo stale fue eliminado y ahora solo están los nuevos
        assert not adapter.exists(f"{existing}/stale.pdf")
        assert adapter.exists(
            f"{existing}/Loc_dist_Survey_RUBIALES2263H_4CR_MNal_SGC.pdf"
        )
        assert adapter.exists(f"{existing}/SHP/mapa.shp")
