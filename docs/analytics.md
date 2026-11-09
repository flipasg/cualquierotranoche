# Google Analytics 4

La integración se configura en **Pages CMS → Google Analytics** o en
`src/data/analytics.json`. Está activada con el ID de medición `G-9PXJ2JNL1J`.
Los cambios se aplican con el siguiente build y publicación; la recepción real
de visitas debe comprobarse después de publicar, siguiendo los pasos de abajo.

## Crear la propiedad en una cuenta existente

En la interfaz inglesa de [Google Analytics](https://analytics.google.com/):

1. Seleccionar la cuenta que administrará esta web y abrir **Admin → Create → Property**.
2. Nombre **Cualquier otra noche**, zona horaria de España/Madrid y moneda **Euro (EUR)**.
3. Pulsar **Next**, completar sector, tamaño y objetivos del negocio; pulsar **Create**.
4. Elegir **Web**, URL `https://cualquierotranoche.com` y nombre **Web Cualquier otra noche**.
5. Desactivar **Enhanced measurement** en esta primera fase y pulsar **Create stream**.
6. Copiar **Measurement ID** (`G-…`). También se encuentra en **Admin → Data collection
   and modification → Data streams → flujo web**.

El identificador `GTM-…` pertenece a un contenedor de Tag Manager; no sustituye al
ID de medición. Esta web utiliza GA4 directamente, sin contenedor GTM ni claves
privadas. Basta con completar **ID de medición GA4** y activar **Google Analytics**
en el CMS. No instalar además otra etiqueta para la misma propiedad: duplicaría
la medición.

Referencias: [crear la propiedad y el flujo](https://support.google.com/analytics/answer/9304153?hl=en),
[encontrar el ID](https://support.google.com/analytics/answer/12270356?hl=en).

## Funcionamiento

- Solo se activa en el origen canónico de `astro.config.mjs`. Desarrollo local,
  previews y otros dominios no cargan la etiqueta ni muestran el aviso.
- Antes de aceptar no se carga ningún recurso de Google Analytics ni se envían
  eventos. **Aceptar cookies** y **Rechazar cookies** tienen la misma presentación.
- La decisión se guarda en el navegador durante 180 días, asociada al ID de la
  propiedad. Si no se puede guardar, se aplica durante esa página y se vuelve a
  preguntar al navegar. Una decisión caducada o inválida nunca concede permiso.
- **Preferencias de privacidad**, al final de cada página, permite cambiar la
  elección. Rechazar desactiva la transmisión y borra las cookies `_ga` y `_ga_…`
  del sitio; también se sincroniza entre pestañas y al recuperar una página.
- Tras aceptar se carga una etiqueta y se configura una vista por documento.
  Se excluyen la query y el fragmento de la URL; del referente solo se conserva
  el origen. No se añaden eventos de formularios, búsquedas ni clics. GA4 puede
  generar sus eventos básicos de sesión y actividad. Mantener desactivada la
  medición mejorada evita su captura automática de interacciones adicionales.
- Google Signals y la personalización publicitaria están desactivados en esta
  integración. Las cookies tienen una duración máxima igual al tiempo restante
  del permiso, sin renovación automática.
- El controlador es un módulo del propio sitio. La CSP permite los dominios
  documentados para GA4 sin publicidad y mantiene bloqueados los scripts inline
  y `eval`. No habilitar etiquetas adicionales sin revisar esta política.

Referencias técnicas: [consentimiento básico](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic),
[desactivar la medición](https://developers.google.com/tag-platform/security/guides/privacy),
[configuración de GA4](https://developers.google.com/analytics/devguides/collection/ga4/reference/config),
[CSP](https://developers.google.com/tag-platform/security/guides/csp).

## Comprobación al publicar

1. Publicar el build con el ID correcto y la integración activada.
2. Abrir el dominio principal en un perfil limpio. Antes de elegir y después de
   rechazar, no debe haber solicitudes a `gtag/js` ni a los endpoints de Analytics.
3. Aceptar, navegar y comprobar **Reports → Realtime** en la propiedad nueva. La
   recepción real solo puede verificarse con la propiedad y el despliegue activos.
4. Abrir **Preferencias de privacidad**, rechazar y comprobar que desaparecen las
   cookies de GA y dejan de enviarse eventos; repetir tras recargar.
5. Revisar la consola y las cabeceras de producción: Astro Preview no aplica por
   sí mismo el archivo `_headers` de Cloudflare.

Los tests automatizados usan un ID sintético y dobles de Google; no deben enviar
visitas de prueba a una propiedad real. Ejecutar `npm test` y `npm run build` con
Node 22.12.0. Search Console sigue siendo independiente de esta integración.
