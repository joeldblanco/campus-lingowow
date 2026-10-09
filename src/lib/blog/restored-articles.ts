export interface RestoredBlogArticle {
  slug: string
  title: string
  description: string
  excerpt: string
  content: string
  thumbnailUrl: string
}

/**
 * Editorial recovery source for the 14 public seed articles whose production
 * content is currently an empty course-builder document.
 *
 * The main migration converts each HTML string into the course-builder JSON
 * shape used by the admin editor. Keep the HTML semantic and free of inline
 * image or script dependencies so it remains safe to sanitize and render.
 */
export const restoredBlogArticles: RestoredBlogArticle[] = [
  {
    slug: 'de-a1-a-a2-tiempo-record-hoja-ruta',
    title: 'De A1 a A2: una ruta práctica',
    description:
      'Un plan sencillo para consolidar lo esencial de A1 y empezar a comunicarte con más detalle en A2.',
    excerpt:
      'Organiza gramática, vocabulario y práctica comunicativa con objetivos pequeños y observables.',
    thumbnailUrl: '/images/blog/study-room-v3.webp',
    content: `
      <blockquote><strong>Respuesta corta:</strong> para pasar de A1 a A2, practica situaciones cotidianas con frases algo más completas. No necesitas estudiar toda la gramática: necesitas usar con frecuencia lo que te permite presentarte, describir tu entorno, hablar de experiencias sencillas y hacer planes.</blockquote>

      <h2>Qué consolidar</h2>
      <ul>
        <li><strong>A1:</strong> saludos, datos personales, necesidades básicas, números, horarios y preguntas cortas.</li>
        <li><strong>A2:</strong> descripciones, pasado de experiencias conocidas, planes y razones breves.</li>
      </ul>
      <p>En inglés, por ejemplo, puedes trabajar presente simple, presente continuo, pasado simple y <em>going to</em>. En otro idioma, el contenido exacto cambia.</p>

      <h2>Una semana posible</h2>
      <ol>
        <li>Repasa cinco frases útiles y recupéralas sin mirar.</li>
        <li>Lee o escucha un texto corto que entiendas casi por completo.</li>
        <li>Escribe seis frases sobre tu día: dos en presente, dos sobre ayer y dos sobre mañana.</li>
        <li>Grábate durante un minuto y anota una mejora para la próxima vez.</li>
      </ol>
      <p>Cada sesión puede tener una meta visible: pedir información, contar una experiencia o describir un lugar. Cuando puedas cumplirla con frases sencillas, añade un detalle o una pregunta. Así relacionas la gramática con una acción comunicativa.</p>

      <h2>Ejercicio rápido</h2>
      <p>Completa: <em>Yesterday I ___ at home. Tomorrow I ___ to the market.</em></p>
      <details><summary>Ver solución</summary><p><strong>Solución posible:</strong> <em>Yesterday I studied at home. Tomorrow I’m going to go to the market.</em> Después, cambia las dos frases por información verdadera sobre ti.</p></details>
    `,
  },
  {
    slug: '5-habitos-diarios-acelerar-aprendizaje',
    title: '5 hábitos para practicar en 15 minutos',
    description:
      'Cinco prácticas breves para mantener contacto frecuente con el idioma sin depender de sesiones largas.',
    excerpt:
      'Convierte unos minutos disponibles en recuperación, escucha, escritura y conversación con una rutina realista.',
    thumbnailUrl: '/images/blog/study-room-v3.webp',
    content: `
      <blockquote><strong>La idea clave:</strong> una rutina breve funciona mejor cuando tiene una tarea concreta. Decide qué vas a recordar, escuchar o decir durante esos minutos antes de empezar.</blockquote>

      <h2>Cinco hábitos pequeños</h2>
      <ol>
        <li><strong>Recupera tres frases:</strong> cierra tus apuntes e intenta decirlas de memoria.</li>
        <li><strong>Escucha cuatro minutos:</strong> elige un audio corto y anota dos palabras que reconozcas.</li>
        <li><strong>Narra dos minutos:</strong> describe lo que haces con frases sencillas.</li>
        <li><strong>Escribe tres minutos:</strong> redacta un mensaje o una frase sobre ayer, hoy o mañana.</li>
        <li><strong>Revisa tres minutos:</strong> corrige un error y vuelve a decir la frase correctamente.</li>
      </ol>

      <p>Los hábitos pueden hacerse por separado. Si un día solo tienes cinco minutos, elige recuperación y una frase hablada. La regularidad ayuda a mantener activo el material, pero la calidad de la tarea importa más que marcar una racha perfecta.</p>
      <p>Deja preparada la siguiente actividad: un audio guardado, tres frases en una nota o una pregunta para tu próxima clase. Reducir la decisión inicial hace que la rutina sea más fácil de retomar.</p>

      <h2>Ejercicio rápido</h2>
      <p>Programa diez minutos y prepara una mini-rutina: tres frases, un minuto de audio y cuatro frases sobre tu día.</p>
      <details><summary>Ver solución</summary><p><strong>Solución posible:</strong> recupera <em>I need to leave early</em>, <em>She works from home</em> y <em>We met last week</em>; escucha un diálogo breve; termina con <em>Today I work from home. I need to leave early. Yesterday I met a friend. We talked for an hour.</em></p></details>
    `,
  },
  {
    slug: 'subtitulos-si-o-no-guia-series',
    title: 'Subtítulos: cómo usarlos para aprender',
    description:
      'Una estrategia flexible para elegir subtítulos en tu idioma, en el idioma meta o ninguno según la tarea.',
    excerpt:
      'Los subtítulos pueden apoyar la comprensión si los usas para escuchar, comprobar y volver a intentar.',
    thumbnailUrl: '/images/blog/listening-lounge.webp',
    content: `
      <blockquote><strong>Respuesta corta:</strong> usa subtítulos en tu idioma cuando necesitas entender la escena, subtítulos en el idioma meta para relacionar sonido y escritura, y ningún subtítulo para comprobar qué entiendes solo con el oído.</blockquote>

      <h2>Una secuencia de tres pasos</h2>
      <ol>
        <li><strong>Comprende la escena:</strong> mira un fragmento corto con subtítulos en tu idioma si el contenido es demasiado difícil.</li>
        <li><strong>Observa el idioma:</strong> repite el fragmento con subtítulos en el idioma meta y apunta una expresión útil.</li>
        <li><strong>Comprueba la escucha:</strong> vuelve a verlo sin subtítulos y comprueba si reconoces la idea principal.</li>
      </ol>

      <p>Si lees todo y apenas escuchas, reduce la velocidad o usa un fragmento más corto. Si no entiendes nada, el material es demasiado exigente para practicar con comodidad. Una serie conocida puede ayudar porque ya conoces la situación y puedes concentrarte en el idioma.</p>
      <p>Evita convertir cada episodio en una traducción completa. Elige una escena, trabaja dos o tres expresiones y disfruta el resto. La comprensión global también es una habilidad que se entrena.</p>

      <h2>Ejercicio rápido</h2>
      <p>Elige un clip de dos minutos. Escribe una expresión que escuches con subtítulos en el idioma meta y úsala en una frase propia.</p>
      <details><summary>Ver solución</summary><p><strong>Solución posible:</strong> si aparece <em>Are you ready?</em>, escribe <em>Are you ready for the meeting?</em> y vuelve a decirla sin mirar. La meta es reconocer y usar una expresión, no traducir cada línea.</p></details>
    `,
  },
  {
    slug: 'metodo-flashcards-vocabulario',
    title: 'Flashcards que ayudan a recordar vocabulario',
    description: 'Cómo crear tarjetas breves con contexto y repasarlas con recuperación espaciada.',
    excerpt:
      'Aprende menos palabras por sesión, recupéralas activamente y repásalas en días distintos.',
    thumbnailUrl: '/images/blog/writing.webp',
    content: `
      <blockquote><strong>Qué hace útil a una flashcard:</strong> te obliga a recuperar una palabra o frase y te muestra la respuesta después. La repetición espaciada distribuye esos intentos en el tiempo; ayuda a recordar, pero no sustituye leer, escuchar y hablar.</blockquote>

      <h2>Diseña tarjetas pequeñas</h2>
      <ul>
        <li>Incluye una sola idea por tarjeta.</li>
        <li>Usa una frase real: <em>I need to book a room</em>, no solo <em>book = reservar</em>.</li>
        <li>Añade una imagen, audio o ejemplo si aclara el significado.</li>
        <li>Comprueba la respuesta y marca si fue fácil, difícil o incorrecta.</li>
      </ul>

      <p>Un calendario posible es revisar una tarjeta hoy, mañana, dentro de tres días y después una semana más tarde. Los intervalos dependen de tu rendimiento: una tarjeta difícil necesita volver antes. Si una tarjeta falla varias veces, simplifica la frase.</p>
      <p>Incluye distintas formas de recordar: algunas tarjetas pueden pedir el significado y otras la palabra o una frase completa. Si solo reconoces la respuesta al verla, todavía necesitas practicar la recuperación.</p>

      <h2>Ejercicio rápido</h2>
      <p>Crea una tarjeta para aprender <em>to borrow</em>. En el frente, escribe una frase con un espacio vacío; en el reverso, la palabra y su significado.</p>
      <details><summary>Ver solución</summary><p><strong>Solución posible:</strong> frente: <em>Can I ___ your pen?</em>; reverso: <em>borrow</em>, “pedir prestado”. En la siguiente revisión, intenta decir la frase antes de mostrar la respuesta y luego crea una variante: <em>Can I borrow your book?</em></p></details>
    `,
  },
  {
    slug: 'miedo-hablar-publico-clase-idiomas',
    title: 'Hablar en clase sin bloquearte',
    description:
      'Pasos concretos para reducir la presión al hablar y participar con frases preparadas y tareas graduales.',
    excerpt:
      'Prepara frases de apoyo, empieza con intervenciones cortas y mide el progreso por la participación.',
    thumbnailUrl: '/images/blog/town-park.webp',
    content: `
      <blockquote><strong>Empieza por bajar la dificultad:</strong> quedarte en blanco no significa que hayas olvidado todo. La presión, la velocidad y la atención de otras personas pueden hacer más difícil recuperar lo que sabes.</blockquote>

      <h2>Cuatro herramientas</h2>
      <ul>
        <li><strong>Frase de apoyo:</strong> <em>Let me think for a moment.</em></li>
        <li><strong>Petición clara:</strong> <em>Could you repeat the question, please?</em></li>
        <li><strong>Respuesta sencilla:</strong> comunica primero la idea; añade detalles después.</li>
        <li><strong>Escala gradual:</strong> lee una frase, practícala con otra persona y después úsala en clase.</li>
      </ul>

      <p>Antes de responder, apoya los pies en el suelo y centra la atención en la primera palabra que quieres decir. No es una prueba de perfección: es una oportunidad para practicar una acción concreta, como responder con una frase o hacer una pregunta.</p>
      <p>Si una pregunta abierta te abruma, pide una opción más concreta: <em>Do you mean my work or my studies?</em> También puedes responder primero con “I’m not sure” y añadir una idea breve. La participación aumenta cuando el primer paso parece posible.</p>

      <h2>Ejercicio rápido</h2>
      <p>Responde durante treinta segundos a <em>What did you do yesterday?</em>. Incluye una frase de apoyo si necesitas tiempo.</p>
      <details><summary>Ver solución</summary><p><strong>Solución posible:</strong> <em>Let me think for a moment. Yesterday I worked in the morning. After work, I cooked dinner and watched a short video in English.</em> La respuesta es válida aunque sea sencilla; en el siguiente intento añade un detalle.</p></details>
    `,
  },
  {
    slug: 'por-que-cometer-errores-es-bueno',
    title: 'Errores útiles al aprender idiomas',
    description:
      'Aprende a distinguir un desliz de un patrón y convierte la corrección en una práctica concreta.',
    excerpt:
      'Los errores son información: registra los que se repiten, corrige una meta cada vez y vuelve a usarla.',
    thumbnailUrl: '/images/blog/study-room-v3.webp',
    content: `
      <blockquote><strong>El objetivo no es evitar todos los errores:</strong> un desliz puede ocurrir aunque conozcas la regla; un error repetido señala una estructura que todavía necesita práctica.</blockquote>

      <h2>Corrige con criterio</h2>
      <ol>
        <li>Elige una meta para la sesión: pasado, orden de palabras o pronunciación.</li>
        <li>Anota la frase que dijiste y la versión corregida.</li>
        <li>Crea una segunda frase verdadera con la misma estructura.</li>
        <li>Vuelve a usarla en una conversación o grabación breve.</li>
      </ol>

      <p>No hace falta interrumpir cada frase para corregir todo. Si la conversación continúa y el mensaje se entiende, guarda los errores secundarios para después. La precisión mejora cuando la práctica incluye atención y una nueva oportunidad de producir la forma.</p>
      <p>Tu registro puede tener tres columnas: frase original, corrección y nueva frase. Al final de la semana, revisa solo los patrones que se repiten. Un error aislado no necesita convertirse en una lista interminable.</p>
      <p>También puedes pedir una corrección selectiva: “Hoy quiero practicar el pasado”. Así recibes información útil sin perder el hilo de la conversación.</p>

      <h2>Ejercicio rápido</h2>
      <p>Corrige: <em>Yesterday I go to the store.</em> Después, escribe una frase propia con el mismo patrón.</p>
      <details><summary>Ver solución</summary><p><strong>Solución:</strong> <em>Yesterday I went to the store.</em> Otra frase posible es <em>Yesterday I watched a film.</em> Di ambas en voz alta y cambia el complemento por información verdadera.</p></details>
    `,
  },
  {
    slug: 'no-tengo-oido-idiomas-mito',
    title: '¿No tengo oído? Cómo entrenar la escucha',
    description:
      'Una guía práctica para reconocer sonidos, palabras enlazadas y expresiones frecuentes con atención breve.',
    excerpt:
      'La escucha mejora cuando trabajas con fragmentos cortos, transcripción y repetición consciente.',
    thumbnailUrl: '/images/blog/listening-lounge.webp',
    content: `
      <blockquote><strong>El oído no es una etiqueta fija:</strong> que un idioma suene rápido no demuestra que carezcas de talento. Al principio cuesta separar palabras, reconocer sonidos nuevos y mantener la atención.</blockquote>

      <h2>Una práctica de cinco minutos</h2>
      <ol>
        <li>Escucha una frase sin mirar el texto y escribe lo que crees haber oído.</li>
        <li>Comprueba la transcripción y marca las palabras que faltaron.</li>
        <li>Escucha de nuevo y divide la frase en grupos de sentido.</li>
        <li>Repítela imitando el ritmo, sin intentar sonar perfecto.</li>
      </ol>

      <p>Los pares mínimos también ayudan a notar contrastes, por ejemplo <em>ship</em> y <em>sheep</em> en inglés. Trabájalos con audio y no solo con la ortografía. Reducir un poco la velocidad puede servir para identificar los límites de las palabras; después vuelve a la velocidad normal.</p>
      <p>Elige audios de una duración que puedas repetir sin cansarte. Escuchar la misma frase varias veces con una intención distinta —idea general, palabras concretas y ritmo— suele ser más útil que dejar una hora de radio como fondo.</p>

      <h2>Ejercicio rápido</h2>
      <p>Practica con <em>Could you send it again?</em>. Escúchala, marca los grupos de sentido y repítela tres veces.</p>
      <details><summary>Ver solución</summary><p><strong>Solución posible:</strong> <em>Could you / send it again?</em> Después, prueba <em>Could you send the email again?</em> La meta es reconocer el patrón y adaptarlo, no memorizar una grabación aislada.</p></details>
    `,
  },
  {
    slug: 'sobrevivir-primera-conversacion-nativo',
    title: 'Tu primera conversación con un hablante nativo',
    description:
      'Frases de control y estrategias sencillas para mantener una conversación real aunque tu nivel sea básico.',
    excerpt:
      'Pide repetición, confirma el sentido y usa descripciones simples cuando no recuerdes una palabra.',
    thumbnailUrl: '/images/blog/town-park.webp',
    content: `
      <blockquote><strong>Tu tarea es mantener el intercambio:</strong> en una primera conversación no necesitas demostrar todo lo que sabes. Necesitas saludar, entender la idea principal, pedir ayuda cuando haga falta y responder con recursos sencillos.</blockquote>

      <h2>Frases que te devuelven el control</h2>
      <ul>
        <li><em>I'm learning English. Could you speak a little more slowly?</em></li>
        <li><em>Could you repeat that, please?</em></li>
        <li><em>Do you mean the meeting is tomorrow?</em></li>
        <li><em>I don't know the word, but it's the thing we use for...</em></li>
      </ul>

      <p>Observa el contexto, pero no finjas entender. Si una respuesta es importante, confirma: <em>So, the train leaves at six, right?</em> También puedes pedir unos segundos con <em>Let me think</em>. La conversación será más fácil si preparas dos temas conocidos, como tu trabajo, tu ciudad o una actividad reciente.</p>
      <p>Si la otra persona habla demasiado rápido, explica lo que necesitas sin disculparte demasiado. Una petición concreta facilita que ambos continúen: <em>Could you say the last part again?</em> Después responde a esa parte, aunque sea con una sola oración.</p>

      <h2>Ejercicio rápido</h2>
      <p>Representa este diálogo: alguien te pregunta qué hiciste el fin de semana y no entiendes una palabra.</p>
      <details><summary>Ver solución</summary><p><strong>Solución posible:</strong> <em>Could you repeat that, please? Oh, you mean my weekend? I visited my sister. We cooked dinner and watched a film.</em> La respuesta pide aclaración, confirma el tema y continúa con frases simples.</p></details>
    `,
  },
  {
    slug: 'soy-demasiado-mayor-para-aprender-idiomas',
    title: 'Aprender idiomas de adulto',
    description:
      'Una guía realista para aprovechar experiencia, objetivos y estrategias al estudiar un idioma en la adultez.',
    excerpt:
      'La edad cambia el ritmo y las prioridades, pero no elimina la posibilidad de avanzar y comunicarte.',
    thumbnailUrl: '/images/blog/community-bookshop.webp',
    content: `
      <blockquote><strong>Respuesta corta: puedes empezar ahora.</strong> El ritmo y las prioridades varían entre personas, y los adultos aportan experiencia, objetivos claros y conocimientos con los que relacionar lo nuevo.</blockquote>

      <h2>Haz que el plan trabaje para ti</h2>
      <ul>
        <li>Elige una situación útil: viajar, hablar con familia, leer o trabajar.</li>
        <li>Estudia en sesiones de veinte minutos y repite el material en días distintos.</li>
        <li>Combina comprensión y producción: escucha una frase, léela y úsala.</li>
        <li>Guarda un registro de frases que ya puedes decir, no solo de errores.</li>
      </ul>
      <p>Adapta el horario a tu energía y a tus responsabilidades. Una sesión corta después del desayuno puede ser más sostenible que un bloque largo al final de un día agotador. También puedes practicar con material relacionado con tus intereses.</p>

      <p>Tu objetivo tampoco tiene que ser borrar tu acento. La inteligibilidad y la confianza permiten muchas conversaciones exitosas. Si una actividad exige demasiada memoria a la vez, reduce el número de palabras, usa apoyo escrito y aumenta la dificultad poco a poco.</p>

      <h2>Ejercicio rápido</h2>
      <p>Escribe tres frases sobre una actividad que conoces bien: cuándo la haces, con quién y por qué te gusta. Tradúcelas con ayuda y luego dilo sin leer.</p>
      <details><summary>Ver solución</summary><p><strong>Solución posible:</strong> <em>I walk every morning. I usually go with a friend. I like it because it helps me start the day.</em> Cambia <em>walk</em> por una actividad real y repítela mañana.</p></details>
    `,
  },
  {
    slug: 'ingles-supervivencia-20-frases-viajar',
    title: '20 frases de inglés para viajar',
    description:
      'Frases breves para pedir ayuda, moverte, alojarte, comer y resolver situaciones habituales durante un viaje.',
    excerpt:
      'Guarda estas veinte expresiones, practica su pronunciación y adapta los espacios a tu itinerario.',
    thumbnailUrl: '/images/blog/airport-lounge.webp',
    content: `
      <blockquote><strong>Guarda las frases que realmente usarás:</strong> practica estas expresiones en voz alta y cambia los lugares, nombres y números por información de tu viaje. Hablar despacio y pedir confirmación también forma parte de la comunicación.</blockquote>

      <ol>
        <li><strong>Excuse me, could you help me?</strong> — Disculpe, ¿podría ayudarme?</li>
        <li><strong>I am learning English.</strong> — Estoy aprendiendo inglés.</li>
        <li><strong>Could you speak more slowly, please?</strong> — ¿Podría hablar más despacio?</li>
        <li><strong>Could you repeat that, please?</strong> — ¿Podría repetirlo?</li>
        <li><strong>Where is the check-in desk?</strong> — ¿Dónde está el mostrador de facturación?</li>
        <li><strong>Where is gate 12?</strong> — ¿Dónde está la puerta 12?</li>
        <li><strong>Is this the bus to the city centre?</strong> — ¿Este es el autobús al centro?</li>
        <li><strong>How do I get to the city centre?</strong> — ¿Cómo llego al centro?</li>
        <li><strong>Can I pay by card?</strong> — ¿Puedo pagar con tarjeta?</li>
        <li><strong>I have a reservation under the name of...</strong> — Tengo una reserva a nombre de...</li>
        <li><strong>What time is check-out?</strong> — ¿A qué hora es la salida?</li>
        <li><strong>Is breakfast included?</strong> — ¿Está incluido el desayuno?</li>
        <li><strong>Do you have a room available?</strong> — ¿Tienen una habitación disponible?</li>
        <li><strong>I would like a table for two, please.</strong> — Quisiera una mesa para dos, por favor.</li>
        <li><strong>Does this dish contain nuts?</strong> — ¿Este plato contiene frutos secos?</li>
        <li><strong>Could I have the bill, please?</strong> — ¿Podría traerme la cuenta?</li>
        <li><strong>I have lost my passport.</strong> — He perdido mi pasaporte.</li>
        <li><strong>I need a doctor.</strong> — Necesito un médico.</li>
        <li><strong>Where is the nearest bathroom?</strong> — ¿Dónde está el baño más cercano?</li>
        <li><strong>Thank you for your help.</strong> — Gracias por su ayuda.</li>
      </ol>

      <h2>Ejercicio rápido</h2>
      <p>Elige cinco frases para tu llegada y sustituye los datos variables.</p>
      <details><summary>Ver solución</summary><p><strong>Solución posible:</strong> <em>Where is gate 12?</em>, <em>I have a reservation under the name of García</em>, <em>Is breakfast included?</em>, <em>Can I pay by card?</em> y <em>Thank you for your help.</em></p></details>
    `,
  },
  {
    slug: 'como-pedir-restaurante-como-local',
    title: 'Pedir en un restaurante en inglés',
    description:
      'Vocabulario y fórmulas para leer el menú, pedir con claridad, informar alergias y solicitar la cuenta.',
    excerpt:
      'Usa estructuras educadas y frases directas para pedir comida sin depender de señalar el menú.',
    thumbnailUrl: '/images/blog/restaurant.webp',
    content: `
      <blockquote><strong>Una fórmula sencilla funciona:</strong> para pedir, puedes usar <em>I would like...</em>, <em>Could I have...?</em> o <em>I'll have...</em>. Son formas claras y habituales.</blockquote>

      <h2>Lee el menú</h2>
      <ul>
        <li><strong>Starter:</strong> entrante.</li>
        <li><strong>Main course:</strong> plato principal.</li>
        <li><strong>Side:</strong> acompañamiento.</li>
        <li><strong>Bill</strong> o <strong>check:</strong> cuenta, según la variedad de inglés.</li>
      </ul>

      <h2>Pregunta por ingredientes</h2>
      <p>Si tienes una alergia, dilo de forma explícita: <em>I have a peanut allergy. Does this contain peanuts?</em> Para una preferencia, puedes decir <em>Could I have the sauce on the side?</em> o <em>Can I have the burger without onions?</em> Confirma la respuesta si la información es importante y sigue las indicaciones del restaurante.</p>

      <p>Para pagar, prueba <em>Could I have the bill, please?</em>, <em>Do you accept cards?</em> o <em>Could we split the bill?</em> Las normas sobre propinas y servicio cambian según el país; consulta el recibo o pregunta antes de asumir una cantidad.</p>
      <p>Antes de viajar, ensaya un pedido completo: saludo, plato, modificación y confirmación. Si el menú tiene palabras desconocidas, pregunta <em>What do you recommend?</em> o <em>What is in this dish?</em> Escuchar la respuesta también forma parte del ejercicio.</p>

      <h2>Ejercicio rápido</h2>
      <p>Completa este pedido: una mesa para dos, un plato sin frutos secos y la cuenta.</p>
      <details><summary>Ver solución</summary><p><strong>Solución posible:</strong> <em>I would like a table for two, please. Does this dish contain nuts? Could I have the bill, please?</em> Practícalo primero leyendo y después sin mirar.</p></details>
    `,
  },
  {
    slug: 'vocabulario-aeropuerto-checkin-embarque',
    title: 'Inglés en el aeropuerto: palabras y frases',
    description:
      'Una guía breve para entender facturación, seguridad, inmigración, puertas y anuncios durante un vuelo.',
    excerpt:
      'Repasa el recorrido desde el mostrador hasta el embarque y practica respuestas cortas para preguntas frecuentes.',
    thumbnailUrl: '/images/blog/airport-lounge.webp',
    content: `
      <blockquote><strong>Sigue el recorrido, paso a paso:</strong> el vocabulario del aeropuerto se vuelve más manejable si lo organizas por etapas. Los procedimientos pueden variar según el país y el aeropuerto.</blockquote>

      <h2>1. Facturación</h2>
      <p><strong>Check-in desk</strong> es el mostrador de facturación; <strong>boarding pass</strong>, la tarjeta de embarque; <strong>checked bag</strong>, el equipaje facturado; y <strong>carry-on bag</strong>, el equipaje de mano. Puedes escuchar <em>Are you checking any bags?</em> o <em>Window or aisle seat?</em></p>

      <h2>2. Seguridad</h2>
      <p>Algunas instrucciones habituales son <em>Empty your pockets</em>, <em>Take off your shoes</em> y <em>Remove liquids and laptops from your bag</em>. Si no entiendes, pregunta: <em>Could you repeat that, please?</em></p>

      <h2>3. Inmigración y aduanas</h2>
      <p>Inmigración revisa tu entrada; aduanas puede preguntar por los bienes que llevas. Responde con datos breves: <em>Tourism</em>, <em>Two weeks</em> y <em>I'm staying at the Central Hotel</em>. Lleva a mano la dirección y la reserva si pueden solicitarlas.</p>

      <h2>4. Puerta y anuncios</h2>
      <p><strong>Gate</strong> es la puerta; <strong>boarding</strong>, el embarque; <strong>delayed</strong>, retrasado; y <strong>last call</strong>, última llamada.</p>

      <h2>Ejercicio rápido</h2>
      <p>Responde a: <em>What is the purpose of your visit?</em> y <em>How long will you be staying?</em></p>
      <details><summary>Ver solución</summary><p><strong>Solución posible:</strong> <em>Tourism. I’ll be staying for two weeks.</em> Sustituye el destino y la duración por tus datos reales.</p></details>
    `,
  },
  {
    slug: 'como-escribir-email-formal-basico',
    title: 'Cómo escribir un email formal en inglés',
    description:
      'Una estructura clara para redactar correos profesionales con asunto, saludo, petición y despedida adecuados.',
    excerpt:
      'Ve al punto, usa una petición cortés y revisa que el lector sepa qué necesitas y cuándo.',
    thumbnailUrl: '/images/blog/botanical-office.webp',
    content: `
      <blockquote><strong>Usa una estructura de cinco partes:</strong> un asunto informativo, un saludo, el motivo del mensaje, la acción solicitada y una despedida.</blockquote>

      <ol>
        <li><strong>Asunto:</strong> <em>Question about invoice 123</em>.</li>
        <li><strong>Saludo:</strong> <em>Dear Ms. Jones</em> o <em>Dear Hiring Manager</em>.</li>
        <li><strong>Motivo:</strong> <em>I am writing to ask about...</em></li>
        <li><strong>Petición:</strong> <em>Could you please send me...?</em></li>
        <li><strong>Cierre:</strong> <em>Kind regards</em> y tu nombre.</li>
      </ol>

      <p>Ejemplo:</p>
      <blockquote>
        <p><strong>Subject:</strong> Question about the course schedule</p>
        <p>Dear Ms. Jones,</p>
        <p>I am writing to ask about the course schedule for May. Could you please send me the available dates? Thank you for your help.</p>
        <p>Kind regards,<br>María López</p>
      </blockquote>

      <p>Antes de enviar, comprueba el nombre, los adjuntos y la petición principal. Divide las frases largas y evita traducir literalmente expresiones coloquiales. La formalidad exacta depende de la relación y del país, así que observa el tono que usa la otra persona.</p>
      <p>Si necesitas una respuesta antes de una fecha, dilo con claridad: <em>Could you please reply by Friday?</em> Si adjuntas un archivo, nómbralo en el cuerpo: <em>I have attached the updated form.</em> Estas frases ayudan al lector a actuar.</p>

      <h2>Ejercicio rápido</h2>
      <p>Escribe un email para pedir una factura adjunta usando <em>I am writing to ask about...</em> y <em>Could you please...?</em></p>
      <details><summary>Ver solución</summary><p><strong>Solución posible:</strong> <em>Subject: Request for invoice 123. Dear Accounts Team, I am writing to ask about invoice 123. Could you please send me a copy? Kind regards, Ana Pérez.</em></p></details>
    `,
  },
  {
    slug: 'small-talk-romper-hielo',
    title: 'Small talk: frases para romper el hielo',
    description:
      'Una fórmula sencilla para iniciar conversaciones breves, hacer preguntas abiertas y despedirte con naturalidad.',
    excerpt:
      'Observa el contexto, pregunta algo fácil y escucha una respuesta antes de cambiar de tema.',
    thumbnailUrl: '/images/blog/botanical-office.webp',
    content: `
      <blockquote><strong>La fórmula es observar, preguntar y continuar:</strong> el <em>small talk</em> sirve para iniciar una relación o llenar unos minutos, no para mantener una conversación profunda.</blockquote>

      <h2>Temas y frases útiles</h2>
      <ul>
        <li><em>Beautiful day, isn't it?</em> — Bonito día, ¿verdad?</li>
        <li><em>Have you been here before?</em> — ¿Has estado aquí antes?</li>
        <li><em>How's your day going?</em> — ¿Cómo va tu día?</li>
        <li><em>Do you know the host?</em> — ¿Conoces al anfitrión?</li>
        <li><em>I like your shoes. Where did you get them?</em> — Me gustan tus zapatos. ¿Dónde los compraste?</li>
      </ul>

      <p>Un cumplido sobre un objeto o una actividad suele ser menos invasivo que un comentario sobre el cuerpo. Evita asumir que todas las personas o culturas prefieren los mismos temas. Si no conoces a la persona, deja para después asuntos como dinero, política o religión.</p>

      <p>Para cerrar, di <em>It was nice talking to you. I'm going to get a drink</em> o <em>I'll see you later</em>. Una despedida clara evita que tengas que inventar otra pregunta.</p>
      <p>Escucha la respuesta y formula una pregunta relacionada en lugar de preparar un monólogo. Si la persona dice que trabaja en una escuela, puedes preguntar <em>What do you teach?</em> Mantén la conversación breve y deja espacio para que la otra persona también participe.</p>

      <h2>Ejercicio rápido</h2>
      <p>Inicia una conversación en una fiesta usando el entorno, una pregunta y una salida.</p>
      <details><summary>Ver solución</summary><p><strong>Solución posible:</strong> <em>This place is busy. Do you know the host? It was nice talking to you. I'm going to get a drink.</em></p></details>
    `,
  },
]
