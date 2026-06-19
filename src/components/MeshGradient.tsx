export default function MeshGradient() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base oscura */}
      <div className="absolute inset-0 bg-[#1E1C1A]" />
      
      {/* Manchas de gradiente animadas */}
      <div className="absolute top-0 left-0 w-[800px] h-[800px] rounded-full opacity-30 blur-[120px] animate-mesh-1"
        style={{
          background: 'radial-gradient(circle, #4A2E25 0%, transparent 70%)',
        }}
      />
      
      <div className="absolute top-[20%] right-0 w-[600px] h-[600px] rounded-full opacity-25 blur-[100px] animate-mesh-2"
        style={{
          background: 'radial-gradient(circle, #38201A 0%, transparent 70%)',
        }}
      />
      
      <div className="absolute bottom-0 left-[30%] w-[700px] h-[700px] rounded-full opacity-20 blur-[110px] animate-mesh-3"
        style={{
          background: 'radial-gradient(circle, #4A2E25 0%, transparent 70%)',
        }}
      />
      
      <div className="absolute top-[50%] right-[20%] w-[500px] h-[500px] rounded-full opacity-15 blur-[90px] animate-mesh-4"
        style={{
          background: 'radial-gradient(circle, #3A2820 0%, transparent 70%)',
        }}
      />
    </div>
  )
}
