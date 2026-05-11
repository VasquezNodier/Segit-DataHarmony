# cartography_split fixtures

Estructura del ejemplo usada por `test_cartography_split.py`. Como el pipeline
opera a nivel de nombre de archivo (no de contenido binario), construimos un
adapter de volumen en memoria dentro del test.

Caso base (`RUBIALES1747H` es el pozo dueño):

```
MAPA_LOC_DIST_LINDERO_TRAYECTORIA_RUBIALES1747H_4CR_MNal/
├── Loc_dist_Survey_RUBIALES1747H_4CR_MNal_SGC.pdf
├── Loc_dist_Survey_RUBIALES1747H_4CR_MNal_SGC.mxd
├── Loc_dist_Survey_RUBIALES2263H_4CR_MNal_SGC.pdf
├── Loc_dist_Survey_RUBIALES2263H_4CR_MNal_SGC.mxd
├── Loc_dist_Survey_RUBIALES2456H_4CR_MNal_SGC.pdf
├── Loc_dist_Survey_RUBIALES2456H_4CR_MNal_SGC.mxd
├── Loc_dist_Survey_RUBIALES2458P_4CR_MNal_SGC.pdf
├── Loc_dist_Survey_RUBIALES2458P_4CR_MNal_SGC.mxd
└── SHP/
    ├── mapa.shp
    ├── mapa.shx
    └── mapa.dbf
```

Resultado esperado en `destPath`:

- 3 nuevas carpetas (`RUBIALES2263H`, `RUBIALES2456H`, `RUBIALES2458P`),
  cada una con su PDF+MXD movidos y una copia completa de `SHP/`.
- El directorio fuente conserva los 2 archivos de `RUBIALES1747H` más la
  subcarpeta `SHP/` original sin modificar.
