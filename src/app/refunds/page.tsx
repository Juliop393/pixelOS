import { LegalPage } from "@/components/LegalPage"

export default function RefundsPage() {
  return (
    <LegalPage title="Política de Reembolsos de PixelOS" updatedAt="30 de junio de 2026">
      <section>
        <h2>1. POLÍTICA GENERAL</h2>
        <p>Dado que PixelOS es un servicio digital con consumo inmediato de recursos (créditos de IA), no ofrecemos reembolsos automáticos.</p>
      </section>

      <section>
        <h2>2. CASOS EN QUE SÍ APLICA REEMBOLSO</h2>
        <p>Consideramos reembolsos en los siguientes casos dentro de los 7 días de la compra:</p>
        <ul>
          <li>Error técnico que impidió usar el servicio completamente.</li>
          <li>Cobro duplicado por error del sistema.</li>
          <li>El servicio estuvo inaccesible por más de 48 horas continuas.</li>
        </ul>
      </section>

      <section>
        <h2>3. CÓMO SOLICITAR UN REEMBOLSO</h2>
        <p>Escribe a <a href="mailto:soporte@pixelosfm.com" className="text-[#D97757] hover:text-[#E18A6E] transition-colors">soporte@pixelosfm.com</a> con:</p>
        <ul>
          <li>Tu email de cuenta.</li>
          <li>Fecha del cobro.</li>
          <li>Motivo del reembolso.</li>
        </ul>
        <p>Respondemos en máximo 3 días hábiles.</p>
      </section>

      <section>
        <h2>4. CANCELACIONES</h2>
        <ul>
          <li>Puedes cancelar tu suscripción en cualquier momento.</li>
          <li>No hay penalidades por cancelación.</li>
          <li>Conservas acceso hasta el fin del período pagado.</li>
          <li>No se reembolsa el período en curso salvo los casos del punto 2.</li>
        </ul>
      </section>

      <section>
        <h2>5. PROCESAMIENTO</h2>
        <p>Los reembolsos aprobados se procesan en 5-10 días hábiles según tu banco.</p>
      </section>
    </LegalPage>
  )
}
