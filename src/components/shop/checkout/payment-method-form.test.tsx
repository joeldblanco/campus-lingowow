import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PaymentMethodForm } from './payment-method-form'

// NiubizCheckout loads the external Niubiz widget; stub it so the form renders in jsdom.
vi.mock('@/components/payments/NiubizCheckout', () => ({
  NiubizCheckout: () => <div data-testid="niubiz-checkout">Niubiz</div>,
}))

const paypalData = {
  items: [],
  total: 100,
  subtotal: 100,
  discount: 0,
  currency: 'USD',
}

describe('PaymentMethodForm', () => {
  it('renders the Niubiz checkout for the creditCard method', () => {
    render(
      <PaymentMethodForm
        paymentMethod="creditCard"
        onSubmit={() => {}}
        isLoading={false}
        paypalData={paypalData}
      />
    )

    expect(screen.getByTestId('niubiz-checkout')).toBeInTheDocument()
    // PayPal must no longer be offered as a customer-facing payment option.
    expect(screen.queryByText(/PayPal/i)).not.toBeInTheDocument()
  })

  it('never renders a PayPal payment form, even when a paypal method is requested', () => {
    render(
      <PaymentMethodForm
        paymentMethod="paypal"
        onSubmit={() => {}}
        isLoading={false}
        paypalData={paypalData}
      />
    )

    expect(screen.queryByText(/PayPal/i)).not.toBeInTheDocument()
    expect(screen.queryByTestId('niubiz-checkout')).not.toBeInTheDocument()
  })

  it('shows the trust block and 3DS expectation copy next to the pay button', () => {
    render(
      <PaymentMethodForm
        paymentMethod="creditCard"
        onSubmit={() => {}}
        isLoading={false}
        paypalData={paypalData}
      />
    )

    // 3DS redirect expectation — set before the bank redirect so users don't bail.
    expect(screen.getByText(/volverás aquí automáticamente/i)).toBeInTheDocument()
    // Real payment-network marks.
    expect(screen.getByRole('img', { name: 'Niubiz' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Visa' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Mastercard' })).toBeInTheDocument()
    // Trust line + the real (linked) 30-day guarantee.
    expect(screen.getByText(/Pago protegido por Niubiz/i)).toBeInTheDocument()
    const guarantee = screen.getByRole('link', { name: /Garantía de satisfacción de 30 días/i })
    expect(guarantee).toHaveAttribute('href', '/terms')
  })

  it('surfaces the recurring charge before paying when the cart is recurrent', () => {
    render(
      <PaymentMethodForm
        paymentMethod="creditCard"
        onSubmit={() => {}}
        isLoading={false}
        paypalData={paypalData}
        recurringSummary={{ amount: 29.9, cycleLabel: 'cada mes' }}
      />
    )

    expect(screen.getByText(/Se te cobrará/i)).toBeInTheDocument()
    expect(screen.getByText(/\$29\.90 cada mes/i)).toBeInTheDocument()
    const cancel = screen.getByRole('link', { name: /Cancela cuando quieras escribiéndonos/i })
    expect(cancel).toHaveAttribute('href', '/contact')
  })

  it('omits the recurring notice for one-time purchases', () => {
    render(
      <PaymentMethodForm
        paymentMethod="creditCard"
        onSubmit={() => {}}
        isLoading={false}
        paypalData={paypalData}
      />
    )

    expect(screen.queryByText(/Se te cobrará/i)).not.toBeInTheDocument()
  })
})
