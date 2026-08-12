import { convertTimeSlotToUTC, convertRecurringScheduleToUTC } from './src/lib/utils/date'
const TZ = 'America/Caracas'
console.log('Mon 19-20', convertTimeSlotToUTC('2026-08-10', '19:00-20:00', TZ))
console.log('Thu 20-21', convertTimeSlotToUTC('2026-08-13', '20:00-21:00', TZ))
console.log('Fri 19-20', convertTimeSlotToUTC('2026-08-14', '19:00-20:00', TZ))
console.log('recurring Mon', convertRecurringScheduleToUTC(1, '19:00', '20:00', TZ))
console.log('recurring Thu', convertRecurringScheduleToUTC(4, '20:00', '21:00', TZ))
console.log('recurring Fri', convertRecurringScheduleToUTC(5, '19:00', '20:00', TZ))
