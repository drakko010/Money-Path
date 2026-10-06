/**
 * Academia (Etapa 19) — catálogo base de contenido educativo.
 *
 * Estructura dirigida por datos (regla 13): este archivo solo describe el
 * catálogo inicial; la aplicación **lee siempre de la base de datos**
 * (`academy_categories` / `academy_contents`) y el catálogo se siembra de
 * forma idempotente por slug (`ensureAcademySeed` en `src/lib/academy.ts`).
 *
 * Reglas editoriales de esta etapa (decisión 37):
 * - Contenido **introductorio y general**: conceptos, hábitos y ejercicios.
 * - **Sin recomendaciones financieras complejas**, sin instrumentos
 *   concretos, sin cifras de rendimiento y sin consejos personalizados.
 * - Todo entra como `reviewStatus: "pending"`: la UI muestra que es
 *   contenido base con revisión editorial pendiente.
 *
 * El cuerpo usa un Markdown simplificado: `## Título`, listas con `- `,
 * notas con `> ` y énfasis con `**texto**`.
 */

import type {
  AcademyIconKey,
  AcademyKind,
  AcademyLevel,
  AcademyReviewStatus,
} from "@/lib/academy-shared";

export interface AcademyCategoryDef {
  slug: string;
  name: string;
  description: string;
  icon: AcademyIconKey;
  sortOrder: number;
}

export interface AcademyContentDef {
  slug: string;
  categorySlug: string;
  kind: AcademyKind;
  level: AcademyLevel;
  title: string;
  summary: string;
  body: string;
  durationMinutes: number;
  sortOrder: number;
  isFeatured?: boolean;
  reviewStatus: AcademyReviewStatus;
  sources: string | null;
}

/** Las 8 categorías de la Academia. */
export const ACADEMY_CATEGORIES: AcademyCategoryDef[] = [
  {
    slug: "finanzas-personales",
    name: "Finanzas personales",
    description: "El panorama completo: qué tienes, qué debes y hacia dónde vas.",
    icon: "wallet",
    sortOrder: 1,
  },
  {
    slug: "presupuesto",
    name: "Presupuesto",
    description: "Organiza tus ingresos y gastos para que el mes te alcance.",
    icon: "chart",
    sortOrder: 2,
  },
  {
    slug: "deudas",
    name: "Deudas",
    description: "Entiende tus deudas y cómo ordenarlas para salir de ellas.",
    icon: "credit-card",
    sortOrder: 3,
  },
  {
    slug: "ahorro",
    name: "Ahorro",
    description: "Convierte el ahorro en una decisión, no en lo que sobra.",
    icon: "target",
    sortOrder: 4,
  },
  {
    slug: "fondo-de-emergencia",
    name: "Fondo de emergencia",
    description: "Tu colchón para imprevistos: cuánto y cómo construirlo.",
    icon: "shield",
    sortOrder: 5,
  },
  {
    slug: "inversiones",
    name: "Inversiones",
    description: "Las bases conceptuales antes de pensar en invertir.",
    icon: "trending-up",
    sortOrder: 6,
  },
  {
    slug: "patrimonio",
    name: "Patrimonio",
    description: "Activos, pasivos y la foto completa de tu riqueza.",
    icon: "landmark",
    sortOrder: 7,
  },
  {
    slug: "habitos-financieros",
    name: "Hábitos financieros",
    description: "Rutinas simples que sostienen todo lo demás.",
    icon: "refresh",
    sortOrder: 8,
  },
];

/**
 * Catálogo base: 4 piezas por categoría — una guía, un artículo, un aula y un
 * contenido corto (los cuatro tipos pedidos por el producto).
 */
