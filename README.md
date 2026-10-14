# Dispensador de bebidas

Interfaz local en HTML, CSS y JavaScript puro. Sin dependencias ni recursos de internet. Los paneles SVG son ilustraciones propias de demostración, no recursos oficiales. No se recibió la fotografía de referencia; el carrusel sigue su descripción textual.

## Abrir

En VS Code, abre esta carpeta y, con la extensión **Live Server** instalada, haz clic derecho sobre `index.html` → **Open with Live Server**. También se puede abrir `index.html` directamente: no usa módulos ni peticiones HTTP. Tras cargar los archivos funciona sin internet.

## Entorno de prueba en Vercel

`vercel.json` configura el proyecto como sitio estático (Framework Preset: Other), sin instalación ni compilación, con la raíz como carpeta de salida. `.vercelignore` excluye documentación y pruebas de las cargas realizadas con la CLI. `.gitignore` excluye la vinculación local `.vercel/` del control de versiones.

Sitio de prueba publicado: **https://dispensadorbebidas.vercel.app**. Se verificó acceso sin sesión: la página, CSS, JavaScript y los tres SVG responden HTTP 200. La web sigue usando únicamente el adaptador de demostración.

Node.js y Vercel CLI están preparados en `%LOCALAPPDATA%\Codex\deployment-tools`, fuera del proyecto. La carpeta ya está vinculada al proyecto `dispensador_bebidas` de Vercel y la sesión está autorizada. Los datos de vinculación en `.vercel/` están excluidos del control de versiones.

Para iniciar sesión y publicar desde la terminal de PowerShell en esta carpeta, ejecuta `powershell -NoProfile -ExecutionPolicy Bypass -File .\deploy.ps1`. El script verifica la sesión, abre el flujo oficial si hace falta y despliega al confirmarse la autenticación. No se requieren contraseñas ni tokens en el código. El primer despliegue de un proyecto nuevo puede ser clasificado por Vercel como producción; los siguientes sin `--prod` son previews. Este proyecto completo se usa como entorno de demostración.

El primer despliegue quedó clasificado como producción por Vercel y recibió el dominio anterior. Las próximas ejecuciones del script generan previews con una nueva URL y no actualizan ese dominio. La protección de autenticación está habilitada para previews; el dominio publicado se comprobó accesible sin sesión.

Como alternativa, con Node.js instalado y acceso a tu cuenta: `npx vercel login` inicia sesión y `npx vercel` desde esta carpeta crea un despliegue de preview. Guarda la URL devuelta para probar desde teléfono. Documentación oficial: https://vercel.com/docs/cli/deploy

## Interacción

Selecciona una bebida y coloca el vaso. Los botones grandes **SERVIR 4 oz / 6 oz / 8 oz** muestran el tiempo estimado. Un toque inicia una sesión automática de demostración y al terminar el tiempo se detiene. Soltar el botón no interrumpe este modo. La pérdida de foco, ocultación o salida de la página sí lo interrumpen. Las acciones y el carrusel se bloquean durante la sesión; no se encolan pulsaciones adicionales.

La tarjeta conserva el modo manual por pulsación mantenida, con parada inmediata al soltar. Con teclado, Enter selecciona la tarjeta y mantener Espacio sirve manualmente. Tab permite enfocar los botones de porción; Enter o Espacio los activan con la interacción nativa del navegador.

### Tiempo estimado y calibración

En `js/dispenser.js`, `DispenserTiming.flowMlPerMinute = [1200, 1200, 1200]` define el caudal de cada bomba, en el orden Coca-Cola / Seven Up / Gatorade. **Es un ejemplo provisional autorizado para la demostración, no una especificación ni medición de las bombas.** Sustituye cada número por su caudal medido. Las notas técnicas se conservan en esta documentación; la interfaz no muestra etiquetas de demostración.

Usando onzas líquidas estadounidenses (1 fl oz ≈ 29,57353 ml), `tiempo(s) = oz × 29,57353 × 60 / caudal(ml/min)`. Con el valor provisional de 1200 ml/min: 4 oz ≈ 118,3 ml → 5,9 s; 6 oz ≈ 177,4 ml → 8,9 s; 8 oz ≈ 236,6 ml → 11,8 s. Conversión: https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b9

