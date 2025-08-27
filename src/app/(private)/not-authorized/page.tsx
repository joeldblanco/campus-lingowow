import Link from 'next/link'

const NotAuthorized = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 sm:px-6 md:px-8 lg:px-12 xl:px-16">
      <div className="w-full space-y-6 text-center">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">403 Forbidden</h1>
          <p className="text-gray-500">No tienes permisos para acceder a esta página.</p>
        </div>
        <Link
          className="inline-flex h-10 items-center rounded-md border border-gray-200 bg-white shadow-sm px-8 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-800 dark:hover:text-gray-50 dark:focus-visible:ring-gray-300"
          href="/"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}

export default NotAuthorized