export const ACADEMY_CONTENTS: AcademyContentDef[] = [
  /* ── Finanzas personales ─────────────────────────────────────────── */
  {
    slug: "guia-tu-punto-de-partida-financiero",
    categorySlug: "finanzas-personales",
    kind: "guide",
    level: "intermediate",
    title: "Guía: tu punto de partida financiero",
    summary: "Cuatro pasos para saber exactamente dónde estás hoy, sin juzgarte.",
    durationMinutes: 12,
    sortOrder: 1,
    isFeatured: true,
    reviewStatus: "pending",
    sources: null,
    body: `## ¿Para qué sirve esta guía?
Antes de decidir cualquier cosa con tu dinero, necesitas una foto clara de tu situación. No para juzgarte, sino para saber desde dónde partes.

## Paso 1. Reúne tu información
- Cuánto entra al mes (y con qué frecuencia).
- Cuánto gastas en lo esencial: vivienda, comida, transporte, servicios, salud.
- Cuánto debes y a qué tipo de deuda.
- Cuánto tienes ahorrado e invertido.

## Paso 2. Calcula tu balance
Resta tus gastos de tus ingresos. Si el resultado es positivo, ese es tu margen para ahorrar o pagar deudas. Si es negativo, la primera tarea es entender por qué.

## Paso 3. Nombra tu prioridad
Con la foto completa, elige **una** prioridad para los próximos meses: dejar de gastar de más, ordenar deudas, crear tu reserva o empezar a ahorrar.

## Paso 4. Fija un siguiente paso concreto
Una acción pequeña que puedas cumplir esta semana vale más que un plan perfecto.

> Practica: anota los cuatro pasos en una nota y revísala una vez al mes. Con el tiempo tendrás tu propia serie histórica.`,
  },
  {
    slug: "articulo-que-son-las-finanzas-personales",
    categorySlug: "finanzas-personales",
    kind: "article",
    level: "beginner",
    title: "¿Qué son las finanzas personales?",
    summary: "La disciplina de tomar decisiones con el dinero que es tuyo.",
    durationMinutes: 6,
    sortOrder: 2,
    reviewStatus: "pending",
    sources: null,
    body: `## La idea central
Las finanzas personales son el conjunto de decisiones que tomas con tu dinero: cuánto entra, cuánto sale, cuánto guardas y para qué lo usas.

## No se trata de ganar más y ya
Un ingreso alto no garantiza tranquilidad. Lo que cambia tu situación es la relación entre lo que entra, lo que sale y lo que decides conservar.

## Tres preguntas que ordenan todo
- ¿De dónde viene mi dinero y cuánto es?
- ¿A dónde se va cada mes?
- ¿Qué quiero que pase con lo que sobra?

## Qué hace que esto funcione
Constancia, no perfección. Registrar y revisar con regularidad importa más que tener el plan más elaborado.

> Practica: responde las tres preguntas por escrito. Es tu punto de partida.`,
  },
  {
    slug: "aula-organiza-tu-informacion-financiera",
    categorySlug: "finanzas-personales",
    kind: "lesson",
    level: "intermediate",
    title: "Aula: organiza tu información financiera",
    summary: "Ejercicio guiado para dejar tus datos en un solo lugar.",
    durationMinutes: 15,
    sortOrder: 3,
    reviewStatus: "pending",
    sources: null,
    body: `## Objetivo de la clase
Terminar con tu información financiera básica ordenada en un solo lugar y lista para revisarla una vez al mes.

## Antes de empezar
- Ten a la mano tus últimos recibos o registros.
- Reserva 20 minutos sin interrupciones.

## Desarrollo
1. **Entradas de dinero.** Anota cada fuente y su frecuencia.
2. **Gastos esenciales.** Agrupa: vivienda, comida, transporte, servicios, salud.
3. **Gastos variables.** Lo que cambia cada mes: entretenimiento, compras.
4. **Deudas.** Saldo, pago del mes y tipo de deuda.
5. **Ahorro e inversión.** Lo que ya tienes acumulado.

## Cierre
Suma cada bloque. Con esos cinco números ya tienes tu panorama.

> Nota: no necesitas cifras exactas al centavo en el primer intento. Aproximar y corregir es parte del ejercicio.`,
  },
  {
    slug: "corto-gasta-menos-de-lo-que-ganas",
    categorySlug: "finanzas-personales",
    kind: "short",
    level: "beginner",
    title: "La regla más simple: gasta menos de lo que ganas",
    summary: "Treinta segundos sobre la base de cualquier plan financiero.",
    durationMinutes: 3,
    sortOrder: 4,
    reviewStatus: "pending",
    sources: null,
    body: `Si gastas menos de lo que ganas, tienes margen. Si gastas más, tienes una deuda creciendo aunque no la veas.

- Margen positivo → puedes ahorrar, invertir o adelantar deudas.
- Margen cero → cualquier imprevisto se convierte en deuda.
- Margen negativo → primero hay que entender y ajustar.

> Practica: compara lo que entra y lo que sale este mes. Ese único número te dice en qué posición estás.`,
  },

  /* ── Presupuesto ─────────────────────────────────────────────────── */
  {
    slug: "guia-arma-tu-primer-presupuesto",
    categorySlug: "presupuesto",
    kind: "guide",
    level: "intermediate",
    title: "Guía: arma tu primer presupuesto mensual",
    summary: "Un presupuesto realista en cinco pasos, sin fórmulas complicadas.",
    durationMinutes: 12,
    sortOrder: 1,
    isFeatured: true,
    reviewStatus: "pending",
    sources: null,
    body: `## Paso 1. Empieza por lo esencial
Vivienda, comida, transporte, servicios y salud primero. Es lo que sostiene tu mes.

## Paso 2. Suma tus ingresos reales
Usa lo que realmente recibes, con la frecuencia con la que lo recibes. No supongas ingresos que aún no llegan.

## Paso 3. Asigna el resto por prioridades
Después de lo esencial y tus deudas, asigna a ahorro y a lo variable. Si no hay suficiente para todo, la decisión es recortar o reprogramar, no endeudarte.

## Paso 4. Deja un margen para imprevistos
Un presupuesto sin margen se rompe con cualquier gasto inesperado.

## Paso 5. Revísalo cada semana
Cinco minutos a la semana bastan. Compara lo planeado con lo real y ajusta.

> Practica: escribe tu presupuesto del próximo mes con tres bloques: esencial, deudas y ahorro/variable.`,
  },
  {
    slug: "articulo-que-es-un-presupuesto",
    categorySlug: "presupuesto",
    kind: "article",
    level: "beginner",
    title: "¿Qué es un presupuesto (y qué no es)?",
    summary: "Una herramienta de decisión, no una lista de restricciones.",
    durationMinutes: 6,
    sortOrder: 2,
    reviewStatus: "pending",
    sources: null,
    body: `## Qué es
Un presupuesto es un plan escrito de cómo vas a usar el dinero que esperas recibir en un período. Te dice qué está decidido **antes** de gastarlo.

## Qué no es
- No es un castigo ni una lista de prohibiciones.
- No es una foto exacta del futuro: es un plan que se ajusta.
- No sirve si lo escribes una vez al año y nunca lo revisas.

## Los tres bloques que siempre aparecen
- **Esencial:** lo que sostiene tu vida diaria.
- **Compromisos:** deudas y pagos fijos.
- **Flexible:** ahorro, gusto y todo lo que se puede mover.

## Señal de que está funcionando
Sabes a qué asignaste tu dinero y ajustas sin culpa cuando algo cambia.

> Practica: revisa tus últimos dos meses y separa cada gasto en los tres bloques.`,
  },
  {
    slug: "aula-tu-primer-mes-de-presupuesto",
    categorySlug: "presupuesto",
    kind: "lesson",
    level: "intermediate",
    title: "Aula: tu primer mes con presupuesto",
    summary: "Clase práctica para planear, registrar y comparar un mes completo.",
    durationMinutes: 15,
    sortOrder: 3,
    reviewStatus: "pending",
    sources: null,
    body: `## Objetivo
Vivir un mes con presupuesto y comparar, al final, lo planeado contra lo real.

## Preparación
- Ingresos esperados del mes.
- Gastos esenciales de los últimos meses.
- Compromisos de deuda del mes.

## Desarrollo
1. Asigna un monto a cada bloque antes de que empiece el mes.
2. Registra los gastos conforme ocurren (o al menos dos veces por semana).
3. A mitad de mes, revisa si vas dentro de lo planeado.
4. Al cerrar el mes, compara planeado contra real, categoría por categoría.

## Qué aprenderás
La diferencia entre lo que creías gastar y lo que realmente gastas. Ahí están casi siempre los ajustes más útiles.

> Nota: si un bloque se desvía mucho, no lo consideres un fracaso; es información para el próximo mes.`,
  },
  {
    slug: "corto-senales-de-presupuesto-desajustado",
    categorySlug: "presupuesto",
    kind: "short",
    level: "beginner",
    title: "Tres señales de que tu presupuesto necesita ajuste",
    summary: "Un repaso rápido de alertas comunes.",
    durationMinutes: 3,
    sortOrder: 4,
    reviewStatus: "pending",
    sources: null,
    body: `- Terminas el mes sin saber en qué se fue el dinero.
- Pagas lo variable antes que lo esencial.
- Usas crédito para cubrir gastos del día a día.

Si te reconoces en alguna, el siguiente paso no es un plan nuevo: es revisar tus últimos registros y reasignar.

> Practica: elige una de las tres señales y escribe una acción concreta para las próximas dos semanas.`,
  },

  /* ── Deudas ──────────────────────────────────────────────────────── */
  {
    slug: "guia-ordena-tus-deudas",
    categorySlug: "deudas",
    kind: "guide",
    level: "intermediate",
    title: "Guía: ordena tus deudas del inventario al plan",
    summary: "Primero entender, después decidir el orden de pago.",
    durationMinutes: 12,
    sortOrder: 1,
    isFeatured: true,
    reviewStatus: "pending",
    sources: null,
    body: `## Paso 1. Haz el inventario
Lista cada deuda con: quién es el acreedor, saldo actual, pago del mes, tasa y fecha de vencimiento.

## Paso 2. Calcula el peso real
Suma los pagos mínimos del mes. Compáralos con tu ingreso. Ese porcentaje te dice cuánta libertad te queda.

## Paso 3. Asegura los mínimos
Pagar al menos el mínimo de cada deuda evita cargos por atraso y protege tu historial.

## Paso 4. Decide el orden de lo extra
Solo dos criterios razonables para elegir el orden:
- **Priorizar la más cara:** atacar primero la de mayor tasa.
- **Priorizar la más pequeña:** liquidarla pronto para liberar ese pago.

Ambos funcionan. La diferencia es cuánto pagas de intereses y cuánta motivación necesitas.

## Paso 5. Evita nuevas deudas mientras pagas
Cada nueva deuda reinicia el ciclo.

> Practica: llena el inventario completo antes de decidir cualquier estrategia.`,
  },
  {
    slug: "articulo-entiende-tu-deuda",
    categorySlug: "deudas",
    kind: "article",
    level: "beginner",
    title: "Entiende tu deuda: saldo, tasa y plazo",
    summary: "Las tres piezas que explican cuánto te cuesta realmente una deuda.",
    durationMinutes: 6,
    sortOrder: 2,
    reviewStatus: "pending",
    sources: null,
    body: `## Saldo
Lo que aún debes hoy. Es la cifra que importa para saber cuánto falta, no el monto original.

## Tasa
El costo de mantener ese saldo en el tiempo. Dos deudas con el mismo saldo pueden costarte muy distinto según su tasa.

## Plazo
Cuánto tiempo más vas a estar pagando. Un plazo largo baja el pago del mes, pero suele significar más costo total.

## Cómo se combinan
Pago cómodo + plazo largo + tasa alta = la combinación más costosa. Si puedes elegir, adelantar pagos en la deuda de mayor tasa suele ahorrarte más.

> Practica: para cada deuda, escribe las tres piezas en una línea. Con eso ya puedes compararlas.`,
  },
  {
    slug: "aula-inventario-de-deudas",
    categorySlug: "deudas",
    kind: "lesson",
    level: "intermediate",
    title: "Aula: construye tu inventario de deudas",
    summary: "Ejercicio paso a paso con tus propios datos.",
    durationMinutes: 15,
    sortOrder: 3,
    reviewStatus: "pending",
    sources: null,
    body: `## Objetivo
Terminar con una tabla simple de todas tus deudas, lista para decidir el orden de pago.

## Formato sugerido
Una fila por deuda con cinco columnas: acreedor, saldo actual, tasa, pago mínimo y fecha de corte.

## Desarrollo
1. Incluye **todas** las deudas que recuerdes, incluso las que pagas "de vez en cuando".
2. Verifica los saldos con tu último estado de cuenta.
3. Marca las que tienen mayor tasa: son las que más te cuestan.
4. Suma los pagos mínimos del mes.
5. Anota cuánto podrías destinar extra a deudas este mes.

## Cierre
Con el inventario completo puedes comparar estrategias sin adivinar.

> Nota: si una deuda no tiene tasa clara, pide esa información al acreedor antes de decidir el orden.`,
  },
  {
    slug: "corto-pago-minimo-vs-pago-extra",
    categorySlug: "deudas",
    kind: "short",
    level: "beginner",
    title: "Pago mínimo vs. pago extra",
    summary: "Por qué solo pagar el mínimo prolonga la deuda.",
    durationMinutes: 3,
    sortOrder: 4,
    reviewStatus: "pending",
    sources: null,
    body: `El pago mínimo mantiene la deuda viva. Una parte se va a intereses y el saldo baja poco a poco.

Un pago extra, aunque sea pequeño:
- reduce el saldo más rápido,
- reduce los intereses del siguiente período,
- acorta el plazo total.

> Practica: define una cantidad fija extra para la deuda que elijas y prográmala el mismo día que tu pago mínimo.`,
  },

  /* ── Ahorro ──────────────────────────────────────────────────────── */
  {
    slug: "guia-empieza-a-ahorrar",
    categorySlug: "ahorro",
    kind: "guide",
    level: "intermediate",
    title: "Guía: empieza a ahorrar aunque sientas que no te alcanza",
    summary: "Cómo construir el hábito con montos pequeños y constantes.",
    durationMinutes: 12,
    sortOrder: 1,
    isFeatured: true,
    reviewStatus: "pending",
    sources: null,
    body: `## Empieza pequeño, empieza hoy
El primer objetivo no es un monto grande: es demostrarte que puedes apartar algo cada semana o cada mes.

## Paso 1. Define cuánto puedes apartar
Un monto que no te desajuste el mes. Si te obliga a endeudarte, era demasiado.

## Paso 2. Decide cuándo lo apartas
El mejor momento es justo después de recibir tu ingreso, antes de gastar.

## Paso 3. Sepáralo del dinero de gastos
Una cuenta o un sobre distinto evita la tentación de usarlo sin darte cuenta.

## Paso 4. Súbelo cuando puedas
Si un mes te sobra algo más, súmalo. Los aumentos graduales sostienen el hábito.

## Paso 5. Revísalo mensualmente
Anota cuánto llevas acumulado. Ver el crecimiento es lo que mantiene el hábito vivo.

> Practica: define hoy el monto y el día en que apartarás tu ahorro.`,
  },
  {
    slug: "articulo-ahorrar-es-una-decision",
    categorySlug: "ahorro",
    kind: "article",
    level: "beginner",
    title: "Ahorrar no es lo que sobra: es una decisión",
    summary: "El cambio de mentalidad que hace posible el ahorro.",
    durationMinutes: 6,
    sortOrder: 2,
    reviewStatus: "pending",
    sources: null,
    body: `## El orden importa
Si esperas a ver "qué sobra" al final del mes, casi nunca sobra nada. Cuando apartas primero y gastas con lo que queda, el ahorro sí ocurre.

## Ahorrar es pagarte primero
Antes que cualquier gasto flexible, tu ahorro es una asignación con propósito.

## Ahorro ≠ invertir
Ahorrar es conservar dinero disponible y estable para tus planes. Invertir es otra etapa, con otros riesgos y otro horizonte.

## Para qué sirve tener un propósito
Ahorrar "por si acaso" se abandona fácil. Ahorrar para algo concreto (una reserva, un viaje, una meta) se sostiene.

> Practica: escribe el propósito de tu ahorro en una frase y el monto que apartarás este mes.`,
  },
  {
    slug: "aula-tu-primera-meta-de-ahorro",
    categorySlug: "ahorro",
    kind: "lesson",
    level: "intermediate",
    title: "Aula: define tu primera meta de ahorro",
    summary: "Convierte un deseo en un plan con monto y plazo.",
    durationMinutes: 15,
    sortOrder: 3,
    reviewStatus: "pending",
    sources: null,
    body: `## Objetivo
Salir de esta clase con una meta de ahorro concreta: monto, plazo y aportación.

## Desarrollo
1. **Elige una sola meta.** Varias metas a la vez reparten tu esfuerzo.
2. **Define el monto total.** ¿Cuánto necesitas para cumplirla?
3. **Define la fecha.** Sin plazo, la meta se vuelve intención.
4. **Divide.** Monto total ÷ meses restantes = aportación mensual.
5. **Verifica que sea realista.** Si la aportación no cabe en tu mes, alarga el plazo o baja el monto.

## Ejemplo simple
Faltan 12,000 y tienes 12 meses → 1,000 al mes. Si 1,000 no cabe, 24 meses → 500 al mes.

## Cierre
Anota la meta y revísala cada mes. Ajustar el plazo es válido; abandonarla no es necesario.

> Nota: usa montos aproximados al inicio. La meta se afina con los meses.`,
  },
  {
    slug: "corto-automatiza-tu-ahorro",
    categorySlug: "ahorro",
    kind: "short",
    level: "beginner",
    title: "Automatiza tu ahorro",
    summary: "Menos decisiones, más constancia.",
    durationMinutes: 3,
    sortOrder: 4,
    reviewStatus: "pending",
    sources: null,
    body: `Cada decisión de ahorrar gasta voluntad. Automatizarla la convierte en algo que ocurre sin que tengas que pensarlo.

- Programa la transferencia el mismo día que recibes tu ingreso.
- Mantén el ahorro en un espacio distinto al del gasto diario.
- Revisa cada mes que el monto siga siendo adecuado.

> Practica: agenda una transferencia recurrente pequeña esta semana.`,
  },

  /* ── Fondo de emergencia ─────────────────────────────────────────── */
  {
    slug: "guia-construye-tu-fondo-de-emergencia",
    categorySlug: "fondo-de-emergencia",
    kind: "guide",
    level: "intermediate",
    title: "Guía: construye tu fondo de emergencia paso a paso",
    summary: "Cuánto necesitas, dónde ponerlo y cómo llegar sin romper tu presupuesto.",
    durationMinutes: 12,
    sortOrder: 1,
    isFeatured: true,
    reviewStatus: "pending",
    sources: null,
    body: `## Qué es una emergencia
Un gasto necesario, urgente e imprevisto: salud, reparación indispensable, pérdida temporal de ingreso. Un plan de vacaciones no es una emergencia.

## Paso 1. Calcula tu gasto esencial mensual
Suma lo que necesitas para vivir un mes: vivienda, comida, transporte, servicios y salud.

## Paso 2. Elige cuántos meses quieres cubrir
Empezar con un mes ya cambia tu situación frente a cualquier imprevisto. Después puedes ampliar el objetivo.

## Paso 3. Define tu meta
Gasto esencial mensual × meses elegidos = tu meta.

## Paso 4. Aporta de forma constante
Un aporte pequeño y recurrente avanza más que uno grande y aislado.

## Paso 5. Mantén el fondo disponible
Este dinero está para emergencias: debe ser fácil de usar y su valor no debe fluctuar.

> Practica: calcula tu gasto esencial y elige tu primer objetivo de meses.`,
  },
  {
    slug: "articulo-que-es-el-fondo-de-emergencia",
    categorySlug: "fondo-de-emergencia",
    kind: "article",
    level: "beginner",
    title: "¿Qué es un fondo de emergencia?",
    summary: "El colchón que evita que un imprevisto se vuelva deuda.",
    durationMinutes: 6,
    sortOrder: 2,
    reviewStatus: "pending",
    sources: null,
    body: `## Definición
Es dinero reservado exclusivamente para cubrir imprevistos necesarios, sin tener que endeudarte ni tocar tus metas.

## Para qué sirve de verdad
No es para ganar rendimiento: es para darte **tranquilidad** y evitar decisiones costosas bajo presión.

## Qué no cuenta como fondo de emergencia
- Dinero invertido con riesgo o plazo forzoso.
- El ahorro destinado a metas concretas.
- El cupo disponible de una tarjeta de crédito.

## Cuánto se necesita
Depende de tus gastos esenciales y de la estabilidad de tus ingresos. Cada caso es distinto; lo importante es empezar.

> Practica: abre un espacio separado solo para este fondo, aunque empieces con poco.`,
  },
  {
    slug: "aula-calcula-tu-meta-de-emergencia",
    categorySlug: "fondo-de-emergencia",
    kind: "lesson",
    level: "intermediate",
    title: "Aula: calcula tu meta de emergencia",
    summary: "De tus gastos esenciales a una meta en pesos y meses.",
    durationMinutes: 15,
    sortOrder: 3,
    reviewStatus: "pending",
    sources: null,
    body: `## Objetivo
Determinar tu gasto esencial mensual y tu primera meta de fondo de emergencia.

## Desarrollo
1. **Lista tus gastos esenciales** del último mes: vivienda, comida, transporte, servicios, salud.
2. **Excluye lo discrecional:** entretenimiento, compras no necesarias, suscripciones que podrías pausar.
3. **Suma y divide:** si la cifra varía mes a mes, usa el promedio de los últimos meses.
4. **Elige tus meses objetivo.** Un objetivo inicial puede ser pequeño; se amplía después.
5. **Calcula la meta:** gasto esencial × meses.

## Cierre
Compara tu meta con el ahorro actual destinado a emergencias y anota la diferencia: eso es lo que falta acumular.

> Nota: si tu ingreso es irregular, considera un objetivo mayor conforme avances.`,
  },
  {
    slug: "corto-fondo-vs-ahorro-para-metas",
    categorySlug: "fondo-de-emergencia",
    kind: "short",
    level: "beginner",
    title: "Fondo de emergencia vs. ahorro para metas",
    summary: "Dos botes distintos con dos propósitos distintos.",
    durationMinutes: 3,
    sortOrder: 4,
    reviewStatus: "pending",
    sources: null,
    body: `- **Fondo de emergencia:** imprevistos necesarios. Disponible siempre, sin riesgo.
- **Ahorro para metas:** planes que ya conoces (viaje, enganche, equipo).

Mezclarlos tiene un costo: usas el fondo para una meta y vuelves a quedar sin protección ante imprevistos.

> Practica: revisa si hoy tienes todo en un solo lugar y sepáralos en dos.`,
  },

  /* ── Inversiones ─────────────────────────────────────────────────── */
  {
    slug: "guia-antes-de-invertir",
    categorySlug: "inversiones",
    kind: "guide",
    level: "intermediate",
    title: "Guía: antes de invertir, prepara tus bases",
    summary: "El orden correcto: primero ordenar, después invertir.",
    durationMinutes: 12,
    sortOrder: 1,
    isFeatured: true,
    reviewStatus: "pending",
    sources: null,
    body: `## 1. Presupuesto en orden
Invertir sin control de gastos suele terminar en retiros anticipados y pérdidas por prisa.

## 2. Deudas caras bajo control
Cubrir los mínimos y atacar lo más caro suele tener más impacto que buscar rendimientos.

## 3. Reserva para imprevistos
Sin fondo de emergencia, cualquier imprevisto te obliga a vender justo cuando no conviene.

## 4. Objetivo claro y horizonte de tiempo
Define para qué inviertes y en cuánto tiempo necesitarás el dinero. El horizonte define cuánta volatilidad puedes tolerar.

## 5. Entiende lo que eliges
Antes de poner dinero, entiende cómo funciona el instrumento, cuál es su riesgo y qué costo tiene.

## 6. Empieza simple y constante
Aportaciones periódicas y comprensibles suelen sostenerse mejor que movimientos impulsivos.

> Nota: esta guía es conceptual. No incluye recomendaciones de instrumentos ni proyecciones de rendimiento.`,
  },
  {
    slug: "articulo-invertir-que-es-y-que-no-es",
    categorySlug: "inversiones",
    kind: "article",
    level: "beginner",
    title: "Invertir: qué es (y qué no es)",
    summary: "La diferencia entre invertir, ahorrar y apostar.",
    durationMinutes: 6,
    sortOrder: 2,
    reviewStatus: "pending",
    sources: null,
    body: `## Qué es invertir
Poner dinero a trabajar a cambio de asumir un riesgo, con un horizonte de tiempo definido y un objetivo claro.

## Qué no es
- **No es ahorro:** el ahorro busca estabilidad y disponibilidad; invertir acepta variaciones.
- **No es apuesta:** apostar busca suerte a corto plazo; invertir busca un proceso a largo plazo.
- **No es garantía:** todo instrumento con rendimiento potencial tiene también riesgo.

## Las tres preguntas antes de invertir
- ¿Para qué y en cuánto tiempo necesito este dinero?
- ¿Cuánta variación puedo tolerar sin cambiar de decisión?
- ¿Entiendo cómo funciona y cuánto me cuesta?

## Lo que sí está en tu control
Cuánto aportas, con qué constancia, cuánto pagas de comisiones y qué tan bien entiendes lo que tienes.

> Practica: responde las tres preguntas antes de asignar cualquier monto.`,
  },
  {
    slug: "aula-riesgo-plazo-y-horizonte",
    categorySlug: "inversiones",
    kind: "lesson",
    level: "intermediate",
    title: "Aula: riesgo, plazo y horizonte",
    summary: "Tres conceptos en palabras simples, con tu caso como ejemplo.",
    durationMinutes: 15,
    sortOrder: 3,
    reviewStatus: "pending",
    sources: null,
    body: `## Objetivo
Entender tres conceptos básicos y cómo se relacionan con tus decisiones.

## Riesgo
Es la posibilidad de que el valor de lo que tienes suba o baje. No es bueno ni malo por sí mismo: es algo que se administra según tu situación.

## Plazo
Es cuánto tiempo puedes mantener tu dinero sin necesitarlo. Es el factor más importante para tolerar variaciones.

## Horizonte
Es el tiempo que le das a un objetivo. Un horizonte corto pide estabilidad; uno largo permite asumir más variación.

## Ejercicio
1. Escribe tu objetivo y en cuánto tiempo lo necesitas.
2. Marca si podrías esperar sin usar ese dinero en una caída temporal.
3. Anota si entiendes el instrumento que estás considerando.

## Cierre
Si alguna respuesta es "no sé", todavía no es momento de asignar dinero: primero investiga.

> Nota: clase conceptual. No es asesoría ni recomendación de inversión.`,
  },
  {
    slug: "corto-diversificar-en-una-frase",
    categorySlug: "inversiones",
    kind: "short",
    level: "beginner",
    title: "Diversificar en una frase",
    summary: "Por qué no concentrar todo en un solo lugar.",
    durationMinutes: 3,
    sortOrder: 4,
    reviewStatus: "pending",
    sources: null,
    body: `Diversificar es no depender de un solo resultado: si algo sale mal en un lugar, el efecto total no te saca de tu plan.

Es un principio general de manejo de riesgo, aplicable más allá de las inversiones: también a tus ingresos y a tu ahorro.

> Practica: revisa si hoy todo tu dinero depende de una sola fuente.`,
  },

  /* ── Patrimonio ──────────────────────────────────────────────────── */
  {
    slug: "guia-mide-tu-patrimonio",
    categorySlug: "patrimonio",
    kind: "guide",
    level: "intermediate",
    title: "Guía: deja de medir solo tu ingreso y mide tu patrimonio",
    summary: "Cómo construir tu estado de patrimonio y seguirlo mes a mes.",
    durationMinutes: 12,
    sortOrder: 1,
    isFeatured: true,
    reviewStatus: "pending",
    sources: null,
    body: `## Por qué el ingreso no basta
Dos personas con el mismo sueldo pueden tener situaciones opuestas: una acumula, la otra paga intereses. El ingreso mide lo que entra; el patrimonio mide lo que has construido.

## Paso 1. Lista tus activos
Dinero en cuentas, ahorro, inversiones, bienes que podrías vender. Usa valores razonables, no los que deseas.

## Paso 2. Lista tus pasivos
Saldos de deudas: tarjetas, préstamos, financiamientos. La cifra que debes hoy, no la original.

## Paso 3. Calcula tu patrimonio neto
Activos − pasivos. Puede ser negativo: eso también es información útil.

## Paso 4. Repítelo cada mes
La tendencia importa más que el número de un solo día.

## Paso 5. Revisa qué lo movió
¿Aumentaste activos, bajaste deudas o cambió una valuación? Saber qué lo movió te dice qué repetir.

> Practica: haz tu primer estado de patrimonio esta semana y guárdalo con la fecha.`,
  },
  {
    slug: "articulo-activos-pasivos-y-patrimonio",
    categorySlug: "patrimonio",
    kind: "article",
    level: "beginner",
    title: "Activos, pasivos y patrimonio neto",
    summary: "Las tres palabras que resumen tu situación completa.",
    durationMinutes: 6,
    sortOrder: 2,
    reviewStatus: "pending",
    sources: null,
    body: `## Activos
Todo lo que tienes y tiene valor: dinero, ahorro, inversiones, bienes.

## Pasivos
Todo lo que debes: saldos de tarjetas, préstamos, financiamientos.

## Patrimonio neto
Activos − pasivos. Es tu foto completa y responde una pregunta simple: si hoy lo liquidaras todo, ¿cuánto te quedaría?

## Por qué medirlo
- Detecta si estás avanzando aunque un mes sea malo.
- Te obliga a ver las deudas junto con lo que tienes.
- Muestra si tus decisiones están construyendo o solo moviendo dinero.

## Señal de avance
Tu patrimonio neto tiende a crecer con el tiempo, incluso con altibajos.

> Practica: anota tus tres cifras hoy y repítelo el próximo mes.`,
  },
  {
    slug: "aula-tu-primer-estado-de-patrimonio",
    categorySlug: "patrimonio",
    kind: "lesson",
    level: "intermediate",
    title: "Aula: levanta tu primer estado de patrimonio",
    summary: "Ejercicio guiado para calcular tu patrimonio neto hoy.",
    durationMinutes: 15,
    sortOrder: 3,
    reviewStatus: "pending",
    sources: null,
    body: `## Objetivo
Calcular tu patrimonio neto con cifras razonables y dejar el formato listo para repetirlo cada mes.

## Preparación
Ten a la mano saldos de cuentas, inversiones y estados de deuda.

## Desarrollo
1. **Activos líquidos:** cuentas y ahorro disponible.
2. **Activos invertidos:** valor actual de tus inversiones.
3. **Bienes:** vehículos, inmuebles u otros, con valor conservador.
4. **Pasivos:** saldo actual de cada deuda.
5. **Resta:** activos totales − pasivos totales.

## Interpretación
- Patrimonio negativo: es común al inicio; la meta es que la tendencia cambie.
- Patrimonio positivo: revisa que no esté concentrado en un solo activo.

## Cierre
Guarda el resultado con la fecha. El siguiente mes, compara y anota qué lo movió.

> Nota: usa valores conservadores. La idea es una foto útil, no optimista.`,
  },
  {
    slug: "corto-ingreso-alto-no-es-patrimonio-alto",
    categorySlug: "patrimonio",
    kind: "short",
    level: "beginner",
    title: "Ingreso alto no siempre es patrimonio alto",
    summary: "Por qué lo que queda importa más que lo que entra.",
    durationMinutes: 3,
    sortOrder: 4,
    reviewStatus: "pending",
    sources: null,
    body: `Dos personas pueden ganar lo mismo y terminar distinto: una acumula activos, la otra paga intereses.

- El ingreso explica lo que entra.
- El patrimonio explica lo que has construido.

> Practica: si sube tu ingreso, decide de antemano qué parte se destinará a mejorar tu patrimonio.`,
  },

  /* ── Hábitos financieros ─────────────────────────────────────────── */
  {
    slug: "guia-rutina-financiera",
    categorySlug: "habitos-financieros",
    kind: "guide",
    level: "intermediate",
    title: "Guía: tu rutina financiera en 20 minutos al mes",
    summary: "Un sistema simple de revisión semanal y mensual.",
    durationMinutes: 12,
    sortOrder: 1,
    isFeatured: true,
    reviewStatus: "pending",
    sources: null,
    body: `## Por qué una rutina
Los buenos resultados financieros casi nunca vienen de una decisión brillante, sino de revisiones pequeñas y repetidas.

## Rutina semanal (5 minutos)
- Registra o revisa los movimientos de la semana.
- Verifica que vas dentro de tu presupuesto.
- Anota cualquier gasto inesperado y cómo lo cubriste.

## Rutina mensual (15 minutos)
1. Cierra el mes: ingresos, gastos, ahorro y pagos de deuda.
2. Compara planeado contra real.
3. Actualiza tu patrimonio y anota qué lo movió.
4. Define **una** acción para el mes siguiente.

## Cómo sostenerla
- Elige un día fijo y ponlo en tu calendario.
- Mantén las cifras en un solo lugar.
- Si fallas una semana, retómala la siguiente sin castigarte.

> Practica: agenda tu próxima revisión ahora mismo, antes de cerrar esta guía.`,
  },
  {
    slug: "articulo-habitos-que-sostienen-tus-finanzas",
    categorySlug: "habitos-financieros",
    kind: "article",
    level: "beginner",
    title: "Los hábitos que sostienen tus finanzas",
    summary: "Cinco conductas simples con más impacto que cualquier plan complicado.",
    durationMinutes: 6,
    sortOrder: 2,
    reviewStatus: "pending",
    sources: null,
    body: `## 1. Registrar
No lo que crees que gastas: lo que realmente gastas.

## 2. Revisar con regularidad
Un repaso breve cada semana evita sorpresas al cierre del mes.

## 3. Pagarte primero
Apartar el ahorro en cuanto recibes, no al final.

## 4. Decidir con margen
Dejar espacio para imprevistos en lugar de asignar al límite.

## 5. Pausar antes de comprar
Esperar un día en compras no planeadas evita una buena parte de los arrepentimientos.

## Cómo se construyen
Un hábito a la vez, con un disparador claro y un lugar fijo en tu semana.

> Practica: elige uno de los cinco y practícalo durante dos semanas antes de sumar otro.`,
  },
  {
    slug: "aula-disenar-tu-revision-de-dinero",
    categorySlug: "habitos-financieros",
    kind: "lesson",
    level: "intermediate",
    title: "Aula: diseña tu revisión de dinero",
    summary: "Convierte la intención de revisar tus finanzas en un sistema.",
    durationMinutes: 15,
    sortOrder: 3,
    reviewStatus: "pending",
    sources: null,
    body: `## Objetivo
Diseñar una revisión financiera que puedas sostener, con día, hora y checklist.

## Desarrollo
1. **Elige el momento.** Un día y hora fijos: viernes por la tarde, domingo por la mañana, el día de tu quincena.
2. **Define la duración.** Semanal: 5 minutos. Mensual: 15 a 20 minutos.
3. **Escribe tu checklist.** Por ejemplo:
   - Registrar movimientos pendientes.
   - Revisar que los pagos de deuda estén cubiertos.
   - Confirmar que el ahorro del mes ya se apartó.
   - Anotar una acción concreta para la próxima semana.
4. **Prepara tus herramientas.** Un solo lugar para todas tus cifras.
5. **Programa un recordatorio** para las próximas cuatro semanas.

## Cierre
Prueba el sistema un mes. Si no lo logras sostener, simplifica: menos pasos, misma constancia.

> Nota: la constancia vale más que la exhaustividad. Una revisión corta y regular supera a una larga y esporádica.`,
  },
  {
    slug: "corto-revisa-no-reacciones",
    categorySlug: "habitos-financieros",
    kind: "short",
    level: "beginner",
    title: "Revisa, no reacciones",
    summary: "La diferencia entre revisar datos y decidir con prisa.",
    durationMinutes: 3,
    sortOrder: 4,
    reviewStatus: "pending",
    sources: null,
    body: `Revisar es mirar tus datos con calma y seguir tu plan. Reaccionar es cambiar de rumbo por una noticia, una opinión o un mal mes.

- Revisar: regular, tranquilo, con tus propias cifras.
- Reaccionar: inmediato, emocional, sin datos.

> Practica: ante una decisión urgente, espera 24 horas y revisa tus números antes de decidir.`,
  },
];

/** Total del catálogo base (8 categorías × 4 piezas). */
export const ACADEMY_CATALOG_SIZE = ACADEMY_CONTENTS.length;
