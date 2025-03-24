const handleError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return error.message as string
  }
  return 'Error desconocido'
}

export default handleError
