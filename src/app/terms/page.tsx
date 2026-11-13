import Link from "next/link"
import { LegalPage } from "@/components/LegalPage"

export default function TermsPage() {
  return (
    <LegalPage title="Términos de Servicio de PixelFM" updatedAt="13 de noviembre de 2026">
      <section>
        <h2>1. ACEPTACIÓN</h2>
        <p>Al usar PixelFM aceptas estos términos. Si no estás de acuerdo, no uses el servicio.</p>
      </section>

      <section>
        <h2>2. EL SERVICIO</h2>
        <p>PixelFM es una plataforma SaaS que genera creativos publicitarios con inteligencia artificial. Los resultados son generados por IA y pueden variar.</p>
      </section>

      <section>
        <h2>3. CRÉDITOS</h2>
        <ul>
          <li>Cada generación descuenta créditos de tu saldo: 1 crédito por imagen, 10 créditos por Video Rápido de 10 segundos y 20 créditos por Video Premium de 10 segundos.</li>
          <li>Al registrarte recibes 15 créditos gratuitos una sola vez. No se renuevan.</li>
          <li>Cada plan entrega sus créditos una vez por mes: Starter 120, Growth 300 y Pro 720.</li>
          <li>Starter: los créditos del mes que no uses vencen al renovarse el plan.</li>
          <li>Growth y Pro: al renovarse el plan, los créditos del mes que no uses pasan al mes siguiente, hasta un máximo equivalente a una asignación mensual (300 en Growth y 720 en Pro). Los créditos trasladados vencen al terminar ese mes siguiente y no vuelven a trasladarse.</li>
          <li>Packs de créditos: los suscriptores con un plan activo pueden comprar packs de 60, 180 o 480 créditos. Cada pack es válido durante 12 meses desde la compra y se conserva, y puedes seguir usándolo, aunque cambies o canceles tu plan; al cumplirse ese plazo, los créditos que no hayas usado vencen.</li>
          <li>Se usan primero los créditos que vencen antes.</li>
          <li>Los créditos no son transferibles ni canjeables por dinero.</li>
        </ul>
      </section>

      <section>
        <h2>4. PAGOS Y SUSCRIPCIONES</h2>
        <ul>
          <li>Los planes se pagan por adelantado y se renuevan automáticamente: cada mes en la modalidad mensual y cada año en la modalidad anual.</li>
          <li>En la modalidad anual pagas el año completo, pero los créditos se entregan mes a mes, con las mismas reglas que la modalidad mensual.</li>
          <li>Los packs de créditos son pagos únicos y no se renuevan.</li>
          <li>Puedes cancelar en cualquier momento desde tu panel de configuración.</li>
          <li>La cancelación se hace efectiva al final del período de facturación en curso: hasta entonces conservas el acceso y los créditos de tu plan. Después, los créditos del plan vencen y los packs se conservan, y puedes seguir usándolos, hasta cumplir sus 12 meses.</li>
          <li>Los reembolsos se rigen por nuestra <Link href="/refunds" className="text-[#D97757] hover:text-[#E18A6E] transition-colors">Política de Reembolsos</Link>.</li>
        </ul>
      </section>

      <section>
        <h2>5. USO ACEPTABLE</h2>
        <p>No puedes usar PixelFM para:</p>
        <ul>
          <li>Generar contenido ilegal o que infrinja derechos de terceros.</li>
          <li>Revender el servicio sin autorización.</li>
          <li>Intentar acceder a cuentas de otros usuarios.</li>
        </ul>
      </section>

      <section>
        <h2>6. PROPIEDAD INTELECTUAL</h2>
        <p>Los creativos generados son tuyos. PixelFM se reserva el derecho de usar imágenes generadas de forma anónima para mejorar el servicio.</p>
      </section>

      <section>
        <h2>7. LIMITACIÓN DE RESPONSABILIDAD</h2>
        <p>PixelFM no garantiza resultados específicos de ventas o conversión con los creativos generados. La IA puede producir resultados imperfectos. No somos responsables por pérdidas derivadas del uso del servicio.</p>
      </section>

      <section>
        <h2>8. MODIFICACIONES</h2>
        <p>Nos reservamos el derecho de modificar estos términos con 30 días de aviso previo.</p>
      </section>

      <section>
        <h2>9. CONTACTO</h2>
        <p>Para consultas: <a href="mailto:team@pixelfm.com" className="text-[#D97757] hover:text-[#E18A6E] transition-colors">team@pixelfm.com</a></p>
      </section>
    </LegalPage>
  )
}
