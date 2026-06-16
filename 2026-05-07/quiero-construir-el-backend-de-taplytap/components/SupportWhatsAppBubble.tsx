const supportWhatsAppUrl =
  "https://wa.me/523327940448?text=Hola%2C%20necesito%20ayuda%20con%20mi%20placa%20TaplyTap.";

export function SupportWhatsAppBubble() {
  return (
    <a
      href={supportWhatsAppUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar soporte por WhatsApp"
      className="fixed bottom-5 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition duration-200 hover:scale-105 hover:bg-[#1ebe5d] focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:ring-offset-2 active:scale-95"
    >
      <svg
        aria-hidden="true"
        className="h-7 w-7"
        viewBox="0 0 32 32"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M16.02 3.2A12.73 12.73 0 0 0 5.19 22.64L3.6 28.8l6.31-1.55A12.72 12.72 0 1 0 16.02 3.2Zm0 23.2a10.5 10.5 0 0 1-5.35-1.47l-.38-.22-3.74.92.96-3.65-.25-.4A10.51 10.51 0 1 1 16.02 26.4Zm5.76-7.86c-.31-.16-1.86-.92-2.15-1.02-.29-.11-.5-.16-.71.16-.21.31-.82 1.02-1 1.23-.18.21-.37.24-.68.08-.31-.16-1.33-.49-2.54-1.56-.94-.84-1.57-1.88-1.75-2.19-.18-.31-.02-.48.14-.64.14-.14.31-.37.47-.55.16-.18.21-.31.31-.52.1-.21.05-.39-.03-.55-.08-.16-.71-1.71-.97-2.34-.26-.61-.52-.53-.71-.54h-.61c-.21 0-.55.08-.84.39-.29.31-1.1 1.08-1.1 2.63s1.13 3.05 1.29 3.26c.16.21 2.23 3.41 5.39 4.78.75.32 1.34.52 1.8.66.76.24 1.45.21 1.99.13.61-.09 1.86-.76 2.12-1.5.26-.73.26-1.36.18-1.5-.08-.13-.29-.21-.61-.37Z" />
      </svg>
    </a>
  );
}
