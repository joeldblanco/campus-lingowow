import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PaymentSummaryCards } from './payment-summary-cards'

describe('PaymentSummaryCards', () => {
  it('renders the merged payment and payable class metrics', () => {
    render(
      <PaymentSummaryCards
        summary={{
          totalTeachers: 4,
          totalClasses: 12,
          totalHours: 9.5,
          totalPayment: 240.75,
          averagePaymentPerTeacher: 60.19,
          averagePaymentPerClass: 20.06,
          totalCompletedClasses: 15,
          totalPayableClasses: 12,
          totalNonPayableClasses: 3,
        }}
      />
    )

    expect(screen.getByText('Pago Total')).toBeInTheDocument()
    expect(screen.getByText('$240.75')).toBeInTheDocument()
  expect(screen.getByText('12 clases pagables')).toBeInTheDocument()
    expect(screen.getByText('Clases Pagables')).toBeInTheDocument()
    expect(screen.getByText('de 15 completadas')).toBeInTheDocument()
    expect(screen.getByText('Clases No Pagables')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('excluidas del cálculo actual')).toBeInTheDocument()
  })
})