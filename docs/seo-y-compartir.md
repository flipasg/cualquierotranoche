# SEO, imágenes al compartir y seguimiento

## Editar metadatos sin cambiar los textos visibles

En **Configuración del sitio → Textos de interfaz**, las ocho páginas principales
tienen **Título SEO** (`seoTitle`) y **Descripción SEO** (`seoDescription`). Estos
campos solo cambian los metadatos. No modifican titulares, introducciones ni
migas de pan. Si se dejan vacíos, se utilizan los campos de respaldo existentes;
algunos de esos campos también se muestran en la página.

Escribe el título sin el sufijo de marca: la plantilla añade
**· Cualquier otra noche** una sola vez. Los metadatos se convierten a texto plano,
sin Markdown, etiquetas HTML ni marcas de color `{{accent}}` o `{{color:#RRGGBB}}`.
Las fichas de obras y proyectos siguen utilizando su propio título y descripción.

La configuración inicial orienta Inicio a tatuaje e ilustración en Vitoria,
Tattoo a tatuadora en Vitoria y Proyectos a ilustradora en Vitoria. Los estilos
confirmados son **tatuaje de autor, ilustrativo y contemporáneo**. La ubicación
confirmada es **No Limits Tattoo, calle Fueros 24, Vitoria-Gasteiz**.

Inicio incluye datos estructurados `WebSite` con el nombre artístico y el dominio
canónico obtenidos de la configuración. Valídalos con Schema Markup Validator;
la prueba de resultados enriquecidos de Google no admite el nombre del sitio.
El marcado no representa a Patricia como propietaria de No Limits ni crea una
ficha de empresa. Referencias: [títulos en Google](https://developers.google.com/search/docs/appearance/title-link)
y [nombre del sitio](https://developers.google.com/search/docs/appearance/site-names).

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

Pendientes de la comprobación del 9 de noviembre de 2026: `www.cualquierotranoche.com`
respondía 200 sin redirigir al dominio principal; el acceso HTTPS a `.es` produjo
un error de certificado desde el cliente de comprobación. Revisar certificado y
redirecciones en producción antes de dar estos puntos por resueltos. Esta entrega
local de metadatos no modifica Cloudflare.

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

Search Console ya está configurado, según confirmación de la propietaria. Utiliza
la propiedad existente; no es necesario crear otra ni introducir claves en el
código. Los datos de rendimiento y la indexación deben comprobarse en la cuenta:
esta entrega local no acredita resultados en Google.

1. Antes de publicar, guarda una referencia de los últimos 28 días completos:
   clics, impresiones, CTR y posición media, por consulta y por página. Conserva
   también los filtros utilizados (tipo de búsqueda, país y dispositivo).
2. Tras el despliegue habitual, comprueba el sitemap
   `https://cualquierotranoche.com/sitemap-index.xml`. Si ya está enviado y se lee
   correctamente, no hace falta volver a darlo de alta.
3. Inspecciona Inicio, Tattoo, Proyectos y Contacto: acceso de Google, estado de
   indexación y canonical elegido. Comprueba que el HTML publicado contiene los
   metadatos nuevos y solicita una nueva indexación de las páginas modificadas.
4. Compara cada 28 días con el periodo anterior utilizando los mismos filtros.
   Separa las consultas de marca (Cualquier otra noche y variantes observadas),
   profesión (tatuadora/ilustradora), estilos (autor, ilustrativo, contemporáneo)
   y ubicación (Vitoria/Vitoria-Gasteiz). No interpretes una ausencia de consultas
   en el informe como prueba de que nadie las busca.
5. Registra fecha de publicación, páginas modificadas y evolución. Google puede
   elegir otros títulos o fragmentos y tarda en volver a rastrear las páginas;
   ni los metadatos ni el marcado garantizan una posición concreta.

El `.es` es otra propiedad de dominio: se puede añadir para supervisar sus
redirecciones, pero no sustituye la propiedad principal del `.com`.

Referencia: [informe de rendimiento de Search Console](https://support.google.com/webmasters/answer/7576553?hl=es).

## Bing y siguientes fases

En Bing Webmaster Tools, comprueba si el sitio ya está añadido. Si falta, utiliza
la importación desde Search Console o el método de verificación de Bing. Envía el
mismo sitemap y revisa su lectura e indexación; no requiere añadir dependencias a
la web. Referencias: [añadir y verificar un sitio](https://www2.bing.com/webmasters/help/add-and-verify-site-12184f8b)
y [sitemaps](https://www2.bing.com/webmasters/help/sitemaps-3b5cf6ed).

Quedan para otra fase los textos visibles sobre servicios y ubicación, páginas
específicas por estilo si los datos lo justifican y la valoración de una ficha
propia de Patricia en Google Maps. Actualmente la ficha existente es la de No
Limits; no se modifica ni se crea otra en este trabajo. Publicación y cambios en
servicios externos se realizan por separado de esta entrega local.
