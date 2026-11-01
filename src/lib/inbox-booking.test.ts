import {beforeEach,describe,it,expect,vi} from 'vitest'
import {reserveInboxClass} from './inbox-booking'
import type {PrismaClient} from '@prisma/client'
const now=new Date('2026-11-01T12:00:00Z')
const request={requestId:'11111111-1111-4111-8111-111111111111',studentId:'fixture-student',teacherId:'fixture-teacher',enrollmentId:'fixture-enrollment',startUtc:'2026-11-03T15:00:00Z',identityReference:'operator-checked-fixture-identity',confirmed:true}
function setup(){
 const tx={
  $queryRaw:vi.fn().mockResolvedValue([]),$executeRaw:vi.fn().mockResolvedValue(1),
  enrollment:{findUnique:vi.fn().mockResolvedValue({id:'fixture-enrollment',studentId:'fixture-student',teacherId:'fixture-teacher',courseId:'fixture-course',status:'ACTIVE',classesTotal:8,student:{status:'ACTIVE',emailVerified:now},academicPeriod:{startDate:new Date('2026-11-01'),endDate:new Date('2026-11-30')}})},
  user:{findUnique:vi.fn().mockResolvedValue({status:'ACTIVE',roles:['TEACHER'],timezone:'America/Lima',teachableCourses:[{courseId:'fixture-course'}],teacherAvailability:[{day:'tuesday',startTime:'14:00',endTime:'19:00'}],teacherBlockedDays:[]})},
  calendarSettings:{findFirst:vi.fn().mockResolvedValue({bookingAdvanceNotice:24,maxBookingsPerStudent:3})},
  classBooking:{findUnique:vi.fn().mockResolvedValue({status:'CONFIRMED'}),count:vi.fn().mockResolvedValue(0),findMany:vi.fn().mockResolvedValue([]),create:vi.fn().mockResolvedValue({id:'fixture-booking'})},
  classSchedule:{findMany:vi.fn().mockResolvedValue([])}
 }
 const db={$transaction:vi.fn(async f=>f(tx))};return {tx,db:db as unknown as PrismaClient}
}
describe('inbox atomic booking',()=>{
 let ctx:ReturnType<typeof setup>
 beforeEach(()=>ctx=setup())
 const reserve=(ctx:ReturnType<typeof setup>,input:unknown=request)=>reserveInboxClass(ctx.db,input,'fixture-operator',true,now)
 it('disabled by default, without touching database',async()=>{
  await expect(reserveInboxClass(ctx.db,request,'fixture-operator')).rejects.toThrow('booking_disabled');expect(ctx.db.$transaction).not.toHaveBeenCalled()
 })
 it('production hard stop remains even when explicitly enabled',async()=>{
  vi.stubEnv('NODE_ENV','production')
  try{await expect(reserve(ctx)).rejects.toThrow('booking_disabled');expect(ctx.db.$transaction).not.toHaveBeenCalled()}finally{vi.unstubAllEnvs()}
 })
 it('requires complete operator-confirmed input',async()=>{
  await expect(reserve(ctx,{...request,confirmed:false})).rejects.toThrow();expect(ctx.db.$transaction).not.toHaveBeenCalled()
 })
 it('checks fresh sources and creates booking and idempotency journal in one serializable transaction',async()=>{
  expect(await reserve(ctx)).toEqual({bookingId:'fixture-booking',duplicate:false})
  expect(ctx.db.$transaction).toHaveBeenCalledWith(expect.any(Function),{isolationLevel:'Serializable',timeout:15000})
  expect(ctx.tx.classBooking.create).toHaveBeenCalledWith({data:expect.objectContaining({day:'2026-11-03',timeSlot:'15:00-16:00',status:'CONFIRMED'})});expect(ctx.tx.$executeRaw).toHaveBeenCalledTimes(1)
 })
 it('never writes on teacher/student partial overlap, including previous UTC day',async()=>{
  ctx.tx.classBooking.findMany.mockResolvedValue([{day:'2026-11-03',timeSlot:'15:30-16:30'}]);await expect(reserve(ctx)).rejects.toThrow('booking_conflict');expect(ctx.tx.classBooking.create).not.toHaveBeenCalled()
 })
 it('blocks recurring occupancy and blocked days',async()=>{
  ctx.tx.classSchedule.findMany.mockResolvedValue([{dayOfWeek:2,startTime:'15:00',endTime:'16:00'}]);await expect(reserve(ctx)).rejects.toThrow('recurring_conflict')
  ctx.tx.classSchedule.findMany.mockResolvedValue([]);ctx.tx.user.findUnique.mockResolvedValue({...await ctx.tx.user.findUnique(),teacherBlockedDays:[{date:'2026-11-03'}]});await expect(reserve(ctx)).rejects.toThrow('blocked_day')
 })
 it('preserves a completed trial interval while regular bookings retain the 60-minute block',async()=>{
  ctx.tx.classBooking.findMany.mockResolvedValue([{day:'2026-11-03',timeSlot:'14:40-15:00',isTrial:true}])
  await expect(reserve(ctx)).resolves.toEqual({bookingId:'fixture-booking',duplicate:false})
  ctx.tx.classBooking.findMany.mockResolvedValue([{day:'2026-11-03',timeSlot:'14:40-15:00',isTrial:false}])
  await expect(reserve(ctx)).rejects.toThrow('booking_conflict')
 })
 it('blocks inactive/foreign enrollment and exhausted balance',async()=>{
  const enrollment=await ctx.tx.enrollment.findUnique();ctx.tx.enrollment.findUnique.mockResolvedValue({...enrollment,studentId:'foreign'});await expect(reserve(ctx)).rejects.toThrow('identity_or_enrollment_review')
  ctx.tx.enrollment.findUnique.mockResolvedValue(enrollment);ctx.tx.classBooking.count.mockResolvedValue(8);await expect(reserve(ctx)).rejects.toThrow('booking_limit')
 })
 it('does not retry after tool/transaction uncertainty',async()=>{
  ctx.tx.classBooking.create.mockRejectedValue(new Error('lost connection'));await expect(reserve(ctx)).rejects.toThrow('lost connection');expect(ctx.db.$transaction).toHaveBeenCalledTimes(1);expect(ctx.tx.$executeRaw).not.toHaveBeenCalled()
 })
 it('replays committed result without a second calendar read or insert; cancelled result requires review',async()=>{
  await reserve(ctx)
  const fingerprint=ctx.tx.$executeRaw.mock.calls[0][2]
  ctx.tx.classBooking.create.mockClear();ctx.tx.enrollment.findUnique.mockClear()
  ctx.tx.$queryRaw.mockImplementation(async(strings:TemplateStringsArray)=>strings.join('').includes('SELECT fingerprint')?[{fingerprint,booking_id:'fixture-booking'}]:[])
  expect(await reserve(ctx)).toEqual({bookingId:'fixture-booking',duplicate:true});expect(ctx.tx.classBooking.create).not.toHaveBeenCalled();expect(ctx.tx.enrollment.findUnique).not.toHaveBeenCalled()
  ctx.tx.classBooking.findUnique.mockResolvedValue({status:'CANCELLED'});await expect(reserve(ctx)).rejects.toThrow('booking_changed_review')
 })
 it('same key with changed parameters is rejected before any calendar access',async()=>{
  ctx.tx.$queryRaw.mockImplementation(async(strings:TemplateStringsArray)=>strings.join('').includes('SELECT fingerprint')?[{fingerprint:'other',booking_id:'existing'}]:[])
  await expect(reserve(ctx)).rejects.toThrow('idempotency_mismatch');expect(ctx.tx.enrollment.findUnique).not.toHaveBeenCalled()
 })
 it('requires review after a journaled booking was deleted, without lookup or recreation',async()=>{
  await reserve(ctx)
  const fingerprint=ctx.tx.$executeRaw.mock.calls[0][2]
  vi.clearAllMocks()
  ctx.tx.$queryRaw.mockImplementation(async(strings:TemplateStringsArray)=>strings.join('').includes('SELECT fingerprint')?[{fingerprint,booking_id:null}]:[])
  await expect(reserve(ctx)).rejects.toThrow('booking_changed_review')
  expect(ctx.tx.classBooking.findUnique).not.toHaveBeenCalled()
  expect(ctx.tx.classBooking.create).not.toHaveBeenCalled()
  expect(ctx.tx.enrollment.findUnique).not.toHaveBeenCalled()
 })
})
