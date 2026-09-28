# Comprobantes

Generador de comprobantes de pago semanales (Costa Rica). Aplicación web sin servidor y
sin base de datos: funciona sin conexión y produce una **imagen** del comprobante lista
para **compartir** por WhatsApp o descargar.

## TL;DR

```bash
npm install
npm run dev      # http://localhost:5173
npm run test     # 77 pruebas
npm run build    # build de producción en build/
```

1. Abra **Configuración** (engranaje arriba a la derecha) y complete nombre, cédula,
   oficio, salario y monto por feriado. Guarde.
2. En la pantalla principal, elija el **sábado** en que se paga.
3. Si quiere, escriba una **nota** (EFECTIVO, SINPE, ADELANTO PARCIAL AGUINALDO…).
4. Pulse **Compartir** y elija WhatsApp.

Los datos viven **solo en el navegador de ese dispositivo** (`localStorage`); no se envían
a ningún servidor.

| Quiero… | Dónde |
| --- | --- |
| Cambiar un texto del comprobante | `src/lib/image/drawReceipt.js` |
| Ver todos los valores de la plantilla | [`docs/comprobante-template.xml`](docs/comprobante-template.xml) |
| Agregar o corregir feriados | [`src/lib/data/holidays.json`](src/lib/data/holidays.json) |
| Cambiar los valores por defecto | `src/lib/domain/config.js` |
| Traducir la interfaz | `src/lib/i18n/es.json` |

---

## Cómo se usa

### Semana de pago

El calendario muestra el mes completo. Solo los **sábados son seleccionables**, porque la
semana se paga el sábado que la cierra. Los días ya pasados se ven en gris, el sábado
elegido en azul fuerte, los sábados futuros en azul claro, y los feriados de pago
obligatorio llevan un **anillo rojo**. Las semanas pasadas siguen siendo seleccionables,
para poder regenerar o reenviar un comprobante viejo.

### Nota (opcional)

Sirve para anotar la forma de pago o cualquier observación de esa semana.

- El texto se convierte a **MAYÚSCULAS** automáticamente mientras escribe.
- Solo se aceptan letras (con acentos), números, espacios y `. , / - ( ) #`. Cualquier
  otro carácter se descarta al escribir, para que nada pueda romper el dibujo.
- Se imprime como una fila propia, entre los feriados y el **Monto Total**.
- Si está vacía, la fila **no se dibuja** y el comprobante no crece.
- Se **borra sola** al cambiar de semana, para que no se arrastre por descuido.

Ejemplos: `EFECTIVO` · `SINPE` · `ADELANTO PARCIAL AGUINALDO` · `PAGO PENDIENTE`

### Compartir

El botón usa `navigator.share()`, que abre el **menú nativo de compartir** del dispositivo
— el mismo que usan las aplicaciones nativas. No hace falta una app nativa, y la
aplicación nunca accede a los contactos: solo entrega el archivo al sistema y usted elige
el destinatario.

Dos detalles importantes:

- **WhatsApp ignora el texto cuando se adjunta una imagen**, así que el monto y la nota
  van dentro de la imagen, no como pie de foto.
- **La compatibilidad es desigual.** Pueden compartir archivos Safari en iOS 14+, Chrome
  en Android 76+, Safari en macOS y Chrome en Windows 128+. **Firefox no puede compartir
  archivos**, así que la aplicación descarga la imagen automáticamente y lo avisa, en
  lugar de dejar el botón sin efecto.

---

## Reglas de cálculo

| Concepto | Monto |
| --- | --- |
| Salario semanal (fijo) | 70.000,00 CRC |
| Día feriado de pago obligatorio laborado | +12.000,00 CRC **por cada día** |
| Feriado que cae **domingo** | No se paga (día de descanso) |
| Feriado **no obligatorio** | No se paga extra |

Ejemplo: Semana Santa 2026 (jueves 2 y viernes 3 de abril) cae en la misma semana de pago,
así que el comprobante muestra dos filas de feriado y un total de **94.000,00**.

Fuera de alcance por decisión del empleador: vacaciones, aguinaldo, horas extra, trabajo
en día de descanso, adelantos y feriados de pago no obligatorio.

### Feriados

