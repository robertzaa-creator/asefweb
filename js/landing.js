// Rotador aleatorio infinito de mensajes ASEF
document.addEventListener("DOMContentLoaded", () => {
  const messages = document.querySelectorAll(".landing-messages .message");
  let current = 0;

  function changeMessage() {
    // Oculta el mensaje actual
    messages[current].classList.remove("active");

    // Elige uno aleatorio distinto al actual
    let next;
    do {
      next = Math.floor(Math.random() * messages.length);
    } while (next === current);

    // Muestra el nuevo
    messages[next].classList.add("active");
    current = next;
  }

  // Cambia de mensaje cada 6 segundos
  setInterval(changeMessage, 6000);
});