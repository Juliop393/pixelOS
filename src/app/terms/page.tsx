import { LegalPage } from "@/components/LegalPage"

export default function TermsPage() {
  return (
    <LegalPage title="Términos de Servicio de PixelOS" updatedAt="30 de junio de 2026">
      <section>
        <h2>1. ACEPTACIÓN</h2>
        <p>Al usar PixelOS aceptas estos términos. Si no estás de acuerdo, no uses el servicio.</p>
      </section>

      <section>
        <h2>2. EL SERVICIO</h2>
        <p>PixelOS es una plataforma SaaS que genera creativos publicitarios con inteligencia artificial. Los resultados son generados por IA y pueden variar.</p>
      </section>

      <section>
        <h2>3. CRÉDITOS</h2>
        <ul>
          <li>Los créditos se asignan según tu plan mensual.</li>
          <li>Los créditos no utilizados no se acumulan al siguiente mes.</li>
          <li>1 crédito = 1 creativo generado.</li>
          <li>Los créditos no son transferibles ni canjeables por dinero.</li>
        </ul>
      </section>

      <section>
        <h2>4. PAGOS Y SUSCRIPCIONES</h2>
        <ul>
          <li>Los planes se cobran mensualmente de forma automática.</li>
          <li>Puedes cancelar en cualquier momento desde tu panel de configuración.</li>
          <li>Al cancelar, conservas acceso y créditos hasta el fin del período pagado.</li>
        </ul>
      </section>

      <section>
        <h2>5. USO ACEPTABLE</h2>
        <p>No puedes usar PixelOS para:</p>
        <ul>
          <li>Generar contenido ilegal o que infrinja derechos de terceros.</li>
          <li>Revender el servicio sin autorización.</li>
          <li>Intentar acceder a cuentas de otros usuarios.</li>
        </ul>
      </section>

      <section>
        <h2>6. PROPIEDAD INTELECTUAL</h2>
        <p>Los creativos generados son tuyos. PixelOS se reserva el derecho de usar imágenes generadas de forma anónima para mejorar el servicio.</p>
      </section>

      <section>
        <h2>7. LIMITACIÓN DE RESPONSABILIDAD</h2>
        <p>PixelOS no garantiza resultados específicos de ventas o conversión con los creativos generados. La IA puede producir resultados imperfectos. No somos responsables por pérdidas derivadas del uso del servicio.</p>
      </section>

      <section>
        <h2>8. MODIFICACIONES</h2>
        <p>Nos reservamos el derecho de modificar estos términos con 30 días de aviso previo.</p>
      </section>

      <section>
        <h2>9. CONTACTO</h2>
        <p>Para consultas: <a href="mailto:soporte@pixelosfm.com" className="text-[#D97757] hover:text-[#E18A6E] transition-colors">soporte@pixelosfm.com</a></p>
      </section>
    </LegalPage>
  )
}
