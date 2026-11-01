import {beforeEach,expect,it,vi} from 'vitest'
import {render,screen} from '@testing-library/react'
import type {ReactNode} from 'react'
const mocks=vi.hoisted(()=>({auth:vi.fn(),invoice:vi.fn()}))
vi.mock('@/auth',()=>({auth:mocks.auth}))
vi.mock('@/lib/db',()=>({db:{invoice:{findFirst:mocks.invoice}}}))
vi.mock('next/navigation',()=>({redirect:(path:string)=>{throw Error('redirect:'+path)}}))
vi.mock('next/link',()=>({default:({href,children}:{href:string;children:ReactNode})=><a href={href}>{children}</a>}))
vi.mock('./clear-cart-client',()=>({ClearCartOnMount:()=>null}))
import ConfirmationPage from './page'

const invoice=(notes:string|null=null,status='PAID')=>({id:'fixture-invoice',invoiceNumber:'FIXTURE-1',status,notes,total:100,paymentMethod:'niubiz',createdAt:new Date('2026-11-01T12:00:00Z'),items:[],user:{id:'fixture-owner',email:'owner@example.invalid',password:'fixture-hash'}})
const page=(params:Record<string,string>={})=>ConfirmationPage({searchParams:Promise.resolve({orderNumber:'FIXTURE-1',...params})})
beforeEach(()=>{vi.clearAllMocks();mocks.auth.mockResolvedValue({user:{id:'fixture-owner'}});mocks.invoice.mockResolvedValue(invoice())})

it('shows a pending reservation from the paid invoice without claiming classes are ready',async()=>{
 mocks.invoice.mockResolvedValue(invoice('Niubiz Order ID: fixture; reservation_pending_review:schedule_conflict'))
 render(await page())
 expect(screen.getByRole('status')).toHaveTextContent('Reserva pendiente de revisión')
 expect(screen.getByRole('status')).toHaveTextContent('Tu pago está confirmado')
 expect(screen.queryByText('Ir a mis clases')).not.toBeInTheDocument()
})
it('does not trust a forged pending-review URL parameter',async()=>{
 render(await page({reservation_pending_review:'true'}))
 expect(screen.queryByRole('status')).not.toBeInTheDocument()
 expect(screen.getByText('Ir a mis clases')).toBeInTheDocument()
})
it('never renders payment success for a non-paid invoice',async()=>{
 mocks.invoice.mockResolvedValue(invoice('reservation_pending_review:scheduling_failed','PENDING'))
 await expect(page()).rejects.toThrow('redirect:/shop')
})
it('does not replace an explicitly requested missing order with another paid invoice',async()=>{
 mocks.invoice.mockResolvedValueOnce(null).mockResolvedValue(invoice())
 await expect(page()).rejects.toThrow('redirect:/shop')
 expect(mocks.invoice).toHaveBeenCalledTimes(1)
})
it('keeps guest activation available without promising a reserved class',async()=>{
 mocks.auth.mockResolvedValue(null)
 mocks.invoice.mockResolvedValue({...invoice('reservation_pending_review:scheduling_failed'),user:{id:'fixture-owner',email:'owner@example.invalid',password:null}})
 render(await page())
 expect(screen.getByText('Activar mi cuenta')).toBeInTheDocument()
 expect(screen.queryByText('Activa tu cuenta para entrar a tus clases')).not.toBeInTheDocument()
 expect(screen.getByRole('status')).toHaveTextContent('Reserva pendiente de revisión')
})
