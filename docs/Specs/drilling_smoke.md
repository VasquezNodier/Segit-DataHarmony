# Smoke test manual — Drilling (Scripts / Aplicaciones / Documentos)

Prerrequisitos: API y web levantados; usuario autenticado (token válido o `AUTH_SKIP_VALIDATION` en dev).

1. **Listado**: abrir `/drilling`. Deben verse tres pestañas (Scripts, Aplicaciones, Documentación) con contadores coherentes (vacío o con datos existentes).
2. **Script**: crear un script nuevo; abrir, editar y guardar; verificar que el contenido persiste al cerrar y volver a abrir.
3. **Aplicación**: crear una app con URL y categoría; eliminar y confirmar que desaparece de la lista.
4. **Documento — enlace**: crear documento tipo enlace; comprobar que abre en nueva pestaña.
5. **Documento — markdown**: crear documento markdown; ver vista previa desde el modal/lista.
6. **Documento — archivo**: subir un PDF (u otro archivo soportado); abrir panel de vista previa; descargar desde el ícono de descarga. Verificar que las peticiones van a `/api/drilling/files/{id}` y `/api/drilling/files/{id}/preview` (BFF Next) y que el backend responde en `/api/v1/drilling/*`.
7. **Aislamiento**: en Data Quality (`/data-quality`) o GYG (`/gyg`), confirmar que los ítems creados en Drilling **no** aparecen en esos catálogos (módulo `drilling` separado).
