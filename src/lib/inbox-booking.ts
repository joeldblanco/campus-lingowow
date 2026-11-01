import {createHash,randomUUID} from 'node:crypto'
import type {PrismaClient,Prisma} from '@prisma/client'
import {z} from 'zod'

export const inboxBookingInput=z.object({
 requestId:z.string().uuid(),studentId:z.string().min(1).max(200),enrollmentId:z.string().min(1).max(200),teacherId:z.string().min(1).max(200),
 startUtc:z.string().datetime({offset:true}),identityReference:z.string().min(8).max(500),confirmed:z.literal(true)
}).strict()
export type InboxBookingInput=z.infer<typeof inboxBookingInput>
export class BookingRejected extends Error {}
const reject=(reason:string):never=>{throw new BookingRejected(reason)}
const minutes=(value:string)=>{if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))return reject('invalid_calendar');return Number(value.slice(0,2))*60+Number(value.slice(3))}
const span=(day:string,slot:string,trial=false):[number,number]=>{
 const parts=slot.split('-');if(parts.length!==2)return reject('invalid_calendar')
 const start=Date.parse(day+'T00:00:00Z')+minutes(parts[0])*60000;let end=Date.parse(day+'T00:00:00Z')+minutes(parts[1])*60000
 if(end<=start)end+=86400000
 if(!Number.isFinite(start))return reject('invalid_calendar')
 return [start,Math.max(end,start+(trial?20:60)*60000)]
}
const overlaps=(a:number,b:number,c:number,d:number)=>a<d&&c<b

