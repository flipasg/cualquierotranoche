# Imágenes al compartir, dominio y Search Console

## Preparar las imágenes desde Pages CMS

Abre **Compartir en redes y favicon**. Todos estos ajustes se guardan en
`src/data/social.json`, separado de los textos visibles de la web.

1. Completa el título y la descripción generales de la portada, la imagen de
   respaldo y su descripción alternativa.
2. En **Personalizar cada página**, abre la ruta que quieras preparar. Ya están
   añadidas Inicio, Tattoo, Tatuajes, Flash, Obra, Ilustración, Sobre mí y Contacto.
3. Sube una imagen JPG, PNG o WebP y describe brevemente lo que se ve. Recomendamos
   una composición horizontal de **1200 × 630 píxeles**, con margen alrededor de
   textos y logotipos. La web conserva la proporción de la imagen; no la recorta
   automáticamente. No uses SVG para las imágenes sociales.
4. Si quieres, escribe un título y una descripción específicos para compartir.
   Estos campos no cambian los textos visibles ni el título o descripción SEO.
5. Guarda y publica mediante el flujo habitual del repositorio. Los cambios se
   aplican en el siguiente build y despliegue.

Si dejas vacíos los textos por página, se usan su título y descripción SEO.
En Inicio se usan los textos generales de esta sección. Si no eliges una imagen,
se usa la general de respaldo. Deja también vacía su descripción alternativa.

Las fichas de **obra e ilustración** utilizan automáticamente su portada y su
texto alternativo cuando la portada es JPG, PNG o WebP. Mientras tengan una
portada SVG de muestra utilizan la imagen general. Para personalizar una ficha,
añade una entrada con su ruta, por ejemplo `/obra/nombre-de-la-obra/`, y rellena
los campos que quieras sustituir. Cada ruta debe aparecer una sola vez: cópiala
de la ficha, sin el dominio, parámetros ni fragmento `#`. Las rutas actuales usan
minúsculas, números, guiones y guiones bajos.

El build comprueba el formato, las rutas duplicadas, que cada imagen personalizada
tenga descripción alternativa y que las imágenes configuradas se hayan preparado.
Las imágenes se publican con sus dimensiones reales y tipo de archivo, y sus URLs
son absolutas. La preparación de medios optimiza las imágenes a WebP.

Tras desplegar, comprueba las vistas previas reales en las aplicaciones que uses.
Algunas guardan las tarjetas en caché: sustituir una imagen con un nombre nuevo
ayuda a que detecten el cambio. El HTML correcto por sí solo no acredita que todas
las aplicaciones hayan actualizado su vista previa.

## Dominio canónico en Cloudflare

La dirección principal es `https://cualquierotranoche.com`. El código ya la usa
en canonical, Open Graph, sitemap y robots. En Cloudflare hay que revisar:

- Certificado TLS válido para `cualquierotranoche.com`,
  `www.cualquierotranoche.com`, `cualquierotranoche.es` y
  `www.cualquierotranoche.es`. HTTPS debe funcionar antes de redirigir.
- Redirecciones permanentes **301** de las variantes HTTP, `www` y `.es` a
  `https://cualquierotranoche.com`, conservando la ruta y los parámetros.
- El destino canónico debe servir la página sin volver a redirigir, para evitar
  bucles. Una ruta inexistente debe responder 404.

En una regla de redirección dinámica de Cloudflare, el destino puede ser
`concat("https://cualquierotranoche.com", http.request.uri.path)` con
**Preserve query string** activado. En la zona `.com`, limita la regla a los
hosts `cualquierotranoche.com` y `www.cualquierotranoche.com`, y haz que se active
solo si la petición es HTTP o el host es `www.cualquierotranoche.com`. En la zona
`.es`, aplícala a `cualquierotranoche.es` y `www.cualquierotranoche.es`.
Revisa primero las reglas existentes para evitar duplicidades.

Estas reglas son de infraestructura y no se configuran desde Pages CMS.
Referencia: [redirecciones de Cloudflare](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/settings/).

## Google Search Console

1. Añade una propiedad de tipo **Dominio**: `cualquierotranoche.com`, sin protocolo
   ni barras. Abarca HTTP, HTTPS y los subdominios del `.com`.
2. Verifica la propiedad mediante el asistente del proveedor DNS o el registro
   TXT que indique Google en Cloudflare. Conserva ese registro para mantener
   la verificación. No hace falta introducir claves en el código de la web.
3. En **Sitemaps**, envía `https://cualquierotranoche.com/sitemap-index.xml` y
   comprueba el resultado de lectura.
4. Cuando esté publicado el contenido definitivo, inspecciona la portada y las
   páginas principales. Revisa posteriormente indexación y rendimiento; los
   informes iniciales pueden tardar en disponer de datos.
5. Añade a la editora desde **Configuración → Usuarios y permisos** cuando se
   conozca su cuenta y el nivel de acceso acordado.

El `.es` es otra propiedad de dominio: se puede añadir para supervisar sus
redirecciones, pero no sustituye la propiedad principal del `.com`.

Referencia: [verificación de propiedad de Google](https://support.google.com/webmasters/answer/9008080).
