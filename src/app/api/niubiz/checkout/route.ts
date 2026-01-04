import { NextRequest, NextResponse } from 'next/server'
import { authorizeNiubizTransaction, getNiubizAccessToken } from '@/lib/niubiz'

// This endpoint receives the POST from Niubiz after 3DS authentication
// Niubiz sends transactionToken in the body as application/x-www-form-urlencoded
export async function POST(request: NextRequest) {
  console.log('[NIUBIZ CHECKOUT] POST request received')
  
  // Get purchaseNumber from URL params (we add it when configuring the SDK)
  const { searchParams } = new URL(request.url)
  const purchaseNumber = searchParams.get('purchaseNumber')
  const amount = searchParams.get('amount')
  
  console.log('[NIUBIZ CHECKOUT] URL params:', { purchaseNumber, amount })
  
  let transactionToken: string | null = null
  
  try {
    // Try to get the form data from Niubiz POST
    // Niubiz sends as application/x-www-form-urlencoded
    const contentType = request.headers.get('content-type') || ''
    console.log('[NIUBIZ CHECKOUT] Content-Type:', contentType)
    
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      transactionToken = formData.get('transactionToken') as string
      
      // Log all form fields for debugging
      const formFields: Record<string, string> = {}
      formData.forEach((value, key) => {
        formFields[key] = typeof value === 'string' ? value.substring(0, 50) : '[File]'
      })
      console.log('[NIUBIZ CHECKOUT] Form fields:', formFields)
    } else if (contentType.includes('application/json')) {
      const body = await request.json()
      transactionToken = body.transactionToken
      console.log('[NIUBIZ CHECKOUT] JSON body keys:', Object.keys(body))
    } else {
      // Try to read as text and parse
      const text = await request.text()
      console.log('[NIUBIZ CHECKOUT] Raw body (first 200 chars):', text.substring(0, 200))
      
      // Try to parse as URL encoded
      const params = new URLSearchParams(text)
      transactionToken = params.get('transactionToken')
    }
    
    console.log('[NIUBIZ CHECKOUT] Extracted transactionToken:', transactionToken ? `${transactionToken.substring(0, 30)}...` : null)
    
    if (!transactionToken) {
      console.error('[NIUBIZ CHECKOUT] No transactionToken in POST body')
      // Redirect to checkout with error
      return NextResponse.redirect(
        new URL('/shop/cart/checkout?niubiz_error=missing_token', request.url)
      )
    }
    
    if (!purchaseNumber || !amount) {
      console.error('[NIUBIZ CHECKOUT] Missing purchaseNumber or amount')
      return NextResponse.redirect(
        new URL('/shop/cart/checkout?niubiz_error=missing_params', request.url)
      )
    }
    
    // Get access token for authorization
    const accessToken = await getNiubizAccessToken()
    
    // Authorize the transaction with Niubiz
    const authorization = await authorizeNiubizTransaction(
      transactionToken,
      parseFloat(amount),
      purchaseNumber,
      accessToken
    )
    
    console.log('[NIUBIZ CHECKOUT] Authorization response:', {
      actionCode: authorization?.dataMap?.ACTION_CODE,
      actionDescription: authorization?.dataMap?.ACTION_DESCRIPTION,
    })
    
    // Check if authorization was successful
    const actionCode = authorization?.dataMap?.ACTION_CODE
    if (actionCode !== '000') {
      const errorMessage = authorization?.dataMap?.ACTION_DESCRIPTION || 'Pago denegado'
      console.error('[NIUBIZ CHECKOUT] Authorization failed:', errorMessage)
      return NextResponse.redirect(
        new URL(`/shop/cart/checkout?niubiz_error=auth_failed&message=${encodeURIComponent(errorMessage)}`, request.url)
      )
    }
    
    // Payment successful - redirect to confirmation
    // Note: Invoice creation is handled by the existing /api/niubiz/authorize endpoint
    // or can be done on the confirmation page with the stored cart data
    
    const invoiceNumber = `INV-${purchaseNumber}`
    
    // Redirect to confirmation page with success params
    const confirmationUrl = new URL('/shop/cart/checkout/confirmation', request.url)
    confirmationUrl.searchParams.set('success', 'true')
    confirmationUrl.searchParams.set('orderNumber', invoiceNumber)
    confirmationUrl.searchParams.set('amount', amount)
    
    console.log('[NIUBIZ CHECKOUT] Redirecting to confirmation:', confirmationUrl.toString())
    
    return NextResponse.redirect(confirmationUrl)
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[NIUBIZ CHECKOUT] Error processing payment:', errorMessage)
    console.error('[NIUBIZ CHECKOUT] Full error:', error)
    return NextResponse.redirect(
      new URL(`/shop/cart/checkout?niubiz_error=server_error&debug=${encodeURIComponent(errorMessage.substring(0, 100))}`, request.url)
    )
  }
}

// Also handle GET in case Niubiz sends a GET request
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const transactionToken = searchParams.get('transactionToken')
  
  console.log('[NIUBIZ CHECKOUT] Received GET request:', {
    transactionToken: transactionToken ? 'present' : 'missing',
    allParams: Object.fromEntries(searchParams.entries()),
  })
  
  if (transactionToken) {
    // If we got a transactionToken via GET, process it
    const purchaseNumber = searchParams.get('purchaseNumber')
    const amount = searchParams.get('amount')
    
    if (purchaseNumber && amount) {
      try {
        const accessToken = await getNiubizAccessToken()
        const authorization = await authorizeNiubizTransaction(
          transactionToken,
          parseFloat(amount),
          purchaseNumber,
          accessToken
        )
        
        const actionCode = authorization?.dataMap?.ACTION_CODE
        if (actionCode === '000') {
          const confirmationUrl = new URL('/shop/cart/checkout/confirmation', request.url)
          confirmationUrl.searchParams.set('success', 'true')
          confirmationUrl.searchParams.set('orderNumber', purchaseNumber)
          confirmationUrl.searchParams.set('amount', amount)
          return NextResponse.redirect(confirmationUrl)
        }
      } catch (error) {
        console.error('[NIUBIZ CHECKOUT] GET authorization error:', error)
      }
    }
  }
  
  // Redirect back to checkout if something went wrong
  return NextResponse.redirect(
    new URL('/shop/cart/checkout?niubiz_error=invalid_request', request.url)
  )
}