Los feriados están en [`src/lib/data/holidays.json`](src/lib/data/holidays.json) — los 9
feriados de **pago obligatorio** de 2026. Los feriados de pago no obligatorio (2 y 31 de
agosto, 1 de diciembre) están excluidos a propósito.

**No hay lógica de traslado de feriados.** La Ley 9875 trasladaba los feriados al lunes,
pero su vigencia fue 2020–2024. Para 2026 ninguna norma autoriza el traslado, así que cada
feriado se observa en su fecha exacta, incluso si cae sábado o domingo.

Para agregar otro año, vea [`src/lib/data/README.md`](src/lib/data/README.md).

---

## El comprobante

```
COMPROBANTE PAGO SEMANAL
28/09/2026 03:01 PM
────────────────────────────────────────────────
21 de septiembre de 2026 al 27 de septiembre de 2026
Cuido Hilda León Quesada (Miriam)
A nombre de            VERONICA DEL CARMEN VEGA FLORES
Identificacion                        401-010479-0013M
Salario Semanal                         70,000.00 CRC
Feriado - Navidad                       12,000.00 CRC   ← una fila por feriado
Nota                                  ADELANTO PARCIAL  ← opcional
────────────────────────────────────────────────
Monto Total                             82,000.00 CRC
              [firma]
────────────────────────────────────────────────
Firma de recibido
```

Mide **700 px de ancho** y crece **una fila por feriado**, más una si hay nota. Una semana
normal ronda los 700×540. El ancho y las separaciones están en `drawReceipt.js`; el
archivo [`docs/comprobante-template.xml`](docs/comprobante-template.xml) documenta cada
valor con su nombre, como referencia.

> Ese XML es **solo documentación**: la aplicación no lo lee. El archivo que manda es
> `src/lib/image/drawReceipt.js`.

---

## Desarrollo

Requiere Node 20 o superior.

```bash
npm install
npm run dev        # servidor de desarrollo
npm run test       # pruebas unitarias
npm run build      # build de producción en build/
npm run preview    # sirve el build en la raíz (/)
```

### Probar el build como queda en producción

La aplicación se publica en un subdirectorio de GitHub Pages, así que la ruta base importa:

```bash
BASE_PATH=/comprobantes npm run build
node scripts/serve-subpath.mjs /comprobantes 4180
# → http://localhost:4180/comprobantes/
```

### Probar en el teléfono

`navigator.share()` **solo existe en un contexto seguro**. Sobre
`http://192.168.100.45:5173` el botón se degrada a "Descargar imagen" y WhatsApp nunca
aparece en el menú: la prueba no sirve. Hay que servir la aplicación por HTTPS.

La forma sencilla, con certificado válido y sin advertencias:

```bash
npm run dev                                                        # terminal 1
cloudflared tunnel --url http://localhost:5173 --no-autoupdate     # terminal 2
```

El túnel imprime una URL pública `https://algo-algo-algo.trycloudflare.com`; esa es la que
se abre en el teléfono. El servidor de desarrollo no necesita TLS porque el túnel ya es
HTTPS, y `server.allowedHosts` en `vite.config.js` acepta el dominio del túnel.

> El túnel publica el servidor de desarrollo (y su código fuente) en internet mientras
> esté corriendo. Ciérrelo con Ctrl-C al terminar. No exponga datos reales ahí.

Alternativa sin salir a internet, útil para revisar el diseño pero **no** para probar la
función de compartir:

```bash
npm run dev:secure
# → https://192.168.100.45:5173/  (certificado autofirmado)
```

Usa un certificado autofirmado de `@vitejs/plugin-basic-ssl`, así que hay que aceptar la
advertencia. Además el certificado solo cubre `localhost`, `127.0.0.1` y `::1` — **no** la
IP de la red — y iOS suele ser estricto con ese desajuste. Vite 8 por sí solo no puede
generar el certificado: `server.https` solo lee archivos de certificado, no acepta `true`.

### Estructura

