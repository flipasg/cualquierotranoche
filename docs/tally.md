# Formularios de Tally

La web abre los formularios mediante enlaces en una pestaña nueva. No necesita una clave API, scripts externos ni un formulario embebido. Las respuestas se guardan en Tally, no en este repositorio.

Estado: Tattoo («Cuéntame tu idea») está conectado a https://tally.so/r/QKG0YY, Avisos por ciudad («¿Nos vemos en tu ciudad?») a https://tally.so/r/gDB4vO, Obra original («Hablemos de esta obra») a https://tally.so/r/Pdo045, Ilustración («Cuéntame tu proyecto») a https://tally.so/r/1AjExW y Consulta general («Hablemos») a https://tally.so/r/rjXEWM. Todos los formularios están configurados. Esta guía define el contenido propuesto; no confirma que se hayan probado envíos ni la recepción de campos ocultos en Tally.

## Crear y conectar

1. En tu cuenta de Tally, crea un formulario para cada apartado de esta guía. Empieza por Tattoo.
2. Añade las preguntas con sus tipos y marca como obligatorias solo las indicadas. Los textos entre comillas se pueden copiar como contenido del formulario.
3. Añade un bloque `/hidden` para cada campo oculto indicado. Respeta exactamente mayúsculas y minúsculas: `flashCode`, `artworkId`, `source`.
4. Configura los textos de envío y confirmación. Completa la información de privacidad con los datos reales de la responsable antes de recoger respuestas. En los avisos por ciudad, concreta también el canal de baja y quién atenderá esas solicitudes; recoger una inscripción no envía avisos automáticamente.
5. Usa la vista previa, publica el formulario y copia su enlace público desde Share. Debe tener el formato `https://tally.so/r/ID`, no una URL de edición.
6. Pega ese enlace en la entrada correspondiente de `src/config/forms.ts`. Se puede conectar un formulario cada vez; los demás seguirán mostrando su estado pendiente.
7. Ejecuta `npm test` y `npm run build`. Al tratarse de una web estática, vuelve a desplegarla para publicar los enlaces nuevos.

| Formulario        | Entrada en `forms` | Campos ocultos        |
| ----------------- | ------------------ | --------------------- |
| Tattoo            | `tattoo`           | `flashCode`, `source` |
| Avisos por ciudad | `cityAlerts`       | `source`              |
| Obra original     | `artwork`          | `artworkId`, `source` |
| Ilustración       | `illustration`     | `source`              |
| Consulta general  | `general`          | `source`              |

Los campos ocultos reciben referencias públicas y pueden venir vacíos al abrir el formulario directamente. No son una prueba de disponibilidad ni de reserva. No añadas nombre, email, notas personales o archivos a las URLs.

## 1. Tattoo

**Título:** «Cuéntame tu idea»

**Introducción:** «No hace falta tenerlo todo decidido. Cuéntame qué te gustaría tatuarte y dónde. Enviar esta propuesta no confirma una cita ni reserva un diseño.»

| Pregunta                                                         | Tipo                                                         | Obligatoria |
| ---------------------------------------------------------------- | ------------------------------------------------------------ | ----------- |
| Nombre                                                           | Texto corto                                                  | Sí          |
| Email                                                            | Email                                                        | Sí          |
| ¿Qué tienes en mente?                                            | Opción única: Diseño personalizado / Un flash / Aún no lo sé | Sí          |
| Idea o notas sobre el diseño                                     | Texto largo                                                  | No          |
| Código del flash, si lo conoces                                  | Texto corto                                                  | No          |
| Referencias                                                      | Archivos, solo imágenes; hasta 3, máximo 10 MB por archivo   | No          |
| Tamaño aproximado                                                | Texto corto                                                  | No          |
| Zona del cuerpo                                                  | Texto corto                                                  | No          |
| Negro o color                                                    | Opción única: Negro / Color / No lo tengo decidido           | No          |
| Ciudad donde vives                                               | Texto corto                                                  | Sí          |
| ¿Dónde te gustaría tatuarte?                                     | Texto corto                                                  | Sí          |
| Disponibilidad y otras notas                                     | Texto largo                                                  | No          |
| Quiero recibir avisos de nuevas fechas en las ciudades indicadas | Casilla desmarcada inicialmente                              | No          |

**Referencia desde la web:** añade `flashCode` como campo oculto. Cuando tenga valor, muestra un texto «Flash seleccionado: » seguido de la mención de ese campo mediante `@`. El código manual permite consultar un flash al entrar directamente; si discrepa del recibido, revisa ambas referencias antes de responder. El acceso general no debe mostrar un flash seleccionado por defecto.

**Botón:** «Enviar propuesta»

**Confirmación:** «He recibido tu propuesta. Revisaré los detalles para responderte por email. Todavía no hay una cita confirmada ni un diseño reservado.»

## 2. Avisos por ciudad

**Título:** «¿Nos vemos en tu ciudad?»

**Introducción:** «Déjame tu email y las ciudades en las que te gustaría tatuarte. Apuntarte no reserva una cita ni garantiza una visita.»

