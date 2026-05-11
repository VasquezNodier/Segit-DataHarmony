# GYG — Horizontes 3D split (`horizontes-split`)

## Objetivo

Migración del flujo legacy (bash/awk sobre `horizontes.dat`, opción 6 del selector `selector_script_modificado.sh` → `partir_horizontes_3d.txt`) a Python. La lógica vive en **`HorizontesSplitService`** (`modules/routines/horizontes_split/service.py`). Celery solo crea el job, pasa a RUNNING y delega en el servicio. La UI usa el mismo perfil `volume_path` que `fallas-split`: selector de volumen, ruta manual y explorador de directorios.

La rutina **`horizontes-split`** se registra en BD por la migración **012** (catálogo opcional, el seed script también la cubre).

## Contrato de entrada

El servicio busca el archivo de entrada en el directorio de trabajo probando los siguientes nombres en este orden (primer match gana):

1. `horizontes.dat`
2. `horizontes.xlsx`
3. `horizontes.xls`
4. `horizontes.dat.xlsx`
5. `horizontes.dat.xls`

Las variantes `.dat.xlsx` cubren el caso en que alguien abre el archivo original `horizontes.dat` en Excel y hace *Guardar como* — Excel mantiene el `.dat` en el nombre y añade `.xlsx`.

El reader detecta automáticamente uno de dos formatos por su contenido binario:

### 1) Texto plano (formato legacy)

Lo que el bash original esperaba. Codificación tolerante (UTF-8 → CP-1252 → Latin-1 como red de seguridad para archivos generados en Windows con caracteres `º`, `ñ`, tildes, etc.). Ejemplo:

```
! comentarios opcionales — se descartan
HorizonA
   1.00000     2.00000     3.00000
   4.00000     5.00000     6.00000

HorizonB
   7.00000     8.00000     9.00000
```

### 2) Excel xlsx (aunque venga con extensión `.dat`)

Detectado por magic number ZIP `PK\x03\x04`. Se abre con `openpyxl` en modo `read_only=True` / `data_only=True` (streaming, seguro con archivos grandes) y la **primera hoja** se convierte a la misma lista de líneas que el reader de texto plano:

- Fila en la que la primera celda contiene letras → header del horizonte.
- Fila vacía → descartada.
- Fila con `!` en alguna celda → descartada.
- Resto de filas → línea de datos formada por las celdas no-nulas unidas por un único espacio. Floats enteros (`1.0`) se imprimen como `1` para no ensuciar los `.dat` de salida.

Esto permite procesar archivos que los geólogos exportan directamente desde Excel sin necesidad de re-guardar manualmente como texto plano.

### Reglas de parsing (equivalentes al bash legacy)

| Regla                                                            | Equivalente bash                                 |
| ---------------------------------------------------------------- | ------------------------------------------------ |
| Se descartan líneas vacías o solo con espacios.                  | `sed -i '/^ *$/d'`                               |
| Se descartan líneas que contienen `!` (en cualquier posición).   | `sed -i '/\!/d'`                                 |
| Si el primer token contiene algún carácter alfabético, es header | `awk '$1 ~ /[a-zA-Z]/{x=$1;next}'`               |
| Resto de líneas → al archivo `<header>.dat` del último header    | `{print > x".dat"}`                              |

El orden de aparición de horizontes se preserva. Un dato antes del primer header hace fallar el job (el awk legacy silenciosamente lo descartaba; aquí preferimos "fail fast").

## Salida

En el **mismo directorio** que `horizontes.dat`, un archivo por horizonte:

`<Horizon>.dat`

Las líneas de datos se copian **tal cual** estaban en la entrada (sólo previo al cleanup de vacías / `!`). No hay reformateo con `printf` como sí pasa en `fallas-split`.

Si el nombre del horizonte contiene caracteres inválidos para nombre de archivo (`\ / : * ? " < > |`), el job **falla** con mensaje explícito.

## Job (API)

- **POST** `/api/v1/jobs` (FormData), igual que otras routines.
- **Campos:**
  - `routineId`: `horizontes-split`
  - `moduleId`: `geology_geophysics`
  - `volumeId`: UUID del volumen.
  - `params` (JSON string):
    - `directoryPath` (obligatorio): directorio que contiene `horizontes.dat`.
    - `overwriteExisting` (boolean): si `false` y ya existe algún `.dat` de salida, el job falla listando conflictos.

## Errores frecuentes

| Caso                             | Resultado                           |
| -------------------------------- | ----------------------------------- |
| Directorio inexistente           | FAILURE                             |
| Sin `horizontes.dat`             | FAILURE                             |
| Archivo vacío tras cleanup       | FAILURE                             |
| Dato antes de cualquier header   | FAILURE                             |
| Header sin filas (no hay datos)  | FAILURE                             |
| Nombre de horizonte inválido     | FAILURE                             |
| Salidas existentes sin overwrite | FAILURE + `conflictingFiles`        |
| Volumen inactivo / red           | FAILURE                             |

## Resultado del job (`job.result`)

Incluye:

- `service`: `"horizontes_split"`
- `filesWritten`: rutas remotas escritas
- `fileNames`: nombres de archivo generados
- `rowsPerHorizon`: conteo de filas por horizonte
- `directory`: directorio sanitizado
- `stdout`: resumen legible
- `stderr`: vacío (errores se reportan vía `error` / `code`)

## Operativa

1. Migración **012**: inserta la fila `horizontes-split` en `routines` con `execution_mode = horizontes_volume_split`.
2. Seed: `python scripts/seed_routines.py` también la cubre a partir de `routines/catalog.json`.
3. El worker Celery maneja `execution_mode = "horizontes_volume_split"` en `modules/jobs/tasks.py` (bloque paralelo al de `fallas_volume_split`).
4. Frontend: `/gyg/[id]/page.tsx` detecta `executionProfile = "volume_path"` y renderiza `RoutineVolumePathExecution`, que usa `getVolumePathConfig(slug)` para saber qué archivo de entrada esperar y si debe mostrar un filtro. Para `horizontes-split` no hay filtro.

## Generalización del perfil `volume_path`

Para soportar esta segunda rutina sin duplicar el componente, se introdujo `volumePathConfigs` en `apps/web/components/routines/routine-utils.ts`:

```ts
export const volumePathConfigs: Record<string, VolumePathConfig> = {
  "fallas-split":    { inputFilename: "fallas.dat", filter: { ... } },
  "horizontes-split": { inputFilename: "horizontes.dat" },
};
```

En backend, `schemas.VOLUME_PATH_MODES` es el conjunto canónico de `execution_mode` que mapea al perfil `volume_path` en la UI.

## Tests

`apps/api/tests/test_horizontes_split.py`:

- Limpieza de líneas vacías y con `!`.
- Detección de header por primer token alfabético.
- Orden de aparición preservado.
- Dato antes de header → falla.
- Nombre de horizonte con chars inválidos → falla.
- Output por horizonte idéntico a los golden files.

Fixtures en `apps/api/tests/fixtures/horizontes_split/`: `horizontes.dat`, `HorizonA.dat`, `HorizonB.dat`.
