/**
 * Lleva la vista suavemente hasta el elemento con este id (un mensaje de
 * error, o la fila/tarjeta recién creada/editada) para que el usuario nunca
 * tenga que buscarlo manualmente en una tabla o formulario largo.
 *
 * Se envuelve en `setTimeout` para esperar a que Angular termine de renderizar
 * el elemento (ej. un `@if` que acaba de volverse verdadero) antes de buscarlo
 * en el DOM.
 */
export function scrollToId(elementId: string): void {
  setTimeout(() => {
    document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}