Para calibrar: mide el volumen recogido durante un tiempo conocido con el circuito real; `caudal(ml/min) = volumen(ml) × 60 / tiempo(s)`. Repite por bomba y bebida con las mangueras, altura y alimentación finales. Un control por tiempo solo estima volumen: la dosificación exacta requiere verificación física y considerar variaciones del caudal, arranque y goteo. La aplicación no mide volumen real ni afirma haber entregado la cantidad solicitada; muestra «Proceso finalizado».

Desliza o usa las flechas para explorar; el carrusel no avanza automáticamente. Un toque breve selecciona y centra la tarjeta. Una nueva pulsación mantenida de 300 ms sobre esa tarjeta inicia la simulación. Soltar o salir de la tarjeta detiene; regresar no reinicia. Un toque corto o mantener una tarjeta sin selección previa no sirve. Explorar cancela la selección. Durante el servido se bloquea la navegación.

Con teclado: Tab enfoca los controles, las flechas exploran, Enter selecciona y mantener Espacio sobre la tarjeta seleccionada sirve después del umbral. Soltar Espacio detiene. La selección se conserva después de detener.

## Archivos y configuración

- `index.html`: estructura accesible, instrucciones y controles.
- `css/styles.css`: carrusel con profundidad, diseño adaptable y animación de burbujas; respeta movimiento reducido.
- `js/app.js`: renderizado/carrusel y estado/interacción en funciones separadas. `HOLD_MS`, `DRAG_PX` y `SWIPE_PX` configuran umbral y distancias.
- `js/dispenser.js`: fábrica del adaptador de demostración con `start`, `stop` y `getState`.
- `assets/`: tres SVG locales.

La aplicación controla un solo pointerId, captura el puntero y cancela ante pointerup, pointercancel, pérdida de captura/foco, página oculta o salida de página. Mientras se sirve verifica que el puntero siga dentro del área de la tarjeta. Arrastrar antes del umbral cancela el inicio. No se deshabilita el zoom.

## Integración pendiente con ESP8266-01

Sustituir la fábrica de demostración por un adaptador real compatible con `start({sessionId, drinkId, portionOz, mode, durationMs})`, `stop({sessionId})`, `getState()`. `portionOz` acepta 4, 6 u 8; `mode` es `manual` o `automatic`. `durationMs` es la duración solicitada del modo automático; en manual es null. La cuenta regresiva se inicia al resolverse el inicio, y una respuesta tardía no puede reactivar una sesión detenida. No hay endpoints ni tráfico al hardware. El firmware deberá gestionar su propia duración de servido y cancelación, sin depender del temporizador del navegador. El identificador por sesión invalida respuestas tardías en la interfaz; el adaptador y el firmware deberán garantizar la cancelación efectiva de inicios pendientes, las operaciones idempotentes y el orden de las órdenes. La demostración no constituye un control seguro de bombas.

En modo manual, soltar enviará una orden de detención; en automático, la enviarán las cancelaciones y el fin del tiempo estimado. Su llegada **no puede garantizarse si se pierde el Wi-Fi**. El firmware deberá apagar automáticamente por tiempo máximo y por ausencia de renovaciones periódicas de la orden de servido. Deberá impedir que dos teléfonos activen bombas simultáneamente. El protocolo, confirmaciones, renovaciones, límites de tiempo, asignación de bombas/relés y portal cautivo están pendientes.

Medir el tamaño final, conocer la capacidad/configuración del módulo y verificar el almacenamiento y servicio de los archivos antes de afirmar que caben. Esta implementación no verifica capacidad de memoria del ESP8266-01.

## Verificación

Revisar con navegador y equipo real: arrastrar sin seleccionar, primer toque solo selecciona, mantener sin selección no sirve, segunda pulsación sirve, toque breve no sirve, soltar/cancelar/salir/cambiar pestaña detiene, regresar no reinicia, varios dedos no duplican, navegación bloqueada durante servido, parada adicional y respuestas tardías. Comprobar mouse, teclado y pantalla táctil a 360 px y escritorio, zoom y ausencia de errores en consola.

Las comprobaciones automatizadas realizadas y los límites del entorno se documentan en `VERIFICACION.md`.
