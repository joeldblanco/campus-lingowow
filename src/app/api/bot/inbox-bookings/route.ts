import {NextRequest,NextResponse} from 'next/server'
import {authenticateRequest} from '@/lib/api-auth'
import {db} from '@/lib/db'
import {reserveInboxClass,BookingRejected} from '@/lib/inbox-booking'
import {ZodError} from 'zod'

export async function POST(request:NextRequest){
 if(process.env.NODE_ENV==='production'||process.env.LINGOWOW_INBOX_BOOKING_ENABLED!=='1')return NextResponse.json({error:'booking_disabled'},{status:503})
 if(!request.headers.get('authorization')?.startsWith('Bearer ')&&request.headers.get('origin')!==request.nextUrl.origin)return NextResponse.json({error:'origin_required'},{status:403})
 const actor=await authenticateRequest(request,['inbox:bookings:write'])
 if(!actor.success||!actor.userId)return NextResponse.json({error:'unauthorized'},{status:401})
 const user=await db.user.findUnique({where:{id:actor.userId},select:{roles:true,status:true}})
 if(user?.status!=='ACTIVE'||!user.roles.includes('ADMIN'))return NextResponse.json({error:'operator_required'},{status:403})
 try{
  const raw=await request.text();if(Buffer.byteLength(raw)>8192)return NextResponse.json({error:'request_too_large'},{status:413})
  const result=await reserveInboxClass(db,JSON.parse(raw),actor.userId,true)
  return NextResponse.json({...result,sent:false},{status:result.duplicate?200:201})
 }catch(error){
  if(error instanceof ZodError||error instanceof SyntaxError)return NextResponse.json({error:'invalid_request'},{status:400})
  if(error instanceof BookingRejected)return NextResponse.json({error:error.message},{status:409})
  // Serialization/constraint/transport uncertainty is never retried with a new request ID.
  return NextResponse.json({error:'booking_unconfirmed_review_same_request_id'},{status:503})
 }
}