/** One transaction; no email, video meeting, payment or notification side effects. */
export async function reserveInboxClass(db:PrismaClient,raw:unknown,operatorId:string,enabled=false,now=new Date()){
 if(!enabled||process.env.NODE_ENV==='production')reject('booking_disabled')
 const input=inboxBookingInput.parse(raw)
 const start=new Date(input.startUtc),at=start.getTime(),end=at+3600000
 if(start.getUTCSeconds()||start.getUTCMilliseconds()||!Number.isFinite(at))reject('invalid_start')
 // Academic duration may be 40 minutes; the approved scheduling block is always 60.
 const day=start.toISOString().slice(0,10),slot=start.toISOString().slice(11,16)+'-'+new Date(end).toISOString().slice(11,16)
 if(day<'2026-11-01')reject('before_rollout_boundary')
 const canonical={...input,startUtc:start.toISOString()}
 const fingerprint=createHash('sha256').update(JSON.stringify([operatorId,canonical])).digest('hex')
 return db.$transaction(async(tx:Prisma.TransactionClient)=>{
  for(const key of ['request:'+input.requestId,'student:'+input.studentId,'teacher:'+input.teacherId].sort())await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key},0))::text`
  const previous=await tx.$queryRaw<Array<{fingerprint:string;booking_id:string|null}>>`SELECT fingerprint,booking_id FROM inbox_booking_requests WHERE request_id=${input.requestId}`
  if(previous.length){
   if(previous[0].fingerprint!==fingerprint)reject('idempotency_mismatch')
   if(!previous[0].booking_id)return reject('booking_changed_review')
   const existing=await tx.classBooking.findUnique({where:{id:previous[0].booking_id},select:{status:true}})
   if(!existing||existing.status!=='CONFIRMED')reject('booking_changed_review')
   return {bookingId:previous[0].booking_id,duplicate:true}
  }
  const enrollment=await tx.enrollment.findUnique({where:{id:input.enrollmentId},include:{academicPeriod:true,student:true}})
  if(!enrollment||enrollment.studentId!==input.studentId||enrollment.status!=='ACTIVE'||enrollment.student.status!=='ACTIVE'||!enrollment.student.emailVerified||enrollment.teacherId!==input.teacherId)reject('identity_or_enrollment_review')
  if(at<enrollment!.academicPeriod.startDate.getTime()||end>enrollment!.academicPeriod.endDate.getTime()+86400000)reject('outside_academic_period')
  const teacher=await tx.user.findUnique({where:{id:input.teacherId},include:{teachableCourses:true,teacherAvailability:true,teacherBlockedDays:true}})
  if(!teacher||teacher.status!=='ACTIVE'||!teacher.roles.includes('TEACHER')||!teacher.teachableCourses.some(c=>c.courseId===enrollment!.courseId))reject('teacher_review')
  const settings=await tx.calendarSettings.findFirst({where:{isGlobal:true}})
  if(at<now.getTime()+(settings?.bookingAdvanceNotice??24)*3600000||at>now.getTime()+7*86400000)reject('advance_notice')
  const count=await tx.classBooking.count({where:{studentId:input.studentId,status:'CONFIRMED'}})
  const consumed=await tx.classBooking.count({where:{enrollmentId:input.enrollmentId,status:{not:'CANCELLED'}}})
  if(count>=(settings?.maxBookingsPerStudent??3)||consumed>=enrollment!.classesTotal)reject('booking_limit')
  const teacherZone=teacher!.timezone||'UTC'
  let blockedDates:string[]
  try{blockedDates=[day,new Date(end-1).toISOString().slice(0,10),...([at,end-1].map(t=>new Intl.DateTimeFormat('en-CA',{timeZone:teacherZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t))))]}catch{reject('invalid_calendar')}
  if(teacher!.teacherBlockedDays.some(b=>blockedDates!.includes(b.date)))reject('blocked_day')
  const days=['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  let available=false
  for(const offset of [-1,0]){
   const d=new Date(Date.parse(day+'T00:00:00Z')+offset*86400000),date=d.toISOString().slice(0,10)
   for(const row of teacher!.teacherAvailability){
    if(![date,days[d.getUTCDay()]].includes(row.day.toLowerCase()))continue
    const begin=d.getTime()+minutes(row.startTime)*60000;let finish=d.getTime()+minutes(row.endTime)*60000
    if(finish<=begin)finish+=86400000
    available ||= begin<=at&&end<=finish
   }
  }
  if(!available)reject('outside_published_hours')
  const first=new Date(at-86400000).toISOString().slice(0,10),last=new Date(end+86400000).toISOString().slice(0,10)
  const bookings=await tx.classBooking.findMany({where:{day:{gte:first,lte:last},status:{not:'CANCELLED'},OR:[{teacherId:input.teacherId},{studentId:input.studentId}]},take:501})
  if(bookings.length>=501)reject('incomplete_calendar')
  if(bookings.some(b=>{const [a,z]=span(b.day,b.timeSlot,b.isTrial);return overlaps(at,end,a,z)}))reject('booking_conflict')
  const recurring=await tx.classSchedule.findMany({where:{enrollment:{status:'ACTIVE'},OR:[{teacherId:input.teacherId},{enrollment:{studentId:input.studentId}}]},take:501})
  if(recurring.length>=501)reject('incomplete_calendar')
  for(const row of recurring)for(const offset of [-1,0]){
   const d=new Date(Date.parse(day+'T00:00:00Z')+offset*86400000)
   if(d.getUTCDay()===row.dayOfWeek){const [a,z]=span(d.toISOString().slice(0,10),row.startTime+'-'+row.endTime);if(overlaps(at,end,a,z))reject('recurring_conflict')}
  }
  const booking=await tx.classBooking.create({data:{id:randomUUID(),studentId:input.studentId,teacherId:input.teacherId,enrollmentId:input.enrollmentId,day,timeSlot:slot,status:'CONFIRMED'}})
  await tx.$executeRaw`INSERT INTO inbox_booking_requests(request_id,fingerprint,booking_id,operator_id,identity_reference) VALUES(${input.requestId},${fingerprint},${booking.id},${operatorId},${input.identityReference})`
  return {bookingId:booking.id,duplicate:false}
 },{isolationLevel:'Serializable',timeout:15000})
}
