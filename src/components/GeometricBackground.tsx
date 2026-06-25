export default function GeometricBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Degradado radial de fondo */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[#1E1C1A]" />
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(217, 119, 87, 0.15) 0%, transparent 50%)',
          }}
        />
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(ellipse at 80% 50%, rgba(217, 119, 87, 0.1) 0%, transparent 40%)',
          }}
        />
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(ellipse at 20% 80%, rgba(217, 119, 87, 0.08) 0%, transparent 45%)',
          }}
        />
      </div>

      {/* Elementos geométricos */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.12]" width="100%" height="100%" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#D97757', stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: '#E8E6E1', stopOpacity: 0.1 }} />
          </linearGradient>
          <linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#E8E6E1', stopOpacity: 0.2 }} />
            <stop offset="100%" style={{ stopColor: '#D97757', stopOpacity: 0.15 }} />
          </linearGradient>
        </defs>

        {/* Hexágono grande - esquina superior izquierda */}
        <g className="animate-rotate-slow">
          <polygon 
            points="150,50 200,25 250,50 250,100 200,125 150,100" 
            fill="none" 
            stroke="url(#grad1)" 
            strokeWidth="1"
            transform="translate(100, 150)"
          />
        </g>

        {/* Hexágono mediano - centro derecha */}
        <g className="animate-rotate-slow-reverse">
          <polygon 
            points="150,50 200,25 250,50 250,100 200,125 150,100" 
            fill="none" 
            stroke="url(#grad2)" 
            strokeWidth="0.8"
            transform="translate(900, 400) scale(0.7)"
          />
        </g>

        {/* Triángulo - esquina inferior izquierda */}
        <g className="animate-float-slow">
          <polygon 
            points="100,0 200,173 0,173" 
            fill="none" 
            stroke="url(#grad1)" 
            strokeWidth="0.8"
            transform="translate(200, 600) scale(0.5)"
          />
        </g>

        {/* Líneas diagonales sutiles */}
        <line x1="0" y1="0" x2="300" y2="300" stroke="url(#grad1)" strokeWidth="0.5" opacity="0.3" />
        <line x1="100%" y1="0" x2="70%" y2="30%" stroke="url(#grad2)" strokeWidth="0.5" opacity="0.2" />
        <line x1="50%" y1="100%" x2="80%" y2="70%" stroke="url(#grad1)" strokeWidth="0.5" opacity="0.25" />

        {/* Círculos pequeños flotantes */}
        <circle cx="80%" cy="20%" r="60" fill="none" stroke="url(#grad2)" strokeWidth="0.6" className="animate-float-slow" />
        <circle cx="15%" cy="70%" r="40" fill="none" stroke="url(#grad1)" strokeWidth="0.5" className="animate-float-slow-reverse" />

        {/* Hexágono pequeño - centro */}
        <g className="animate-rotate-slow">
          <polygon 
            points="150,50 200,25 250,50 250,100 200,125 150,100" 
            fill="none" 
            stroke="url(#grad1)" 
            strokeWidth="0.6"
            transform="translate(600, 300) scale(0.4)"
          />
        </g>
      </svg>
    </div>
  )
}
