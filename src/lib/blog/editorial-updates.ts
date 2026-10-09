import { restoredBlogArticles } from './restored-articles'

export interface BlogEditorialUpdate {
  slug: string
  title: string
  description: string
  excerpt: string
  content: string
  thumbnailUrl: string
}

const answer = (text: string) =>
  `<blockquote><p><strong>Respuesta breve.</strong> ${text}</p></blockquote>`
const solution = (text: string) => `<details><summary>Ver solución</summary>${text}</details>`

export const blogEditorialUpdates: BlogEditorialUpdate[] = [
  ...restoredBlogArticles,
  {
    slug: 'como-dejar-de-traducir-mentalmente',
    title: 'Cómo dejar de traducir mentalmente',
    description:
      'Tres ejercicios para responder en inglés con menos traducción palabra por palabra.',
    excerpt:
      'Objetos, reformulación y frases completas: practica con ejemplos y comprueba tus respuestas.',
    thumbnailUrl: '/images/blog/study-room-v3.webp',
    content: `${answer('No necesitas prohibirte la traducción. La meta es recuperar expresiones conocidas con más facilidad, sin construir cada frase palabra por palabra desde el español.')}
      <p>Si al hablar te quedas buscando una palabra, puedes apoyarte en lo que ya sabes. Prueba estos tres ejercicios con situaciones de tu día.</p>
      <h2>1. Mira un objeto y construye una frase</h2>
      <p>Elige cinco objetos cercanos. Di su nombre en inglés y añade una frase corta: <em>window → The window is open.</em></p>
      <p><strong>Tu turno:</strong> hay una taza sobre el escritorio. Nómbrala y di dónde está.</p>
      ${solution('<p><em>Cup → The cup is on the desk.</em> También puedes decir <em>There is a cup on the desk.</em></p>')}
      <h2>2. Explica la palabra que falta</h2>
      <p>Si no recuerdas <em>umbrella</em>, di: <em>It's something you use when it rains.</em> Después consulta la palabra y úsala de nuevo.</p>
      <p><strong>Tu turno:</strong> describe un hervidor de agua sin usar <em>kettle</em>.</p>
      ${solution('<p>Una posibilidad: <em>You use it to boil water.</em> No hay una única respuesta: lo importante es que se entienda el objeto.</p>')}
      <h2>3. Practica frases que puedas reutilizar</h2>
      <p>Completa expresiones como <em>I need to...</em>, <em>Yesterday I...</em> y <em>Could you...?</em> con algo de tu vida. Practicar frases completas te da un punto de partida para hablar.</p>
      <p><strong>Tu turno:</strong> completa <em>Yesterday I...</em> con una actividad que hiciste ayer.</p>
      ${solution('<p><em>Yesterday I visited my sister.</em> Es solo un ejemplo: usa una actividad propia y un verbo en pasado.</p>')}
      <h2>¿Y si necesito traducir?</h2>
      <p>Hazlo para confirmar un significado o una diferencia de uso. Luego guarda la expresión con una frase. Observa si puedes recordar esa frase y reformular con menos pausas; no necesitas eliminar toda traducción para avanzar.</p>`,
  },
  {
    slug: 'last-name-surname-o-family-name-cual-es-la-diferencia-y-como-usarlos-correctamente',
    title: 'Last name, surname y family name',
    description:
      'Tres formas de decir «apellido» y un ejemplo para completar un formulario con dos apellidos.',
    excerpt: 'Qué escribir en given name y family name, con un formulario resuelto y una práctica.',
    thumbnailUrl: '/images/blog/writing.webp',
    content: `${answer('<em>Last name</em>, <em>surname</em> y <em>family name</em> pueden significar «apellido». No son tres partes diferentes de tu nombre.')}
      <h2>¿Cuándo se usa cada término?</h2>
      <div class="table-scroll"><table><thead><tr><th>Término</th><th>Uso habitual</th></tr></thead><tbody><tr><td>Last name</td><td>Frecuente en Estados Unidos.</td></tr><tr><td>Surname</td><td>Habitual en Reino Unido y en contextos formales.</td></tr><tr><td>Family name</td><td>Se refiere explícitamente al apellido familiar.</td></tr></tbody></table></div>
      <p>Son tendencias, no reglas exclusivas. La posición del apellido cambia entre culturas, pero eso no convierte <em>last name</em> en «nombre de pila».</p>
      <h2>Un formulario, dos apellidos</h2>
      <p>Si te llamas <strong>Ana María García López</strong> y el formulario solo distingue nombres y apellidos:</p>
      <div class="table-scroll"><table><thead><tr><th>Campo</th><th>Ejemplo</th></tr></thead><tbody><tr><td>Given name(s)</td><td>Ana María</td></tr><tr><td>Family name / Surname / Last name</td><td>García López</td></tr></tbody></table></div>
      <p><em>Middle name</em> se refiere a un nombre adicional, no a tu segundo apellido. Si el formulario tiene otras instrucciones o campos separados, síguelos.</p>
      <h2>Tu turno</h2><p>Completa estos campos para <strong>Luis Alberto Pérez Rojas</strong>: <em>Given name(s)</em> y <em>Surname</em>.</p>
      ${solution('<p><strong>Given name(s):</strong> Luis Alberto.<br><strong>Surname:</strong> Pérez Rojas.</p>')}
      <p>Para una reserva o trámite, comprueba las instrucciones de esa institución y cómo deben coincidir los datos con tu documento.</p>
      <p>Referencia: <a href="https://dictionary.cambridge.org/dictionary/english/surname">Cambridge Dictionary: surname</a>.</p>`,
  },
  {
    slug: 'ocupacion-o-profesion-descubre-la-diferencia-para-impulsar-tu-perfil-internacional',
    title: 'Occupation y profession: cómo usarlos',
    description:
      'Aprende a describir tu trabajo en inglés con ejemplos para una conversación o un formulario.',
    excerpt: 'Cómo responder «¿a qué te dedicas?» y cuándo usar occupation o profession.',
    thumbnailUrl: '/images/blog/botanical-office.webp',
    content: `${answer('<em>Occupation</em> suele referirse al trabajo de una persona. <em>Profession</em> suele describir un trabajo que requiere formación o habilidades especializadas. Sus usos se solapan.')}
      <h2>En un formulario</h2><p><em>Please state your occupation.</em> significa «Indica tu ocupación». Puedes responder <em>teacher</em>, <em>cashier</em> o el trabajo que corresponda. Si no estás trabajando, sigue las opciones e instrucciones del formulario.</p>
      <h2>En una conversación</h2><p><em>What do you do for a living?</em> — ¿A qué te dedicas?</p><p><em>I work as a cashier.</em> — Trabajo como cajero/a.</p><p><em>She is a doctor by profession.</em> — Es médica de profesión.</p>
      <p>Una profesión también es una ocupación. Estas palabras no establecen una jerarquía entre trabajos; tampoco significa que toda profesión requiera una licencia.</p>
      <h2>Tu turno</h2><ol><li><em>Please state your ___ on the form.</em></li><li><em>He is a lawyer by ___.</em></li><li>Responde <em>What do you do?</em> con tu trabajo o actividad actual.</li></ol>
      ${solution('<p>1. <em>Occupation</em>. 2. <em>Profession</em>. 3. Por ejemplo: <em>I work as a designer.</em> o <em>I am a student.</em></p>')}
      <p>Referencia: <a href="https://dictionary.cambridge.org/dictionary/english/profession">Cambridge Dictionary: profession</a>.</p>`,
  },
  {
    slug: 'one-five-four-o-one-fifty-four-el-secreto-para-dictar-numeros-en-ingles-como-un-nativo-1',
    title: 'Cómo dictar números en inglés',
    description:
      'Teléfonos, códigos, años y direcciones: elige una lectura clara según el contexto.',
    excerpt: 'Para un código, di cada dígito. Para un año, puedes agrupar. Practica ambas formas.',
    thumbnailUrl: '/images/blog/listening-lounge.webp',
    content: `${answer('Para teléfonos y códigos, decir cada dígito suele ser lo más claro. Los años y algunas direcciones admiten otras agrupaciones. No existe una única lectura obligatoria para todos los contextos.')}
      <h2>Teléfonos y códigos</h2><p><strong>154</strong>, como código: <em>one five four</em>. Como cantidad: <em>one hundred and fifty-four</em> (también se omite <em>and</em>, especialmente en inglés estadounidense).</p>
      <p><strong>079 408 6612</strong>: <em>zero seven nine, four zero eight, six six one two</em>. En teléfonos también se oye <em>oh</em> para el cero. Haz pausas y pide que te repitan el número.</p>
      <h2>Años y direcciones</h2><ul><li><strong>1908:</strong> <em>nineteen oh eight</em>.</li><li><strong>2003:</strong> <em>two thousand and three</em> o <em>two thousand three</em>.</li><li><strong>2012:</strong> <em>twenty twelve</em> o <em>two thousand and twelve</em>.</li></ul>
      <p>Una dirección como <em>1210 Main Street</em> puede decirse <em>twelve ten Main Street</em>. Si necesitas precisión, repite los dígitos: <em>one two one zero</em>.</p>
      <h2>Tu turno</h2><ol><li>Dicta el PIN <strong>5207</strong>.</li><li>Lee el año <strong>1998</strong>.</li><li>Pide que repitan un número.</li></ol>
      ${solution('<p>1. <em>Five two zero seven.</em> 2. <em>Nineteen ninety-eight.</em> 3. <em>Could you repeat the number, please?</em></p>')}
      <p>Referencia: <a href="https://dictionary.cambridge.org/grammar/british-grammar/dates">Cambridge Grammar: dates</a>.</p>`,
  },
  {
    slug: 'dime-de-donde-eres-y-te-dire-tu-terminacion-guia-definitiva-de-las-nacionalidades-en-ingles',
    title: 'Nacionalidades en inglés: patrones y excepciones',
    description: 'Aprende formas frecuentes y cómo usarlas para decir de dónde eres.',
    excerpt:
      'Canadian, Japanese, Spanish y otras nacionalidades: ejemplos, excepciones y práctica.',
    thumbnailUrl: '/images/blog/airport-lounge.webp',
    content: `${answer('Los sufijos ayudan a recordar nacionalidades, pero no son una fórmula universal. Aprende cada país junto con su nacionalidad y escribe ambos con mayúscula.')}
      <h2>Patrones que ayudan</h2><div class="table-scroll"><table><thead><tr><th>Terminación</th><th>Ejemplos</th></tr></thead><tbody><tr><td>-an / -ian</td><td>Canada → Canadian; Brazil → Brazilian; Mexico → Mexican</td></tr><tr><td>-ese</td><td>China → Chinese; Japan → Japanese; Portugal → Portuguese</td></tr><tr><td>-ish</td><td>Spain → Spanish; Sweden → Swedish; Turkey → Turkish</td></tr><tr><td>-i</td><td>Iraq → Iraqi; Pakistan → Pakistani; Israel → Israeli</td></tr></tbody></table></div>
      <h2>Excepciones frecuentes</h2><p>France → <strong>French</strong>; Greece → <strong>Greek</strong>; the Netherlands → <strong>Dutch</strong>; Switzerland → <strong>Swiss</strong>; Thailand → <strong>Thai</strong>.</p>
      <h2>Así se usan en una frase</h2><p><em>I am from Mexico. I am Mexican.</em><br><em>She is from Japan. She is Japanese.</em></p><p>El adjetivo y el nombre de una persona no siempre funcionan igual: di <em>He is Spanish</em> o <em>He is a Spanish person</em>, sin añadir <em>a</em> delante del adjetivo solo.</p>
      <p>Para Estados Unidos, usa <em>the United States</em> o <em>the US</em>; la nacionalidad habitual es <em>American</em>.</p>
      <h2>Tu turno</h2><ol><li>Japan, Brazil y Sweden: escribe sus nacionalidades.</li><li>Corrige: <em>i am mexican. she speaks english.</em></li><li>Corrige: <em>He is a Spanish.</em></li></ol>
      ${solution('<p>1. <em>Japanese, Brazilian, Swedish.</em> 2. <em>I am Mexican. She speaks English.</em> 3. <em>He is Spanish</em> o <em>He is a Spanish person.</em></p>')}`,
  },
]
