import { LegalPage } from "@/components/LegalPage"

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de Privacidad de PixelFM" updatedAt="30 de junio de 2026">
      <section>
        <h2>1. DATOS QUE RECOPILAMOS</h2>
        <ul>
          <li>Email y contraseña (para tu cuenta).</li>
          <li>Imágenes que subes como referencia.</li>
          <li>Creativos generados con tu cuenta.</li>
          <li>Datos de pago (procesados por Paddle, no los almacenamos nosotros).</li>
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
          <li>Paddle (procesamiento de pagos).</li>
          <li>Supabase (almacenamiento).</li>
          <li>OpenAI (generación de prompts).</li>
          <li>fal.ai (generación de imágenes).</li>
        </ul>
      </section>

      <section>
        <h2>5. TUS DERECHOS</h2>
        <p>Puedes solicitar la eliminación de tu cuenta y datos en cualquier momento escribiendo a <a href="mailto:soporte@pixelosfm.com" className="text-[#D97757] hover:text-[#E18A6E] transition-colors">soporte@pixelosfm.com</a>.</p>
      </section>

      <section>
        <h2>6. COOKIES</h2>
        <p>Usamos cookies esenciales para mantener tu sesión activa. No usamos cookies de rastreo o publicidad.</p>
      </section>

      <section>
        <h2>7. CONTACTO</h2>
        <p><a href="mailto:soporte@pixelosfm.com" className="text-[#D97757] hover:text-[#E18A6E] transition-colors">soporte@pixelosfm.com</a></p>
      </section>
    </LegalPage>
  )
}
