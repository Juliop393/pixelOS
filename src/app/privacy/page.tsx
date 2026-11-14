import { LegalPage } from "@/components/LegalPage"

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de Privacidad de PixelFM" updatedAt="14 de noviembre de 2026">
      <section>
        <h2>1. DATOS QUE RECOPILAMOS</h2>
        <ul>
          <li>Email y contraseña (para tu cuenta).</li>
          <li>Imágenes que subes como referencia.</li>
          <li>Creativos generados con tu cuenta.</li>
          <li>Datos de pago, cuando estén disponibles: los procesa Stripe y nosotros no almacenamos los datos de tu tarjeta.</li>
        </ul>
      </section>

      <section>
        <h2>2. CÓMO USAMOS TUS DATOS</h2>
        <ul>
          <li>Para proveer el servicio de generación.</li>
          <li>Para enviarte facturas y recibos.</li>
          <li>Para mejorar la calidad del servicio.</li>
        </ul>
      </section>

      <section>
        <h2>3. ALMACENAMIENTO</h2>
        <p>Tus datos se almacenan en Supabase (servidores en la UE). Las imágenes generadas se guardan en Supabase Storage.</p>
      </section>

      <section>
        <h2>4. COMPARTIR DATOS</h2>
        <p>No vendemos ni compartimos tus datos con terceros, excepto:</p>
        <ul>
          <li>Stripe (procesamiento de pagos).</li>
          <li>Supabase (almacenamiento).</li>
          <li>OpenAI (generación de prompts).</li>
          <li>fal.ai (generación de imágenes).</li>
          <li>Meta Platforms (medición de anuncios, solo si aceptas las cookies de publicidad).</li>
        </ul>
      </section>

      <section>
        <h2>5. TUS DERECHOS</h2>
        <p>Puedes solicitar la eliminación de tu cuenta y datos en cualquier momento escribiendo a <a href="mailto:team@pixelfm.com" className="text-[#D97757] hover:text-[#E18A6E] transition-colors">team@pixelfm.com</a>.</p>
      </section>

      <section>
        <h2>6. COOKIES</h2>
        <p>Usamos cookies esenciales para mantener tu sesión activa.</p>
        <p>Además, PixelFM puede usar Meta Pixel, una herramienta de Meta Platforms, para medir las visitas que llegan desde nuestros anuncios y los resultados de nuestras campañas publicitarias. Meta Pixel solo se activa después de que aceptas las cookies de publicidad en el aviso que mostramos; si no las aceptas, no se carga.</p>
        <p>Si lo aceptas, Meta Pixel puede usar cookies e identificadores como <code>_fbp</code> y enviar a Meta información técnica de tu navegación, como las páginas que visitas en PixelFM, la página de origen, tu dirección IP y datos de tu navegador o dispositivo. No le enviamos tu email, tu nombre ni tus datos de pago, y no lo activamos en las páginas cuya dirección incluye datos personales o de pago.</p>
        <ul>
          <li>Puedes aceptar o rechazar las cookies de publicidad en el aviso que aparece al visitar PixelFM.</li>
          <li>Puedes cambiar tu decisión en cualquier momento con el enlace «Preferencias de cookies» del pie de página de nuestra página principal, que vuelve a mostrar el aviso para aceptarlas o rechazarlas.</li>
          <li>También puedes borrar las cookies y los datos de este sitio en tu navegador: el aviso volverá a aparecer en tu próxima visita.</li>
        </ul>
      </section>

      <section>
        <h2>7. CONTACTO</h2>
        <p><a href="mailto:team@pixelfm.com" className="text-[#D97757] hover:text-[#E18A6E] transition-colors">team@pixelfm.com</a></p>
      </section>
    </LegalPage>
  )
}