| Pregunta                                                                  | Tipo                                | Obligatoria |
| ------------------------------------------------------------------------- | ----------------------------------- | ----------- |
| Nombre                                                                    | Texto corto                         | No          |
| Email                                                                     | Email                               | Sí          |
| Ciudad donde vives                                                        | Texto corto                         | Sí          |
| ¿En qué ciudades te gustaría tatuarte?                                    | Texto corto, admite varias ciudades | Sí          |
| Quiero recibir por email avisos de fechas en las ciudades que he indicado | Casilla desmarcada inicialmente     | Sí          |

Añade el procedimiento real para darse de baja junto a la información de privacidad. No uses todavía las ciudades de muestra del repositorio como destinos anunciados.

**Botón:** «Quiero recibir avisos»

**Confirmación:** «He recibido tu solicitud para recibir avisos de las ciudades indicadas. Esta inscripción no reserva una cita.»

## 3. Obra original

**Título:** «Hablemos de esta obra»

**Introducción:** «Cuéntame qué pieza te interesa. Te responderé con su disponibilidad y los detalles de compra y envío. Esta consulta no es una compra ni una reserva.»

| Pregunta                       | Tipo        | Obligatoria |
| ------------------------------ | ----------- | ----------- |
| Nombre                         | Texto corto | Sí          |
| Email                          | Email       | Sí          |
| Título o referencia de la obra | Texto corto | No          |
| Ciudad y país de envío         | Texto corto | No          |
| Consulta                       | Texto largo | No          |

Cuando `artworkId` tenga valor, muestra «Referencia de la obra: » seguido de la mención `@` del campo oculto. El título manual sirve para las consultas iniciadas desde Contacto o desde el enlace directo. No solicites una dirección postal completa para una primera consulta.

**Botón:** «Consultar por esta obra»

**Confirmación:** «He recibido tu consulta. Te responderé por email con los detalles. La obra todavía no está reservada.»

## 4. Ilustración

**Título:** «Cuéntame tu proyecto»

**Introducción:** «Cuéntame qué necesitas y para qué vas a usar la ilustración. Si algún detalle todavía está abierto, puedes indicarlo.»

| Pregunta                            | Tipo        | Obligatoria |
| ----------------------------------- | ----------- | ----------- |
| Nombre                              | Texto corto | Sí          |
| Email                               | Email       | Sí          |
| Marca, organización o proyecto      | Texto corto | No          |
| ¿Qué necesitas?                     | Texto largo | Sí          |
| ¿Dónde se utilizará la ilustración? | Texto largo | Sí          |
| Plazo o fecha orientativa           | Texto corto | No          |
| Presupuesto orientativo             | Texto corto | No          |
| Referencias o enlaces               | Texto largo | No          |

**Botón:** «Enviar consulta de ilustración»

**Confirmación:** «He recibido la información de tu proyecto. La revisaré y te responderé por email. El envío no confirma un encargo ni un presupuesto.»

## 5. Consulta general

**Título:** «Hablemos»

**Introducción:** «Para colaboraciones, dudas u otras consultas, puedes escribirme aquí.»

| Pregunta | Tipo        | Obligatoria |
| -------- | ----------- | ----------- |
| Nombre   | Texto corto | Sí          |
| Email    | Email       | Sí          |
| Asunto   | Texto corto | Sí          |
| Mensaje  | Texto largo | Sí          |

**Botón:** «Enviar mensaje»

**Confirmación:** «He recibido tu mensaje. Te responderé por email.»

## Comprobación con formularios publicados

Haz los envíos de prueba con datos sintéticos identificados como prueba y revisa las respuestas en Submissions:

- Tattoo desde la página: `source=portfolio-tattoo`, sin flash preseleccionado.
- Dos flashes diferentes: `source=portfolio-flash` y el `flashCode` correcto en cada respuesta.
- Dos obras diferentes: `source=portfolio-obra` y el `artworkId` correcto en cada respuesta.
- Ilustración desde un proyecto: `source=portfolio-proyecto`.
- Cada entrada de Contacto: `source=portfolio-contacto`.
- Avisos desde su sección: `source=portfolio-ciudades`.
- Enlace directo sin parámetros: ninguna referencia inventada y posibilidad de completar la consulta.
- Campos obligatorios, email inválido, límites de adjuntos y mensajes tras enviar.
- Casilla opcional de avisos sin marcar: la consulta de tattoo se puede enviar y no se interpreta como un alta.
- Móvil y teclado: completar, enviar y regresar al portfolio mediante el navegador.

Los tests locales verifican la generación de enlaces, no la recepción de respuestas en Tally.

## Documentación oficial consultada

- [Crear y publicar un formulario](https://tally.so/help/create-a-form).
- [Campos ocultos y parámetros de URL](https://tally.so/help/hidden-fields).
- [Mostrar campos ocultos dentro del formulario](https://tally.so/help/how-to-mention-hidden-fields-in-your-form).
- [Configurar adjuntos](https://tally.so/help/file-uploads).
