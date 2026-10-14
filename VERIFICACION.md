# Verificación realizada

## Despliegue en Vercel

Publicado en https://dispensadorbebidas.vercel.app. Vercel confirmó el estado `Ready`. Se comprobó sin credenciales HTTP 200 para `/`, `/css/styles.css`, `/js/app.js`, `/js/dispenser.js` y los tres SVG. La página incluye el encabezado esperado y no redirige a un inicio de sesión. La documentación, las pruebas y el script de despliegue se excluyeron de la carga mediante `.vercelignore`.

## Interacción local

Pruebas ejecutadas en Google Chrome headless con los archivos locales. Las 52 comprobaciones de `tests/interaction.html` pasaron:

- Botones de porción: requieren bebida seleccionada; cada opción 4/6/8 oz inicia servido automático con un toque, soltar no lo detiene, se bloquean activaciones adicionales y se detiene al concluir el plazo. La pérdida de foco interrumpe; un temporizador anterior no detiene una sesión nueva. Pérdida de foco y ocultación paran también el modo automático. Un caudal inválido deshabilita las acciones; los botones grandes caben a 360 px. La fórmula se comprobó con un caudal provisional. El adaptador conserva `portionOz` y rechaza tamaños distintos de 4/6/8.

- Mantener sin selección no sirve; primer toque solo selecciona; segundo toque breve no sirve; segunda pulsación mantenida sí sirve.
- Navegación bloqueada mientras sirve; un segundo pointerId no interfiere.
- Soltar detiene y conserva selección. Salir del área detiene y regresar no reinicia.
- pointercancel, pérdida de captura, blur, página oculta, y pagehide paran la simulación.
- Deslizar una tarjeta seleccionada cancela selección y no sirve.
- Enter selecciona, mantener Espacio sirve, repetición de tecla no duplica el inicio y soltar detiene.
- Sin desbordamiento horizontal en viewports de 360 y 1100 px; los tres SVG cargan correctamente.
- Adaptador: sesión cancelada no reinicia; iniciar y detener repetidamente es idempotente.
- Sin errores JavaScript observados durante la secuencia.

El archivo de pruebas puede abrirse con Live Server: presenta los resultados y un iframe de la interfaz. Sus eventos son sintéticos y sustituye las funciones de captura de puntero porque esos eventos no crean punteros activos en el navegador. Por ello, estas pruebas verifican las transiciones de la aplicación, pero no sustituyen pruebas de captura nativa, gestos, desplazamiento vertical, multitáctil o pérdida real de foco en dispositivos físicos. Los eventos de ocultación y salida también se simularon.

Una búsqueda del código confirmó ausencia de peticiones y recursos remotos. Las URLs `http://www.w3.org/2000/svg` son identificadores del formato SVG, no descargas. La versión inicial sumaba 20 767 bytes sin compresión; el selector añade HTML, CSS y JavaScript. Medir nuevamente antes de integrar el módulo. Esto no verifica que quepan en su memoria.

No se probó físicamente con teléfono, bombas, relés ni ESP8266-01. No se verificó un adaptador real con respuestas tardías, conectividad Wi-Fi, portal cautivo, tiempos de seguridad ni exclusión entre teléfonos; todo ello depende del protocolo y firmware pendientes.
