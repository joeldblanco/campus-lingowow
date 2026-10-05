import { NextRequest, NextResponse } from 'next/server'
import { authorizeRecorderToken } from '../auth'
import { getRecorderContent, isRecorderContentType } from '../content'

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') || ''
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return ''
  }
  return authorization.slice('bearer '.length).trim()
}

export async function GET(request: NextRequest) {
  const token = getBearerToken(request)
  const authorization = await authorizeRecorderToken(token)

  if (!authorization) {
    return NextResponse.json({ error: 'Token de grabación no válido' }, { status: 401 })
  }

  const contentId = request.nextUrl.searchParams.get('contentId')
  const contentType = request.nextUrl.searchParams.get('contentType')

  if (!contentId || !isRecorderContentType(contentType)) {
    return NextResponse.json({ error: 'Contenido inválido' }, { status: 400 })
  }

  const content = await getRecorderContent(authorization, contentId, contentType)
  if (!content) {
    return NextResponse.json({ error: 'Contenido no disponible para esta clase' }, { status: 404 })
  }

  return NextResponse.json(content, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