```
docs/
  comprobante-template.xml          todos los valores del comprobante, documentados
src/
  routes/
    +layout.svelte                  estructura, PWA, service worker
    +page.svelte                    pantalla principal (generador)
    settings/+page.svelte           configuración
  lib/
    assets/firma_veronica.jpg       firma incluida en el comprobante
    components/WeekCalendar.svelte  calendario de semanas
    data/holidays.json              feriados de pago obligatorio
    domain/                         lógica pura y testeable
      calendar.js                   grilla del calendario
      config.js                     valores por defecto y años soportados
      dates.js                      utilidades de fechas (hora local)
      payroll.js                    feriados, totales y normalización de la nota
      currency.js                   formato de montos y monto en letras
    i18n/es.json                    todos los textos de la interfaz
    image/
      drawReceipt.js                dibuja el comprobante en un canvas
      receiptImage.js               genera el JPEG y lo descarga
      share.js                      comparte y, si no se puede, descarga
    stores/settings.svelte.js       configuración en localStorage
tests/                              pruebas unitarias
scripts/                            generador de iconos y servidor de prueba
```

### Notas técnicas

- **El comprobante es una imagen JPEG, no un PDF.** Se dibuja en un `<canvas>` con la API
  2D. Al usar las fuentes del navegador, el símbolo `₡` y los acentos se dibujan
  correctamente, a diferencia de jsPDF, cuyas fuentes incorporadas no pueden codificarlos.
- **La imagen se genera antes del toque, no dentro del manejador del clic.**
  `navigator.share()` exige *activación transitoria*: si se hace `await` para generar la
  imagen antes de llamarlo, la activación se consume y el navegador rechaza la acción con
  `NotAllowedError`. Por eso la imagen se dibuja cuando cambia la semana o la nota.
- Se dibuja a 2× (1400 px de ancho) para que el texto no se pixele; un JPEG pesa entre 140
  y 180 KB, adecuado para WhatsApp.
- **El comprobante es corto a propósito**: tiene que leerse bien como miniatura en un chat.
  Las pruebas en `tests/layout.test.js` fijan un presupuesto de altura para que no vuelva a
  crecer sin darse cuenta.
- **Las etiquetas del comprobante se arman en un solo lugar.** El título de cada fila sale
  ya terminado del modelo (`payroll.js`), y el dibujo no le agrega nada. Antes los dos
  agregaban un prefijo y el resultado era «Dia Feriado Feriado - Navidad»; las pruebas de
  `tests/receipt-text.test.js` leen el texto que llega al canvas para que no se repita.
- **SvelteKit con `adapter-static`**: el sitio completo se prerenderiza. El
  `fallback: '404.html'` está en `svelte.config.js` porque GitHub Pages lo necesita.
- **`paths.base`** debe coincidir con el nombre del repositorio. Se toma de la variable de
  entorno `BASE_PATH`, que el flujo de trabajo define automáticamente.
- **El service worker se registra desde la aplicación**, no desde el HTML, y el manifiesto
  de precarga se genera con una transformación propia para que las rutas queden bajo
  `paths.base`. Sin eso, la navegación sin conexión falla en GitHub Pages.

---

## Pruebas

```bash
npm run test
```

77 pruebas en seis archivos:

| Archivo | Cubre |
| --- | --- |
| `dates.test.js` | límites de semanas, cambios de mes y de año, lista de sábados |
| `payroll.test.js` | feriados por semana (incluidos dos en una misma), exclusión del domingo |
| `currency.test.js` | formato de montos local e internacional, monto en letras |
| `layout.test.js` | presupuesto de altura y orden vertical de las bandas |
| `receipt-text.test.js` | el texto exacto que se dibuja en el canvas |
| `note.test.js` | normalización de la nota y su fila en el comprobante |

---

## Despliegue

El flujo de trabajo en [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
ejecuta las pruebas, compila con `BASE_PATH` y publica en GitHub Pages en cada push a
`main`.

Antes del primer despliegue, en el repositorio: **Settings → Pages → Source: GitHub
Actions**.

---

## Pendientes

- Los iconos en `static/` son provisionales, generados con
  `node scripts/generate-icons.mjs`. Reemplácelos por el diseño final conservando los
  nombres y tamaños.
- Solo 2026 está soportado. Vea `src/lib/data/README.md` para agregar años.
- Los textos de la interfaz están solo en español, en `src/lib/i18n/es.json`.
