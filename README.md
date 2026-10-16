# SENATI TaskHub PWA

Aplicación Angular para consultar tareas académicas y registrar entregas en el dispositivo. El catálogo se lee desde JSON y las entregas se conservan en IndexedDB para que sigan disponibles después de recargar la página.

## Requisitos y comandos

El proyecto usa Angular 17.3. Instala las dependencias con `npm install` y ejecuta:

| Comando | Uso |
| --- | --- |
| `npm start` | Iniciar el servidor de desarrollo en `http://localhost:4200/`. |
| `npm run build` | Generar la aplicación en `dist/senati-taskhub-pwa/`. |
| `npm test -- --watch=false` | Ejecutar las pruebas unitarias una vez. |

## Cómo funciona el código

### Catálogo de tareas

- [`src/assets/data/tareas.json`](./src/assets/data/tareas.json) contiene el catálogo de partida. Cada tarea incluye `id`, `curso`, `titulo`, `instructor`, `fechaEntrega` y `estado`.
- [`src/app/services/tarea.service.ts`](./src/app/services/tarea.service.ts) define el tipo `Tarea` y `TareaService.obtenerTareas()`, que recupera el JSON usando `HttpClient`.
- [`src/app/app.component.ts`](./src/app/app.component.ts) llama a `cargarTareas()` al iniciar. La propiedad calculada `tareasFiltradas` combina el texto de búsqueda y el curso seleccionado; `tareaSeleccionadaId` mantiene la relación entre la tarea elegida y el formulario.

### Formulario y bandeja de entregas

- [`src/app/app.component.html`](./src/app/app.component.html) conecta los controles con el componente mediante `ngModel`, muestra la tarea seleccionada y presenta tanto el formulario como la bandeja **Mis entregas locales**.
- `enviarEntrega()` en [`src/app/app.component.ts`](./src/app/app.component.ts) valida que exista una tarea y que el comentario no esté vacío. Si son válidos, crea la fecha y un identificador local, guarda la entrega y actualiza la bandeja; si no, muestra un mensaje específico.
- `cargarEntregas()` recupera los registros guardados al iniciar. `cantidadPendiente` calcula el contador a partir de las entregas cargadas, no del indicador de conexión.
- `verDetalle()` alterna la vista del identificador local, comentario y estado. `eliminarEntrega()` pide confirmación antes de borrar el registro y actualiza la lista únicamente después de eliminarlo de IndexedDB.
- [`src/app/app.component.scss`](./src/app/app.component.scss) define la presentación adaptable de la lista, el formulario, los estados y la bandeja.

### Almacenamiento local y sincronización

[`src/app/services/storage.service.ts`](./src/app/services/storage.service.ts) administra IndexedDB:

- `abrirDB()` abre `senatiTaskDB` y prepara el almacén `entregas_pendientes`.
- `guardarEntregaLocal()` registra una entrega y devuelve su identificador numérico de IndexedDB.
- `obtenerEntregas()` consulta los registros persistidos.
- `eliminarEntrega()` elimina un registro por su identificador numérico.

Cada registro contiene `id` (clave numérica de IndexedDB), `identificadorLocal` (UUID), `tareaId`, `comentario`, `fechaRegistro` (ISO 8601) y `estadoSincronizacion`. Una entrega nueva siempre empieza como `PENDIENTE`. Los eventos `online` y `offline` actualizan el indicador de conexión; `reintentarPendientes()` informa el resultado del reintento, pero no cambia el estado. Este proyecto no tiene una API de entregas, así que estar conectado no confirma sincronización y ningún registro pasa automáticamente a `SINCRONIZADO`.

