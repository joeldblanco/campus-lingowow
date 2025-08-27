'use client'

import { useSearchParams } from 'next/navigation'

const AuthErrorComponent = () => {
  const searchParams = useSearchParams()

  const urlError =
    searchParams.get('error') === 'OAuthSignin'
      ? 'Error en la construcción de la URL de autorización'
      : searchParams.get('error') === 'OAuthCallback'
        ? 'Error en el manejo de la respuesta de un proveedor OAuth'
        : searchParams.get('error') === 'OAuthCreateAccount'
          ? 'No se pudo crear el usuario de proveedor OAuth en la base de datos'
          : searchParams.get('error') === 'EmailCreateAccount'
            ? 'No se pudo crear el usuario de proveedor de correo electrónico en la base de datos'
            : searchParams.get('error') === 'Callback'
              ? 'Error en la ruta de manejo de la respuesta de OAuth'
              : searchParams.get('error') === 'OAuthAccountNotLinked'
                ? 'Si el correo electrónico en la cuenta ya está vinculado, pero no con esta cuenta de OAuth'
                : searchParams.get('error') === 'EmailSignin'
                  ? 'Error al enviar el correo electrónico con el token de verificación'
                  : searchParams.get('error') === 'CredentialsSignin'
                    ? 'No se pudo obtener el autorización de los datos de credenciales.'
                    : searchParams.get('error') === 'SessionRequired'
                      ? 'El contenido de esta página requiere que se inicie sesión en todos los momentos.'
                      : searchParams.get('error') === 'AccessDenied'
                        ? 'Acceso denegado'
                        : 'Error desconocido'

  return (
    <>
      <p>{urlError}</p>
    </>
  )
}

const AuthError = () => {
  return <AuthErrorComponent />
}

export default AuthError
