const Classes = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-5xl">
        <h1 className="text-2xl font-bold mb-6">Classes</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
          <div className="col-span-1 md:col-span-2 lg:col-span-3">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Estudiantes</h1>
                <p className="text-balance text-muted-foreground">Ver todos los estudiantes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Classes
